import { useState } from "react";
import { useMyEnrollments } from "@/queries/learner/useLearnerQueries";
import { CourseProgressCard } from "@/components/learner/CourseProgressCard";
import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import { EnrollmentStatus } from "@/types/courses.types";

const tabs = [
  { id: '', label: 'All', icon: BookOpen },
  { id: 'IN_PROGRESS', label: 'In Progress', icon: Clock },
  { id: 'COMPLETED', label: 'Completed', icon: CheckCircle },
  { id: 'NOT_STARTED', label: 'Not Started', icon: GraduationCap },
] as const;

export default function MyLearningPage() {
  const [activeTab, setActiveTab] = useState<string>('');
  
  const { data: enrollmentsData, isLoading } = useMyEnrollments(
    activeTab ? { status: activeTab } : undefined
  );

  const enrollments = enrollmentsData?.results || [];
  const totalCount = enrollmentsData?.count || 0;

  // Get counts for each status for display
  const { data: allEnrollments } = useMyEnrollments();
  const allResults = allEnrollments?.results || [];
  
  const statusCounts = {
    all: allResults.length,
    in_progress: allResults.filter(e => e.status === 'IN_PROGRESS').length,
    completed: allResults.filter(e => e.status === 'COMPLETED').length,
    not_started: allResults.filter(e => e.status === 'NOT_STARTED').length,
  };

  const getTabCount = (tabId: string) => {
    switch (tabId) {
      case '': return statusCounts.all;
      case 'IN_PROGRESS': return statusCounts.in_progress;
      case 'COMPLETED': return statusCounts.completed;
      case 'NOT_STARTED': return statusCounts.not_started;
      default: return 0;
    }
  };

  const getEmptyStateContent = (tabId: string) => {
    switch (tabId) {
      case 'IN_PROGRESS':
        return {
          icon: Clock,
          title: "No courses in progress",
          description: "Start learning from your enrolled courses or discover new ones.",
          action: { text: "Browse Courses", to: "/courses" }
        };
      case 'COMPLETED':
        return {
          icon: CheckCircle,
          title: "No completed courses yet",
          description: "Complete your enrolled courses to see them here.",
          action: null
        };
      case 'NOT_STARTED':
        return {
          icon: GraduationCap,
          title: "No courses waiting to start",
          description: "All your enrolled courses are either in progress or completed.",
          action: null
        };
      default:
        return {
          icon: BookOpen,
          title: "No enrolled courses",
          description: "Start your learning journey by enrolling in courses that interest you.",
          action: { text: "Browse Course Catalog", to: "/courses" }
        };
    }
  };

  // Loading skeleton
  if (isLoading && activeTab === '') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Learning</h1>
        </div>
        
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <div key={tab.id} className="py-2 px-1 border-b-2 border-transparent">
                <div className="h-6 bg-gray-200 rounded w-20 animate-pulse" />
              </div>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 animate-pulse">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-5 bg-gray-200 rounded w-16" />
                  <div className="h-5 bg-gray-200 rounded w-20" />
                </div>
                <div className="h-2 bg-gray-200 rounded w-full" />
                <div className="h-8 bg-gray-200 rounded w-24 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const emptyState = getEmptyStateContent(activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mt-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Learning</h1>
          <p className="text-gray-600 mt-1">
            Track your progress and continue your learning journey
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const count = getTabCount(tab.id);
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "group inline-flex items-center py-2 px-8 border-b-2 font-medium text-sm",
                  isActive
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className={cn(
                  "mr-2 h-4 w-4",
                  isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"
                )} />
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    "ml-2 py-0.5 px-2 rounded-full text-xs font-medium",
                    isActive
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-900"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {enrollments.length === 0 ? (
        <div className="text-center py-12">
          <emptyState.icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyState.title}</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {emptyState.description}
          </p>
          {emptyState.action && (
            <Link to={emptyState.action.to} className="btn">
              {emptyState.action.text}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map(enrollment => (
              <CourseProgressCard
                key={enrollment.id}
                enrollment={enrollment}
              />
            ))}
          </div>

          {/* Pagination - if needed */}
          {totalCount > 12 && (
            <div className="flex items-center justify-center">
              <p className="text-sm text-gray-600">
                Showing {enrollments.length} of {totalCount} courses
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}