import { UserCourseEnrollment } from "@/types/courses.types";
import { Link } from "react-router-dom";
import { Calendar, AlertCircle, Award, BookOpen, ShieldAlert } from "lucide-react";
import { cn } from "@/utils/cn";

interface CourseProgressCardProps {
  enrollment: UserCourseEnrollment;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  NOT_STARTED: { label: "Not Started", dot: "bg-gray-300",    text: "text-gray-500"  },
  IN_PROGRESS:  { label: "In Progress", dot: "bg-blue-500",    text: "text-blue-600"  },
  COMPLETED:    { label: "Completed",   dot: "bg-emerald-500", text: "text-emerald-600"},
  DROPPED:      { label: "Dropped",     dot: "bg-red-400",     text: "text-red-500"   },
  OVERDUE:      { label: "Overdue",     dot: "bg-amber-400",   text: "text-amber-600" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

export const CourseProgressCard = ({ enrollment, className }: CourseProgressCardProps) => {
  const progress   = parseFloat(enrollment.progress_percentage);
  // Use backend-computed is_overdue — falls back to status check for OVERDUE status
  const isOverdue  = enrollment.is_overdue || enrollment.status === "OVERDUE";
  const status     = STATUS_CONFIG[enrollment.status] ?? STATUS_CONFIG.NOT_STARTED;
  const isComplete = enrollment.status === "COMPLETED";
  const isDropped  = enrollment.status === "DROPPED";
  const isActive   = !isComplete && !isDropped;

  return (
    <div
      className={cn(
        "group relative bg-white border rounded-md p-5 transition-all duration-200",
        isOverdue ? "border-amber-200" : "border-gray-200",
        className
      )}
    >
      {/* Overdue accent bar */}
      {isOverdue && (
        <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-amber-400" />
      )}

      {/* ── Row 1: title + status ── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1 flex-wrap">
            {enrollment.course_title}
            <span className="text-sm text-gray-400">({enrollment.course_code})</span>
          </h3>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn("flex items-center gap-1.5 text-[11px] font-medium", status.text)}>
            {status.label}
          </span>
          {isOverdue && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
              <AlertCircle className="h-3 w-3" />
              Overdue
            </span>
          )}
          {enrollment.is_mandatory && !isOverdue && (
            <span className="flex items-center gap-1 text-[10px] text-rose-500 font-semibold">
              <ShieldAlert className="h-3 w-3" />
              Mandatory
            </span>
          )}
        </div>
      </div>

      {/* ── Category tag ── */}
      <div className="mb-4">
        <Tag>{enrollment.category_name}</Tag>
      </div>

      {/* ── Progress bar ── */}
      {enrollment.status !== "NOT_STARTED" ? (
        <div className="mb-4 space-y-1.5">
          <div className="flex justify-between text-[11px] text-gray-400 font-medium">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isComplete ? "bg-emerald-500" : isOverdue ? "bg-amber-400" : "bg-blue-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-4 h-7" />
      )}

      {/* ── Dates row ── */}
      <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-4 flex-wrap">
        <span>Enrolled {formatDate(enrollment.enrolled_at)}</span>
        {enrollment.completed_at && (
          <span className="text-emerald-600 font-medium">
            · Done {formatDate(enrollment.completed_at)}
          </span>
        )}
        {!isComplete && enrollment.effective_due_date && (
          <span className={cn(
            "flex items-center gap-1 font-medium",
            isOverdue ? "text-amber-600" : "text-gray-500"
          )}>
            <Calendar className="h-3 w-3" />
            Due {formatDate(enrollment.effective_due_date)}
            {enrollment.extended_due_date && (
              <span className="text-blue-500 ml-0.5">(extended)</span>
            )}
          </span>
        )}
      </div>

      {/* ── Action button ── */}
      <ActionButton enrollment={enrollment} isActive={isActive} isComplete={isComplete} isOverdue={isOverdue} />
    </div>
  );
};

/* ── Helpers ── */

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-600">
      {children}
    </span>
  );
}

function ActionButton({
  enrollment,
  isActive,
  isComplete,
  isOverdue,
}: {
  enrollment: UserCourseEnrollment;
  isActive: boolean;
  isComplete: boolean;
  isOverdue: boolean;
}) {
  const base =
    "w-full flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md px-3 py-2.5 transition-colors duration-150";

  if (isComplete) {
    return (
      <div className="flex gap-2">
        <Link
          to={`/courses/${enrollment.course}`}
          className={cn(base, "bg-gray-100 text-gray-600 hover:bg-gray-200")}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Review Course
        </Link>
        <button className={cn(base, "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}>
          <Award className="h-3.5 w-3.5" />
          Certificate
        </button>
      </div>
    );
  }

  if (!isActive) {
    return (
      <Link
        to={`/courses/${enrollment.course}`}
        className={cn(base, "bg-gray-100 text-gray-600 hover:bg-gray-200")}
      >
        View Course
      </Link>
    );
  }

  // Overdue mandatory: still accessible — show warning-tinted button
  if (isOverdue) {
    return (
      <Link
        to={`/learn/${enrollment.id}`}
        className={cn(base, "bg-amber-500 text-white hover:bg-amber-600 shadow-sm")}
      >
        <AlertCircle className="h-3.5 w-3.5" />
        Continue (Overdue)
      </Link>
    );
  }

  return (
    <Link
      to={`/learn/${enrollment.id}`}
      className={cn(base, "bg-blue-600 text-white hover:bg-blue-700 shadow-sm")}
    >
      {enrollment.status === "NOT_STARTED" ? "Start Learning" : "Continue Learning"}
    </Link>
  );
}