import { useParams, Link } from "react-router-dom";
import { useCourseDetail, useMyEnrollments, useEnrollInCourse } from "@/queries/learner/useLearnerQueries";
import { DifficultyBadge } from "@/components/learner/DifficultyBadge";
import { EnrollButton } from "@/components/learner/EnrollButton";
import { CurriculumPreview } from "@/components/learner/CurriculumPreview";
import { ArrowLeft, Clock, User, Download, ExternalLink, Award, Mail, Phone, Info, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { fileApi } from "@/api/file-api";
import type { CourseResource, CourseTrainer } from "@/types/courses.types";


function TrainerCard({ trainer }: { trainer: CourseTrainer }) {
  const name = trainer.display_name || trainer.trainer_name || 'Trainer';

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 truncate">{name}</span>
          {trainer.is_primary && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
              <Star className="h-2.5 w-2.5" />
              Primary
            </span>
          )}
          {trainer.is_external && (
            <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
              External
            </span>
          )}
        </div>

        {trainer.display_email && (
          <a
            href={`mailto:${trainer.display_email}`}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-0.5 truncate"
          >
            <Mail className="h-3 w-3 flex-shrink-0" />
            {trainer.display_email}
          </a>
        )}

        {trainer.trainer_contact && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <Phone className="h-3 w-3 flex-shrink-0" />
            {trainer.trainer_contact}
          </div>
        )}

        {trainer.trainer_info && (
          <div className="flex items-start gap-1 text-xs text-gray-500 mt-1">
            <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{trainer.trainer_info}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id ? parseInt(id, 10) : 0;

  const { data: courseData, isLoading: courseLoading, error: courseError } = useCourseDetail(courseId);
  const { data: enrollmentsData } = useMyEnrollments();
  const enrollMutation = useEnrollInCourse();

  const [downloadingResourceId, setDownloadingResourceId] = useState<number | null>(null);

  // Find current user's enrollment for this course
  const enrollment = useMemo(() => {
    if (!enrollmentsData?.results || !courseId) return null;
    return enrollmentsData.results.find(e => e.course === courseId) || null;
  }, [enrollmentsData, courseId]);

  const handleEnroll = () => {
    if (courseId) {
      enrollMutation.mutate({ course_id: courseId });
    }
  };

  const handleDownloadResource = async (resource: CourseResource) => {
    if (!resource.file_ref) return;
    setDownloadingResourceId(resource.id);
    try {
      await fileApi.downloadResource(
        resource.file_ref,
        resource.original_name || resource.resource_title,
      );
    } finally {
      setDownloadingResourceId(null);
    }
  };

  // Simple HTML sanitization - remove script tags and event handlers
  const sanitizeHtml = (html: string) => {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/on\w+='[^']*'/g, '')
      .replace(/javascript:/gi, '');
  };

  // Loading state
  if (courseLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        
        <div className="bg-white border border-gray-200 p-6">
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse" />
              <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (courseError || !courseData) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h2>
          <p className="text-gray-600 mb-6">
            The course you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/courses" className="btn">
            Back to Course Catalog
          </Link>
        </div>
      </div>
    );
  }

  const course = courseData;
  const isEnrolled = !!enrollment;
  const isCompleted = enrollment?.status === 'COMPLETED';
  const progressPercentage = enrollment ? parseFloat(enrollment.progress_percentage) : 0;

  return (
    <div className="py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link to="/courses" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Course Catalog
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{course.course_title}</span>
      </div>

      {/* Hero Section */}
      <div className="bg-white mt-3 border border-gray-200 p-6 rounded-md">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">

            <h1 className="text-2xl mb-1">
              {course.course_title} 
              <span className="ml-2">({course.course_code})</span>
            </h1>

            {/* Description */}
            {course.description && (
              <div className="prose prose-sm mb-2 max-w-none text-gray-700">
                {course.description.includes('<') ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(course.description) }} />
                ) : (
                  <p>{course.description}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{course.estimated_duration_hours} hours</span>
              </div>
              {course.created_by_name && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>By {course.created_by_name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 mt-2">
              {course.category_name && (
                <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-blue-100 text-blue-800">
                  {course.category_name}
                </span>
              )}
              <DifficultyBadge level={course.difficulty_level} />
            </div>
          </div>

          {/* Enrollment Action */}
          <div className="lg:w-80 flex flex-col justify-between gap-5">
            <div className="p-6">
              <EnrollButton
                courseId={course.id}
                isEnrolled={isEnrolled}
                isCompleted={isCompleted}
                enrollmentId={enrollment?.id}
                isLoading={enrollMutation.isPending}
                onEnroll={handleEnroll}
                className="w-full"
              />
              
              {isCompleted && (
                <button className="w-full mt-4 bg-accent text-white py-2 flex items-center justify-center gap-2">
                  <Award className="h-4 w-4" />
                  Download Certificate
                </button>
              )}
            </div>

            {/* Progress Bar (if enrolled) */}
            {isEnrolled && !isCompleted && (
              <div>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Your Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 h-3 rounded-full">
                  <div
                    className="bg-blue-600 h-3 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Layout - 70% left, 30% right */}
      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        {/* Left Side - 70% - Course Curriculum */}
        <div className="flex-1 lg:w-[70%]">
          <div className="bg-white border border-gray-200 p-6 rounded-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Curriculum</h2>
            <CurriculumPreview 
              sections={course.sections || []} 
              enrollmentId={enrollment?.id}
            />
          </div>
        </div>

        {/* Right Side - 30% - Skills and Resources */}
        <div className="lg:w-[30%] space-y-6">
          {/* Skills Section */}
          {course.skills && course.skills.length > 0 && (
            <div className="bg-white border border-gray-200 p-6 rounded-md">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills You'll Learn</h2>
              <div className="flex flex-wrap gap-2">
                {course.skills.map(skill => (
                  <div key={skill.id} className="flex flex-row gap-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                    <span className="text-xs font-medium text-blue-900">{skill.skill_name}</span>
                    <span className="text-xs text-blue-600 font-medium">
                      {skill.target_level_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trainers Section */}
          {course.trainers && course.trainers.length > 0 && (
            <div className="bg-white border border-gray-200 p-6 rounded-md">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {course.trainers.length === 1 ? 'Course Trainer' : 'Course Trainers'}
              </h2>
              <div>
                {course.trainers.map(trainer => (
                  <TrainerCard key={trainer.id} trainer={trainer} />
                ))}
              </div>
            </div>
          )}

          {/* Resources Section */}
          {course.resources && course.resources.length > 0 && (
            <div className="bg-white border border-gray-200 p-6 rounded-md">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Resources</h2>
              <div className="space-y-2">
                {course.resources.map(resource => (
                  <div key={resource.id} className="flex flex-row justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm leading-tight">
                        {resource.resource_title}
                      </span>
                    </div>
                    {resource.file_ref ? (
                      <button
                        onClick={() => handleDownloadResource(resource)}
                        disabled={downloadingResourceId === resource.id}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs ml-6 disabled:opacity-50"
                      >
                        <Download className="h-3 w-3" />
                        <span>{downloadingResourceId === resource.id ? 'Downloading…' : 'Download'}</span>
                      </button>
                    ) : (
                      <a
                        href={resource.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs ml-6"
                      >
                        <span>View Resource</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}