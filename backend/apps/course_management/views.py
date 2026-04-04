from rest_framework import viewsets, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from common.response import success_response, created_response, error_response
from apps.rbac.permissions import HasScopedPermission
from .models import (
    CourseCategoryMaster,
    CourseMaster,
    TagMaster,
    CourseTagMap,
    CourseSkillMapping,
    CourseSection,
    CourseLesson,
    CourseContent,
    CourseResource,
    CourseDiscussionThread,
    CourseDiscussionReply
)
from .serializers import (
    CourseCategorySerializer,
    CourseMasterSerializer,
    CourseDetailSerializer,
    TagSerializer,
    CourseTagMapSerializer,
    CourseSkillMappingSerializer,
    CourseSectionSerializer,
    CourseLessonSerializer,
    CourseContentSerializer,
    CourseResourceSerializer,
    CourseDiscussionThreadSerializer,
    CourseDiscussionReplySerializer
)
from .services import (
    CourseCategoryService,
    CourseService,
    TagService,
    CourseTagMapService,
    CourseSkillMappingService,
    CourseSectionService,
    CourseLessonService,
    CourseContentService,
    CourseResourceService,
    CourseDiscussionThreadService,
    CourseDiscussionReplyService
)


class BaseCourseViewSet(viewsets.ModelViewSet):
    """
    Standardizes response logic for Course Management views.
    Includes Action-Aware Permission Mapping.
    """
    service_class = None
    model = None
    permission_classes = [HasScopedPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # Permission defaults
    VIEW_PERMISSION = "COURSE_VIEW"
    EDIT_PERMISSION = "COURSE_EDIT"

    @property
    def required_permission(self):
        """Map DRF actions to permission codes for RBAC evaluation."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
             return self.EDIT_PERMISSION
        return self.VIEW_PERMISSION

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
             serializer = self.get_serializer(page, many=True)
             return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = self.service_class().create(**serializer.validated_data)
        return created_response(
            message=f"{self.model._meta.verbose_name} created successfully.",
            data=self.get_serializer(instance).data
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = self.service_class().update(pk=instance.pk, **serializer.validated_data)
        return success_response(
            message=f"{self.model._meta.verbose_name} updated successfully.",
            data=self.get_serializer(updated).data
        )

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        soft_delete = request.query_params.get("soft_delete", "true").lower() == "true"
        self.service_class().delete(pk=pk, soft_delete=soft_delete)
        msg = f"{self.model._meta.verbose_name} deleted successfully."
        return success_response(message=msg)


class CourseCategoryViewSet(BaseCourseViewSet):
    queryset = CourseCategoryMaster.objects.all()
    serializer_class = CourseCategorySerializer
    service_class = CourseCategoryService
    model = CourseCategoryMaster


class TagViewSet(BaseCourseViewSet):
    queryset = TagMaster.objects.all()
    serializer_class = TagSerializer
    service_class = TagService
    model = TagMaster


class CourseMasterViewSet(BaseCourseViewSet):
    queryset = CourseMaster.objects.all()
    serializer_class = CourseMasterSerializer
    service_class = CourseService
    model = CourseMaster
    filterset_fields = ["category", "difficulty_level", "is_active"]
    search_fields = ["course_title", "course_code", "description"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CourseDetailSerializer
        return CourseMasterSerializer

    def get_object(self):
        """Ensures that retrieve requests use the optimized deep-fetch."""
        if self.action == "retrieve":
            pk = self.kwargs.get("pk")
            return self.service_class().get_complete_visual_path(pk)
        return super().get_object()


class CourseSectionViewSet(BaseCourseViewSet):
    queryset = CourseSection.objects.all()
    serializer_class = CourseSectionSerializer
    service_class = CourseSectionService
    model = CourseSection


class CourseLessonViewSet(BaseCourseViewSet):
    queryset = CourseLesson.objects.all()
    serializer_class = CourseLessonSerializer
    service_class = CourseLessonService
    model = CourseLesson


class CourseContentViewSet(BaseCourseViewSet):
    queryset = CourseContent.objects.all()
    serializer_class = CourseContentSerializer
    service_class = CourseContentService
    model = CourseContent


class CourseSkillMappingViewSet(BaseCourseViewSet):
    queryset = CourseSkillMapping.objects.all()
    serializer_class = CourseSkillMappingSerializer
    service_class = CourseSkillMappingService
    model = CourseSkillMapping


class CourseResourceViewSet(BaseCourseViewSet):
    queryset = CourseResource.objects.all()
    serializer_class = CourseResourceSerializer
    service_class = CourseResourceService
    model = CourseResource


class CourseDiscussionThreadViewSet(BaseCourseViewSet):
    queryset = CourseDiscussionThread.objects.all()
    serializer_class = CourseDiscussionThreadSerializer
    service_class = CourseDiscussionThreadService
    model = CourseDiscussionThread
    VIEW_PERMISSION = "COURSE_FORUM_VIEW"
    EDIT_PERMISSION = "COURSE_FORUM_CONTRIBUTE"


class CourseDiscussionReplyViewSet(BaseCourseViewSet):
    queryset = CourseDiscussionReply.objects.all()
    serializer_class = CourseDiscussionReplySerializer
    service_class = CourseDiscussionReplyService
    model = CourseDiscussionReply
    VIEW_PERMISSION = "COURSE_FORUM_VIEW"
    EDIT_PERMISSION = "COURSE_FORUM_CONTRIBUTE"
