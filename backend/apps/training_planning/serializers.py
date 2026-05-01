from rest_framework import serializers
from .models import (
    TrainingPlan,
    TrainingPlanItem,
    TrainingPlanApproval,
    TrainingCalendar,
    TrainingSession,
    TrainingSessionTrainer,
    TrainingSessionEnrollment,
    TrainingAttendance
)


class TrainingPlanSerializer(serializers.ModelSerializer):
    department_name  = serializers.CharField(source="department.department_name", read_only=True)
    created_by       = serializers.PrimaryKeyRelatedField(read_only=True)
    created_by_name  = serializers.CharField(source="created_by.user.get_full_name", read_only=True)
    skill_names      = serializers.SerializerMethodField()
    items_count      = serializers.SerializerMethodField()

    class Meta:
        model = TrainingPlan
        fields = "__all__"

    def get_skill_names(self, obj):
        return list(obj.skills.values_list("skill_name", flat=True))

    def get_items_count(self, obj):
        return obj.items.count()


class TrainingPlanItemSerializer(serializers.ModelSerializer):
    plan_name               = serializers.CharField(source="training_plan.plan_name", read_only=True)
    target_department_name  = serializers.CharField(source="target_department.department_name", read_only=True)
    course_title            = serializers.CharField(source="course.course_title", read_only=True, default=None)

    class Meta:
        model = TrainingPlanItem
        fields = "__all__"


class TrainingPlanApprovalSerializer(serializers.ModelSerializer):
    approver_name    = serializers.CharField(source="approver.user.get_full_name", read_only=True)
    submitted_by_name = serializers.CharField(source="submitted_by.user.get_full_name", read_only=True, default=None)
    training_plan_name       = serializers.CharField(source="training_plan.plan_name", read_only=True)
    training_plan_year       = serializers.IntegerField(source="training_plan.year", read_only=True)
    training_plan_department = serializers.CharField(source="training_plan.department.department_name", read_only=True)

    class Meta:
        model = TrainingPlanApproval
        fields = "__all__"


class TrainingCalendarSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.department_name", read_only=True)
    created_by      = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TrainingCalendar
        fields = "__all__"


class TrainingSessionSerializer(serializers.ModelSerializer):
    current_enrollments     = serializers.SerializerMethodField()
    course_title            = serializers.CharField(source="course.course_title", read_only=True, default=None)
    training_plan_item_name = serializers.CharField(source="training_plan_item.course.course_title", read_only=True, default=None)

    class Meta:
        model = TrainingSession
        fields = "__all__"

    def get_current_enrollments(self, obj):
        from .constants import EnrollmentStatus
        return obj.enrollments.filter(enrollment_status=EnrollmentStatus.ENROLLED).count()


class TrainingSessionTrainerSerializer(serializers.ModelSerializer):
    trainer_name = serializers.CharField(source="trainer.user.get_full_name", read_only=True)

    class Meta:
        model = TrainingSessionTrainer
        fields = "__all__"


class TrainingSessionEnrollmentSerializer(serializers.ModelSerializer):
    employee_name  = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    employee_code  = serializers.CharField(source="employee.employee_code", read_only=True)
    session_title  = serializers.CharField(source="training_session.session_title", read_only=True)

    class Meta:
        model = TrainingSessionEnrollment
        fields = "__all__"


class TrainingAttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)

    class Meta:
        model = TrainingAttendance
        fields = "__all__"
