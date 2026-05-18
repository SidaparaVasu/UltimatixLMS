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
    CourseNote,
    CourseTrainerMap,
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
    CourseNoteSerializer,
    CourseNoteCreateSerializer,
    CourseNoteUpdateSerializer,
    CourseTrainerMapSerializer,
    CourseTrainerWriteSerializer,
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
    CourseNoteService,
    CourseTrainerMapService,
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
        if self.request.method in ["POST", "PUT", "PATCH", "DELETE"]:
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
                           "sync_curriculum", "participants", "remove_participant",
                           "trainers", "manage_trainer"):
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

    # ── Trainer nested actions ────────────────────────────────────────────────

    @action(detail=True, methods=["get", "post"], url_path="trainers")
    def trainers(self, request, pk=None):
        """
        GET  /courses/{id}/trainers/  — list all trainers for the course.
        POST /courses/{id}/trainers/  — add a trainer to the course.
        """
        course = self.get_object()

        if request.method == "GET":
            trainers = CourseTrainerMapService().get_trainers_for_course(course.id)
            serializer = CourseTrainerMapSerializer(trainers, many=True)
            return success_response(data=serializer.data)

        # POST — add trainer
        serializer = CourseTrainerWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            trainer = CourseTrainerMapService().add_trainer(
                course_id=course.id,
                validated_data=serializer.validated_data,
            )
        except ValueError as exc:
            return error_response(message=str(exc), status_code=400)

        return created_response(
            message="Trainer added successfully.",
            data=CourseTrainerMapSerializer(trainer).data,
        )

    @action(detail=True, methods=["patch", "delete"], url_path=r"trainers/(?P<trainer_id>\d+)")
    def manage_trainer(self, request, pk=None, trainer_id=None):
        """
        PATCH  /courses/{id}/trainers/{trainer_id}/  — update a trainer.
        DELETE /courses/{id}/trainers/{trainer_id}/  — remove a trainer.
        """
        course = self.get_object()

        if request.method == "DELETE":
            try:
                trainer = CourseTrainerMap.objects.get(pk=trainer_id, course=course)
                trainer.delete()
                return success_response(message="Trainer removed successfully.")
            except CourseTrainerMap.DoesNotExist:
                return error_response(message="Trainer not found.", status_code=404)

        # PATCH — update trainer
        serializer = CourseTrainerWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            updated = CourseTrainerMapService().update_trainer(
                trainer_id=int(trainer_id),
                course_id=course.id,
                validated_data=serializer.validated_data,
            )
        except ValueError as exc:
            return error_response(message=str(exc), status_code=400)

        return success_response(
            message="Trainer updated successfully.",
            data=CourseTrainerMapSerializer(updated).data,
        )


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

    @action(detail=True, methods=["get"], url_path="has-progress")
    def has_progress(self, request, pk=None):
        """
        GET /courses/lessons/{id}/has-progress/
        Returns whether any learner has progress records for this lesson.
        Used by the frontend to decide between Archive and Force Delete.
        """
        from apps.learning_progress.models import UserLessonProgress
        has_records = UserLessonProgress.objects.filter(lesson_id=pk).exists()
        return success_response(data={"has_progress": has_records})

    def destroy(self, request, *args, **kwargs):
        """
        Soft-delete by default (sets is_active=False).
        Pass ?force=true to hard-delete — only allowed when no progress records exist.
        """
        from apps.learning_progress.models import UserLessonProgress
        pk = kwargs.get("pk")
        force = request.query_params.get("force", "false").lower() == "true"

        if force:
            has_records = UserLessonProgress.objects.filter(lesson_id=pk).exists()
            if has_records:
                return error_response(
                    message="Cannot permanently delete this lesson because learners have progress records for it. Archive it instead.",
                    status_code=status.HTTP_409_CONFLICT,
                )
            # Hard delete — no progress records, safe to remove
            self.service_class().delete(pk=pk, soft_delete=False)
            return success_response(message="Lesson permanently deleted.")

        # Default: soft delete
        self.service_class().delete(pk=pk, soft_delete=True)
        return success_response(message="Lesson archived successfully.")


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
    queryset = CourseDiscussionThread.objects.select_related(
        'created_by__user__profile'
    ).prefetch_related('replies__created_by__user__profile').order_by('-created_at')
    serializer_class = CourseDiscussionThreadSerializer
    service_class = CourseDiscussionThreadService
    model = CourseDiscussionThread
    filterset_fields = ['course']
    # Any enrolled learner can read AND post — only COURSE_UPDATE needed for edit/delete
    VIEW_PERMISSION = P.LEARNER_CORE.COURSE_VIEW
    EDIT_PERMISSION = P.LEARNER_CORE.COURSE_VIEW  # posting is a learner action

    def create(self, request, *args, **kwargs):
        # Resolve the employee from the current user and inject as created_by
        from apps.org_management.models import EmployeeMaster
        employee = EmployeeMaster.objects.filter(user=request.user).first()
        if not employee:
            return error_response(message="Employee profile not found.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = self.service_class().create(
            created_by=employee,
            **{k: v for k, v in serializer.validated_data.items() if k != 'created_by'}
        )
        return created_response(
            message="Discussion thread created successfully.",
            data=self.get_serializer(instance).data
        )


