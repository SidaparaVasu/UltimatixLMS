"""
QuestionBulkUploader — validates and imports questions from CSV/Excel.

Rules:
- Validates ALL rows before importing anything.
- Returns a full error report if any row fails.
- Imports nothing until all rows are valid.
- Supported file types: .csv, .xlsx, .xls
"""

import csv
import io
from typing import List, Dict, Any


REQUIRED_COLUMNS = {
    'question_type', 'question_text', 'skill_code', 'skill_level_name',
}

VALID_QUESTION_TYPES = {'MCQ', 'MSQ', 'TRUE_FALSE', 'DESCRIPTIVE', 'SCENARIO'}

VALID_DIFFICULTY = {1, 2, 3, 4, 5}


class QuestionBulkUploader:

    def process(self, file) -> Dict[str, Any]:
        """
        Main entry point. Returns:
          { 'errors': [...], 'imported': int }
        If errors is non-empty, imported is 0.
        """
        filename = getattr(file, 'name', '').lower()

        if filename.endswith('.csv'):
            rows = self._parse_csv(file)
        elif filename.endswith(('.xlsx', '.xls')):
            rows = self._parse_excel(file)
        else:
            return {
                'errors': [{'row': 0, 'message': 'Unsupported file type. Upload a .csv or .xlsx file.'}],
                'imported': 0,
            }

        if not rows:
            return {
                'errors': [{'row': 0, 'message': 'File is empty or has no data rows.'}],
                'imported': 0,
            }

        errors = self._validate_all(rows)
        if errors:
            return {'errors': errors, 'imported': 0}

        count = self._import_all(rows)
        return {'errors': [], 'imported': count}

    # ── Parsing ───────────────────────────────────────────────────────────────

    def _parse_csv(self, file) -> List[Dict]:
        content = file.read()
        try:
            text = content.decode('utf-8-sig')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
        reader = csv.DictReader(io.StringIO(text))
        return [row for row in reader]

    def _parse_excel(self, file) -> List[Dict]:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            if not rows:
                return []
            headers = [str(h).strip() if h else '' for h in rows[0]]
            result = []
            for row in rows[1:]:
                result.append({headers[i]: (str(v).strip() if v is not None else '') for i, v in enumerate(row)})
            return result
        except ImportError:
            return [{'__error__': 'openpyxl is required for Excel uploads. Use CSV instead.'}]

    # ── Validation ────────────────────────────────────────────────────────────

    def _validate_all(self, rows: List[Dict]) -> List[Dict]:
        from apps.skill_management.models import SkillMaster, SkillLevelMaster

        # Cache skill/level lookups to avoid N+1
        skill_cache = {s.skill_code: s for s in SkillMaster.objects.filter(is_active=True)}
        level_cache = {l.level_name.lower(): l for l in SkillLevelMaster.objects.filter(is_active=True)}

        errors = []

        for i, row in enumerate(rows, start=2):  # row 1 = header
            row_errors = []

            if '__error__' in row:
                errors.append({'row': i, 'message': row['__error__']})
                continue

            # Required fields
            for col in REQUIRED_COLUMNS:
                if not row.get(col, '').strip():
                    row_errors.append(f"'{col}' is required.")

            if row_errors:
                errors.append({'row': i, 'message': '; '.join(row_errors)})
                continue

            q_type = row.get('question_type', '').strip().upper()
            if q_type not in VALID_QUESTION_TYPES:
                row_errors.append(
                    f"Invalid question_type '{q_type}'. Must be one of: {', '.join(VALID_QUESTION_TYPES)}."
                )

            diff = row.get('difficulty_complexity', '1').strip()
            try:
                diff_int = int(diff)
                if diff_int not in VALID_DIFFICULTY:
                    row_errors.append("difficulty_complexity must be 1–5.")
            except ValueError:
                row_errors.append("difficulty_complexity must be a number 1–5.")

            skill_code = row.get('skill_code', '').strip().upper()
            if skill_code not in skill_cache:
                row_errors.append(f"Skill code '{skill_code}' not found in the system.")

            level_name = row.get('skill_level_name', '').strip().lower()
            if level_name not in level_cache:
                row_errors.append(
                    f"Skill level '{row.get('skill_level_name', '')}' not found. "
                    f"Available: {', '.join(l.level_name for l in level_cache.values())}."
                )

            # MCQ/MSQ/TRUE_FALSE must have at least one correct option
            if q_type in ('MCQ', 'MSQ', 'TRUE_FALSE') and not row_errors:
                has_correct = any(
                    row.get(f'option_{n}_correct', '').strip().upper() == 'TRUE'
                    for n in range(1, 5)
                )
                if not has_correct:
                    row_errors.append("At least one option must be marked TRUE as the correct answer.")

                has_option = any(row.get(f'option_{n}', '').strip() for n in range(1, 5))
                if not has_option:
                    row_errors.append("MCQ/MSQ/TRUE_FALSE questions must have at least one option.")

            if row_errors:
                errors.append({'row': i, 'message': '; '.join(row_errors)})

        return errors

    # ── Import ────────────────────────────────────────────────────────────────

    def _import_all(self, rows: List[Dict]) -> int:
        from apps.skill_management.models import SkillMaster, SkillLevelMaster
        from .models import QuestionBank, QuestionOption
        from django.db import transaction

        skill_cache = {s.skill_code: s for s in SkillMaster.objects.filter(is_active=True)}
        level_cache = {l.level_name.lower(): l for l in SkillLevelMaster.objects.filter(is_active=True)}

        count = 0
        with transaction.atomic():
            for row in rows:
                q_type = row.get('question_type', '').strip().upper()
                skill  = skill_cache.get(row.get('skill_code', '').strip().upper())
                level  = level_cache.get(row.get('skill_level_name', '').strip().lower())
                diff   = int(row.get('difficulty_complexity', '1').strip() or '1')

                question = QuestionBank.objects.create(
                    question_text=row.get('question_text', '').strip(),
                    question_type=q_type,
                    scenario_text=row.get('scenario_text', '').strip(),
                    explanation_text=row.get('explanation_text', '').strip(),
                    difficulty_complexity=diff,
                    skill=skill,
                    skill_level=level,
                    is_active=True,
                )

                # Create options for MCQ/MSQ/TRUE_FALSE
                if q_type in ('MCQ', 'MSQ', 'TRUE_FALSE'):
                    order = 1
                    for n in range(1, 5):
                        opt_text = row.get(f'option_{n}', '').strip()
                        if not opt_text:
                            continue
                        is_correct = row.get(f'option_{n}_correct', '').strip().upper() == 'TRUE'
                        QuestionOption.objects.create(
                            question=question,
                            option_text=opt_text,
                            is_correct=is_correct,
                            display_order=order,
                        )
                        order += 1

                count += 1

        return count
