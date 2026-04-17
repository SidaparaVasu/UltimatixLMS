import random
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from common.services.base import BaseService
from .repositories import (
    AssessmentRepository, AttemptRepository, 
    QuestionRepository, ResultRepository
)
from .models import AssessmentAttempt, AssessmentQuestionMapping


class AssessmentBuildService(BaseService):
    """
    Handles Studio-level operations for building quizzes.
    """
    repository_class = AssessmentRepository

    @transaction.atomic
    def bulk_sync_questions(self, assessment_id, question_data_list):
        """
        Syncs the curriculum of an assessment. 
        Accepts a list of question IDs and weights.
        """
        # Remove old mappings
        AssessmentQuestionMapping.objects.filter(assessment_id=assessment_id).delete()
        
        mappings = []
        for i, data in enumerate(question_data_list):
            mappings.append(AssessmentQuestionMapping(
                assessment_id=assessment_id,
                question_id=data['question_id'],
                weight_points=data.get('weight', 1.00),
                display_order=i + 1
            ))
        
        return AssessmentQuestionMapping.objects.bulk_create(mappings)


class AttemptService(BaseService):
    """
    Handles Learner-level operations for taking exams.
    """
    repository_class = AttemptRepository

    def start_attempt(self, employee_id, assessment_id):
        """
        Initializes a new attempt for a student.
        Validation: Retake limits, Active attempts.
        """
        assessment = AssessmentRepository().get_by_id(assessment_id)
        if not assessment:
            raise ValueError("Assessment not found.")

        # 1. Check for active attempt
        active = self.repository.get_active_attempt(employee_id, assessment_id)
        if active:
            return active

        # 2. Check retake limit
        history_count = self.repository.filter(
            employee_id=employee_id, 
            assessment_id=assessment_id
        ).count()
        
        if history_count >= assessment.retake_limit:
            raise ValueError(f"Retake limit reached. Maximum {assessment.retake_limit} attempts allowed.")

        # 3. Create attempt
        expires_at = timezone.now() + timedelta(minutes=assessment.duration_minutes)
        attempt = self.repository.create(**{
            "employee_id": employee_id,
            "assessment_id": assessment_id,
            "status": "IN_PROGRESS",
            "expires_at": expires_at
        })
        
        return attempt

    def get_randomized_questions(self, attempt_id):
        """
        Returns question mappings for an attempt.
        Applies randomization if assessment is configured for it.
        """
        attempt = self.repository.get_by_id(attempt_id)
        assessment = attempt.assessment
        
        mappings = list(assessment.question_mappings.all().select_related('question'))
        
        if assessment.is_randomized:
            random.shuffle(mappings)
            
        return mappings


class GradingService(BaseService):
    """
    Core Evaluation Engine for Assessments.
    """
    repository_class = ResultRepository

    @transaction.atomic
    def grade_attempt(self, attempt_id, graded_by_employee=None):
        """
        Orchestrates the entire scoring process for an attempt.
        """
        attempt = AttemptRepository().get_by_id(attempt_id)
        if not attempt:
            raise ValueError("Attempt not found.")
            
        if attempt.status == "COMPLETED":
            return attempt.result

        assessment = attempt.assessment
        mappings = {m.question_id: m for m in assessment.question_mappings.all()}
        answers = attempt.answers.all().select_related('question')
        
        total_possible_points = sum(m.weight_points for m in mappings.values())
        earned_points = 0
        needs_manual_review = False

        for answer in answers:
            mapping = mappings.get(answer.question_id)
            if not mapping:
                continue
                
            q_type = answer.question.question_type
            
            # 1. Handle Auto-gradable types
            if q_type in ["MCQ", "MSQ", "TRUE_FALSE"]:
                q_score = self.calculate_objective_score(answer, mapping, assessment)
                answer.earned_points = q_score
                answer.is_auto_graded = True
                answer.save()
                earned_points += q_score
            else:
                # Descriptive / File Upload
                needs_manual_review = True
                answer.is_auto_graded = False
                answer.save()

        # 2. Finalize Result
        score_percentage = (earned_points / total_possible_points * 100) if total_possible_points > 0 else 0
        status = "PENDING" if needs_manual_review else ("PASS" if score_percentage >= assessment.passing_percentage else "FAIL")
        grading_type = "PENDING" if needs_manual_review else "AUTO_GRADED"

        result = self.repository.create(**{
            "attempt": attempt,
            "total_score": earned_points,
            "score_percentage": score_percentage,
            "status": status,
            "grading_type": grading_type,
            "graded_at": timezone.now() if not needs_manual_review else None
        })

        # 3. Mark attempt as completed
        attempt.status = "COMPLETED"
        attempt.submitted_at = timezone.now()
        attempt.save()

        return result

    def calculate_objective_score(self, answer, mapping, assessment):
        """
        Logic for MCQ, MSQ, and True/False.
        Supports negative marking.
        """
        weight = mapping.weight_points
        negative_perc = assessment.negative_marking_percentage
        
        # Simple MCQ / T-F logic
        if answer.question.question_type in ["MCQ", "TRUE_FALSE"]:
            if answer.selected_option and answer.selected_option.is_correct:
                return weight
            else:
                # Apply negative marking
                return -(weight * (negative_perc / 100))

        # MSQ Logic (Multiple Select)
        # Note: In current simple schema, UserAnswer only holds 1 option. 
        # TODO: Refactor UserAnswer to support Multiple Selections for MSQ specifically.
        # For now, treating same as MCQ.
        if answer.selected_option and answer.selected_option.is_correct:
            return weight
        
        return -(weight * (negative_perc / 100))