class CourseDiscussionReplyViewSet(BaseCourseViewSet):
    queryset = CourseDiscussionReply.objects.select_related(
        'created_by__user__profile'
    ).order_by('created_at')
    serializer_class = CourseDiscussionReplySerializer
    service_class = CourseDiscussionReplyService
    model = CourseDiscussionReply
    filterset_fields = ['thread']
    VIEW_PERMISSION = P.LEARNER_CORE.COURSE_VIEW
    EDIT_PERMISSION = P.LEARNER_CORE.COURSE_VIEW  # posting is a learner action

    def create(self, request, *args, **kwargs):
        from apps.org_management.models import EmployeeMaster
        employee = EmployeeMaster.objects.filter(user=request.user).first()
        if not employee:
            return error_response(message="Employee profile not found.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = self.service_class().create(
            created_by=employee,
            **{k: v for k, v in serializer.validated_data.items() if k != 'created_by'}
        )
        return created_response(
            message="Reply posted successfully.",
            data=self.get_serializer(instance).data
        )


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


class CourseNoteViewSet(viewsets.ViewSet):
    """
    Learner notes for a course.

    All endpoints require the learner to own the enrollment referenced in the
    request — ownership is enforced in the service layer.

    Routes (registered under /api/v1/courses/notes/):
        GET    /notes/?enrollment_id=<id>          — list notes for an enrollment
        POST   /notes/                             — create a note
        PATCH  /notes/<id>/                        — update note text
        DELETE /notes/<id>/                        — delete a note
    """

    permission_classes = [HasScopedPermission]
    # Notes are a learner action — same permission level as viewing a course
    VIEW_PERMISSION = P.LEARNER_CORE.COURSE_VIEW
    EDIT_PERMISSION = P.LEARNER_CORE.COURSE_VIEW

    @property
    def required_permission(self):
        return self.VIEW_PERMISSION

    # ── helpers ──────────────────────────────────────────────────────────────

    def _get_employee(self, request):
        from apps.org_management.models import EmployeeMaster
        employee = EmployeeMaster.objects.filter(user=request.user).first()
        if not employee:
            return None, error_response(message="Employee profile not found.", status_code=404)
        return employee, None

    def _get_owned_enrollment(self, enrollment_id, employee):
        """Returns the enrollment only if it belongs to the given employee."""
        from apps.learning_progress.models import UserCourseEnrollment
        try:
            return UserCourseEnrollment.objects.get(pk=enrollment_id, employee=employee), None
        except UserCourseEnrollment.DoesNotExist:
            return None, error_response(
                message="Enrollment not found or does not belong to you.",
                status_code=404,
            )

    # ── list ─────────────────────────────────────────────────────────────────

    def list(self, request):
        """
        GET /api/v1/courses/notes/?enrollment_id=<id>
        Returns all notes for the given enrollment, grouped by lesson order.
        """
        enrollment_id = request.query_params.get("enrollment_id")
        if not enrollment_id:
            return error_response(message="enrollment_id query parameter is required.", status_code=400)

        employee, err = self._get_employee(request)
        if err:
            return err

        enrollment, err = self._get_owned_enrollment(enrollment_id, employee)
        if err:
            return err

        notes = CourseNoteService().get_notes_for_enrollment(enrollment.id)
        serializer = CourseNoteSerializer(notes, many=True)
        return success_response(data=serializer.data)

    # ── create ────────────────────────────────────────────────────────────────

    def create(self, request):
        """
        POST /api/v1/courses/notes/
        Body: { enrollment_id, lesson_id (optional), note_text }
        """
        serializer = CourseNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        employee, err = self._get_employee(request)
        if err:
            return err

        enrollment, err = self._get_owned_enrollment(data["enrollment_id"], employee)
        if err:
            return err

        try:
            note = CourseNoteService().create_note(
                enrollment=enrollment,
                lesson_id=data.get("lesson_id"),
                note_text=data["note_text"],
            )
        except ValueError as exc:
            return error_response(message=str(exc), status_code=400)

        return created_response(
            message="Note saved successfully.",
            data=CourseNoteSerializer(note).data,
        )

    # ── partial_update (PATCH) ────────────────────────────────────────────────

    def partial_update(self, request, pk=None):
        """
        PATCH /api/v1/courses/notes/<id>/
        Body: { note_text }
        """
        serializer = CourseNoteUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee, err = self._get_employee(request)
        if err:
            return err

        # Resolve enrollment from the note itself (ownership check inside service)
        try:
            note = CourseNote.objects.select_related("enrollment__employee").get(
                pk=pk, enrollment__employee=employee
            )
        except CourseNote.DoesNotExist:
            return error_response(message="Note not found or does not belong to you.", status_code=404)

        try:
            updated = CourseNoteService().update_note(
                note_id=pk,
                owner_enrollment=note.enrollment,
                note_text=serializer.validated_data["note_text"],
            )
        except ValueError as exc:
            return error_response(message=str(exc), status_code=400)

        return success_response(
            message="Note updated successfully.",
            data=CourseNoteSerializer(updated).data,
        )

    # ── destroy ───────────────────────────────────────────────────────────────

    def destroy(self, request, pk=None):
        """
        DELETE /api/v1/courses/notes/<id>/
        """
        employee, err = self._get_employee(request)
        if err:
            return err

        try:
            note = CourseNote.objects.select_related("enrollment__employee").get(
                pk=pk, enrollment__employee=employee
            )
        except CourseNote.DoesNotExist:
            return error_response(message="Note not found or does not belong to you.", status_code=404)

        try:
            CourseNoteService().delete_note(note_id=pk, owner_enrollment=note.enrollment)
        except ValueError as exc:
            return error_response(message=str(exc), status_code=400)

        return success_response(message="Note deleted successfully.")
