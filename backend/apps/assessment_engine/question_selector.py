"""
DynamicQuestionSelector — smart question selection algorithm for standalone assessments.

Algorithm overview
──────────────────
Given an assessment with N skill mappings and a target question count Q:

1. For each skill, fetch the full pool of eligible questions from QuestionBank
   (skill match + skill_level rank >= target level rank, active only).

2. Calculate proportional allocation:
   Each skill gets floor(Q * skill_pool_size / total_pool_size) questions.
   Remainder questions are distributed to skills with the largest fractional parts.

3. For each skill's allocation, prioritise questions the employee has NOT seen
   in any previous attempt on this assessment (unseen-first strategy).
   If unseen questions are exhausted, fill from previously-seen questions
   (minimum overlap — sorted by least-recently-seen to maximise variety).

4. Combine all skill allocations → final list of exactly Q distinct questions.

5. If total available questions across all skills < Q, raise InsufficientQuestionsError
   with a detailed breakdown so the admin can add more questions.
"""

import random
from collections import defaultdict
from dataclasses import dataclass
from typing import List, Dict, Set
from uuid import UUID

from django.db.models import QuerySet


@dataclass
class SkillAllocation:
    skill_id: int
    skill_name: str
    target_level_rank: int
    pool_size: int          # total eligible questions
    allocated: int          # how many to pick
    unseen_ids: List[UUID]  # question UUIDs not seen in prior attempts
    seen_ids: List[UUID]    # question UUIDs seen in prior attempts (oldest first)


class InsufficientQuestionsError(Exception):
    """
    Raised when the question bank does not have enough questions to satisfy
    the assessment's number_of_questions requirement.
    """
    def __init__(self, required: int, available: int, breakdown: list):
        self.required = required
        self.available = available
        self.breakdown = breakdown  # list of dicts with skill-level detail
        super().__init__(
            f"Not enough questions: need {required}, only {available} available. "
            f"Add more questions to the bank."
        )


class DynamicQuestionSelector:
    """
    Selects a randomised, skill-proportional set of questions for a dynamic attempt.
    """

    def select(
        self,
        assessment,
        employee_id: int,
        number_of_questions: int,
    ) -> List:
        """
        Returns a list of QuestionBank instances (length == number_of_questions).

        Parameters
        ----------
        assessment : AssessmentMaster
            The standalone assessment being attempted.
        employee_id : int
            The EmployeeMaster PK of the learner.
        number_of_questions : int
            How many questions to select (from assessment.number_of_questions).
        """
        from .models import AssessmentSkillMapping, AssessmentQuestionMapping, QuestionBank

        skill_mappings = list(
            AssessmentSkillMapping.objects.filter(assessment=assessment)
            .select_related("skill", "skill_level")
        )

        if not skill_mappings:
            raise InsufficientQuestionsError(
                required=number_of_questions,
                available=0,
                breakdown=[{"error": "No skill mappings defined for this assessment."}],
            )

        # ── Step 1: Build per-skill question pools ────────────────────────────

        # Questions seen by this employee in any previous attempt on this assessment
        seen_question_ids: Set[UUID] = set(
            AssessmentQuestionMapping.objects.filter(
                assessment=assessment,
                attempt__employee_id=employee_id,
                attempt__isnull=False,
            ).values_list("question_id", flat=True)
        )

        allocations: List[SkillAllocation] = []
        total_pool = 0

        for sm in skill_mappings:
            eligible_qs = list(
                QuestionBank.objects.filter(
                    skill=sm.skill,
                    skill_level__level_rank__gte=sm.skill_level.level_rank,
                    is_active=True,
                    # Exclude FILE_UPLOAD — not supported in standalone assessments
                    question_type__in=["MCQ", "MSQ", "TRUE_FALSE", "DESCRIPTIVE", "SCENARIO"],
                ).values_list("id", flat=True)
            )

            unseen = [qid for qid in eligible_qs if qid not in seen_question_ids]
            seen   = [qid for qid in eligible_qs if qid in seen_question_ids]

            # Shuffle unseen for randomness; sort seen by "oldest" (we don't have
            # per-question timestamps here, so shuffle them too — minimum overlap
            # is achieved by the unseen-first priority)
            random.shuffle(unseen)
            random.shuffle(seen)

            allocations.append(SkillAllocation(
                skill_id=sm.skill_id,
                skill_name=sm.skill.skill_name,
                target_level_rank=sm.skill_level.level_rank,
                pool_size=len(eligible_qs),
                allocated=0,  # filled in step 2
                unseen_ids=unseen,
                seen_ids=seen,
            ))
            total_pool += len(eligible_qs)

        # ── Step 2: Check feasibility ─────────────────────────────────────────

        if total_pool < number_of_questions:
            breakdown = [
                {
                    "skill": a.skill_name,
                    "target_level_rank": a.target_level_rank,
                    "available": a.pool_size,
                }
                for a in allocations
            ]
            raise InsufficientQuestionsError(
                required=number_of_questions,
                available=total_pool,
                breakdown=breakdown,
            )

        # ── Step 3: Proportional allocation ──────────────────────────────────

        allocations = self._proportional_allocate(allocations, number_of_questions)

        # ── Step 4: Pick questions per skill (unseen-first) ───────────────────

        selected_ids: List[UUID] = []

        for alloc in allocations:
            needed = alloc.allocated
            picked: List[UUID] = []

            # Take from unseen first
            take_unseen = min(needed, len(alloc.unseen_ids))
            picked.extend(alloc.unseen_ids[:take_unseen])
            needed -= take_unseen

            # Fill remainder from seen (minimum overlap)
            if needed > 0:
                picked.extend(alloc.seen_ids[:needed])

            selected_ids.extend(picked)

        # ── Step 5: Fetch and return QuestionBank instances ───────────────────

        # Preserve order via a dict lookup
        qs_map = {
            q.id: q
            for q in QuestionBank.objects.filter(id__in=selected_ids)
            .select_related("skill", "skill_level")
            .prefetch_related("options")
        }
        return [qs_map[qid] for qid in selected_ids if qid in qs_map]

    # ── Internal helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _proportional_allocate(
        allocations: List[SkillAllocation],
        total: int,
    ) -> List[SkillAllocation]:
        """
        Distributes `total` questions across skills proportionally to their pool size.
        Uses the largest-remainder method to avoid rounding drift.
        """
        pool_sizes = [a.pool_size for a in allocations]
        grand_total = sum(pool_sizes)

        # Floor allocation
        exact = [total * ps / grand_total for ps in pool_sizes]
        floors = [int(e) for e in exact]
        remainders = [(exact[i] - floors[i], i) for i in range(len(floors))]

        # Distribute remaining slots to skills with largest fractional parts
        remaining = total - sum(floors)
        remainders.sort(reverse=True)
        for _, idx in remainders[:remaining]:
            floors[idx] += 1

        # Cap each allocation at the actual pool size (can't pick more than available)
        for i, alloc in enumerate(allocations):
            alloc.allocated = min(floors[i], alloc.pool_size)

        # If capping caused a shortfall, redistribute to skills with headroom
        allocated_total = sum(a.allocated for a in allocations)
        shortfall = total - allocated_total
        if shortfall > 0:
            for alloc in allocations:
                if shortfall == 0:
                    break
                headroom = alloc.pool_size - alloc.allocated
                give = min(headroom, shortfall)
                alloc.allocated += give
                shortfall -= give

        return allocations
