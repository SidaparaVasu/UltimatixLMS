"""
Resolves whether gamification is active for the current user / company.
"""

from apps.core_system.services.feature_flag_service import FeatureFlagService
from apps.gamification.constants import FeatureKeys
from apps.gamification.repositories import CompanyGamificationConfigRepository


class GamificationStatusService:
    def __init__(
        self,
        config_repository: CompanyGamificationConfigRepository | None = None,
        feature_flag_service: FeatureFlagService | None = None,
    ):
        self._config_repository = config_repository or CompanyGamificationConfigRepository()
        self._feature_flags = feature_flag_service or FeatureFlagService()

    def is_globally_enabled(self) -> bool:
        return self._feature_flags.is_enabled(FeatureKeys.GAMIFICATION_ENABLED)

    def is_enabled_for_company(self, company_id: int | None) -> bool:
        if not self.is_globally_enabled():
            return False
        if company_id is None:
            return False
        config = self._config_repository.get_by_company_id(company_id)
        if config is None:
            return False
        return config.is_enabled

    def get_status_payload(self, company_id: int | None = None) -> dict:
        global_on = self.is_globally_enabled()
        company_on = self.is_enabled_for_company(company_id) if global_on else False
        return {
            "module": "gamification",
            "phase": 6,
            "global_feature_enabled": global_on,
            "company_enabled": company_on,
            "active": global_on and company_on,
        }
