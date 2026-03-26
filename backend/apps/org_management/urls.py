from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyMasterViewSet,
    BusinessUnitMasterViewSet,
    DepartmentMasterViewSet,
    LocationMasterViewSet,
    JobRoleMasterViewSet,
    EmployeeMasterViewSet,
    EmployeeReportingManagerViewSet
)

router = DefaultRouter()
router.register("companies", CompanyMasterViewSet, basename="companies")
router.register("business-units", BusinessUnitMasterViewSet, basename="business-units")
router.register("departments", DepartmentMasterViewSet, basename="departments")
router.register("locations", LocationMasterViewSet, basename="locations")
router.register("job-roles", JobRoleMasterViewSet, basename="job-roles")
router.register("employees", EmployeeMasterViewSet, basename="employees")
router.register("reporting-mappings", EmployeeReportingManagerViewSet, basename="reporting-mappings")

urlpatterns = [
    path("", include(router.urls)),
]
