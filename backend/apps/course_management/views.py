from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from common.response import success_response, created_response, error_response
from apps.rbac.permissions import HasScopedPermission
from apps.rbac.permission_codes import P
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
    CourseDiscussionReply,
    CourseParticipant,
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
    CourseDiscussionReplySerializer,
    CurriculumSyncSerializer,
    CourseParticipantSerializer,
    CourseParticipantBulkInviteSerializer,
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
    CourseDiscussionReplyService,
    CourseParticipantService,
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
    VIEW_PERMISSION = P.LEARNER_CORE.COURSE_VIEW
    EDIT_PERMISSION = P.CONTENT_MANAGEMENT.COURSE_UPDATE

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
        # Always treat as partial so PATCH with a subset of fields works correctly
        partial = kwargs.pop('partial', True)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
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

    def get_queryset(self):
        return self.service_class().get_all_with_counts()


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
    filterset_fields = ["category", "difficulty_level", "is_active", "status"]
    search_fields = ["course_title", "course_code", "description"]

    def get_queryset(self):
        """
        Write actions (update, partial_update, destroy, custom actions) always
        get the full unfiltered queryset so they can operate on inactive courses too.

        Read actions (list) default to is_active=True.
        Admins can pass ?is_active=false or ?is_active=true to override.
        """
        # For any mutating action, skip the visibility filter entirely
        if self.action in ("update", "partial_update", "destroy",
                           "sync_curriculum", "participants", "remove_participant"):
            return CourseMaster.objects.all()

        # For list/retrieve, apply the is_active filter
        qs = CourseMaster.objects.all()
        is_active_param = self.request.query_params.get("is_active", None)
        if is_active_param is not None:
            qs = qs.filter(is_active=is_active_param.lower() not in ("false", "0"))
        else:
            qs = qs.filter(is_active=True)
        return qs

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

    @action(detail=True, methods=["patch"], url_path="curriculum-sync")
    def sync_curriculum(self, request, pk=None):
        """
        Processes an entire course tree (Sections > Lessons > Content) at once.
        Blocked for ARCHIVED courses.
        """
        course = self.get_object()
        if hasattr(course, 'status') and course.status == 'ARCHIVED':
            return error_response(message="Cannot modify an archived course.")

        serializer = CurriculumSyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            self.service_class().sync_curriculum_tree(pk, serializer.validated_data)
            return success_response(message="Course curriculum synchronized successfully.")
        except Exception as e:
            return error_response(message=f"Sync failed: {str(e)}")

    @action(detail=True, methods=["get", "post"], url_path="participants")
    def participants(self, request, pk=None):
        """
        GET  /courses/{id}/participants/  — list all invited participants.
        POST /courses/{id}/participants/  — bulk-invite employees by ID list.
        """
        course = self.get_object()

        if request.method == "GET":
            qs = CourseParticipant.objects.filter(course=course).select_related(
                "employee__user", "invited_by"
            )
            serializer = CourseParticipantSerializer(qs, many=True)
            return success_response(data=serializer.data)

        # POST — bulk invite
        serializer = CourseParticipantBulkInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Resolve the requesting employee (invited_by)
        invited_by = getattr(request.user, "employee_record", None)
        invited_by_instance = invited_by.first() if invited_by else None

        created, skipped = CourseParticipantService().bulk_invite(
            course=course,
            employee_ids=serializer.validated_data["employee_ids"],
            invited_by=invited_by_instance,
        )
        return created_response(
            message=f"{created} participant(s) invited. {skipped} already existed.",
            data={"invited": created, "skipped": skipped},
        )

    @action(detail=True, methods=["delete"], url_path=r"participants/(?P<participant_id>\d+)")
    def remove_participant(self, request, pk=None, participant_id=None):
        """DELETE /courses/{id}/participants/{participant_id}/ — remove a participant."""
        course = self.get_object()
        try:
            participant = CourseParticipant.objects.get(id=participant_id, course=course)
            participant.delete()
            return success_response(message="Participant removed successfully.")
        except CourseParticipant.DoesNotExist:
            return error_response(message="Participant not found.")


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


class CourseTagMapViewSet(BaseCourseViewSet):
    queryset = CourseTagMap.objects.all()
    serializer_class = CourseTagMapSerializer
    service_class = CourseTagMapService
    model = CourseTagMap


class CourseResourceViewSet(BaseCourseViewSet):
    queryset = CourseResource.objects.all()
    serializer_class = CourseResourceSerializer
    service_class = CourseResourceService
    model = CourseResource
    filterset_fields = ["course", "is_active"]


class CourseDiscussionThreadViewSet(BaseCourseViewSet):
    queryset = CourseDiscussionThread.objects.all()
    serializer_class = CourseDiscussionThreadSerializer
    service_class = CourseDiscussionThreadService
    model = CourseDiscussionThread
    VIEW_PERMISSION = P.LEARNER_CORE.COURSE_VIEW
    EDIT_PERMISSION = P.CONTENT_MANAGEMENT.COURSE_UPDATE


class CourseDiscussionReplyViewSet(BaseCourseViewSet):
    queryset = CourseDiscussionReply.objects.all()
    serializer_class = CourseDiscussionReplySerializer
    service_class = CourseDiscussionReplyService
    model = CourseDiscussionReply
    VIEW_PERMISSION = P.LEARNER_CORE.COURSE_VIEW
    EDIT_PERMISSION = P.CONTENT_MANAGEMENT.COURSE_UPDATE


class CourseParticipantViewSet(BaseCourseViewSet):
    """
    Standalone viewset for managing individual course participants.
    Bulk invite is handled via CourseMasterViewSet.participants action.
    """
    queryset = CourseParticipant.objects.select_related("employee__user", "course")
    serializer_class = CourseParticipantSerializer
    service_class = CourseParticipantService
    model = CourseParticipant
    filterset_fields = ["course", "employee", "notification_sent"]
