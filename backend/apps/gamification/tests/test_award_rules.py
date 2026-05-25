from django.core.management import call_command
from django.test import TestCase

from apps.gamification.constants import AwardRuleCode
from apps.gamification.models import AwardRule
from apps.gamification.repositories import AwardRuleRepository


class AwardRuleFixtureTest(TestCase):
    def test_fixture_loads_global_rules(self):
        call_command("loaddata", "initial_award_rules", verbosity=0)
        self.assertEqual(AwardRule.objects.count(), 5)
        rule = AwardRuleRepository().get_active_by_code(AwardRuleCode.COURSE_COMPLETED)
        self.assertIsNotNone(rule)
        self.assertEqual(rule.base_points, 100)
        self.assertIsNone(rule.company_id)
