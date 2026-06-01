/**
 * Dispatches to the correct content renderer based on content_type.
 * "Mark as Complete" button lives here in the lesson header — not in individual renderers.
 */

import { useMemo, useCallback } from 'react';
import { Play, FileText, Link as LinkIcon, ClipboardList, CircleCheckBig } from 'lucide-react';
import { cn } from '@/utils/cn';
import { CourseLesson } from '@/types/courses.types';
import { DetailedEnrollmentProgress, LessonProgress } from '@/types/player.types';
import { useCoursePlayerStore } from '@/stores/coursePlayerStore';
import { useMarkLessonComplete } from '@/queries/learner/usePlayerQueries';
import { VideoPlayer } from '@/components/learner/player/VideoPlayer';
import { DocumentViewer } from '@/components/learner/player/DocumentViewer';
import { LinkContent } from '@/components/learner/player/LinkContent';
import { AssessmentPlayer } from '@/components/learner/player/AssessmentPlayer';
import { ScormPlayer } from '@/components/learner/player/ScormPlayer';

interface ContentRendererProps {
  lesson: CourseLesson;
  enrollment: DetailedEnrollmentProgress;
  nextLesson: CourseLesson | null;
}

export const ContentRenderer = ({ lesson, enrollment, nextLesson }: ContentRendererProps) => {
  const { activeContentIndex, setActiveContentIndex, showLessonCompleteOverlay } =
    useCoursePlayerStore();

  const markCompleteMutation = useMarkLessonComplete();

  const contents = lesson.contents ?? [];

  // Find lesson progress for this lesson
  const lessonProgress: LessonProgress | undefined = useMemo(
    () => enrollment.lesson_progress.find((lp) => lp.lesson === lesson.id),
    [enrollment.lesson_progress, lesson.id]
  );

  const isLessonCompleted = lessonProgress?.status === 'COMPLETED';

  // Clamp index to valid range
  const safeIndex = Math.min(activeContentIndex, Math.max(0, contents.length - 1));
  const activeContent = contents[safeIndex];

  // Determine if this content type should show the manual mark-complete button
  // VIDEO handles its own completion (auto at 90%), QUIZ handles via result, SCORM handles via LMSCommit
  // For SCORM, we also allow the manual button as a fallback if the admin enabled require_mark_complete (e.g. for non-interactive packages)
  const showMarkCompleteButton =
    !isLessonCompleted &&
    activeContent &&
    activeContent.content_type !== 'QUIZ' &&
    (activeContent.content_type !== 'SCORM' || lesson.require_mark_complete);

  const handleMarkComplete = useCallback(() => {
    if (isLessonCompleted || !activeContent) return;
    markCompleteMutation.mutate(
      {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
        contentId: activeContent.id,
      },
      {
        onSuccess: () => showLessonCompleteOverlay(lesson.id),
      }
    );
  }, [
    isLessonCompleted,
    activeContent,
    enrollment.id,
    lesson.id,
    markCompleteMutation,
    showLessonCompleteOverlay,
  ]);

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'VIDEO': return <Play className="h-3 w-3" />;
      case 'PDF':
      case 'PPT':
      case 'DOCUMENT': return <FileText className="h-3 w-3" />;
      case 'LINK': return <LinkIcon className="h-3 w-3" />;
      case 'QUIZ': return <ClipboardList className="h-3 w-3" />;
      case 'SCORM': return <Play className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const getContentLabel = (type: string) => {
    switch (type) {
      case 'VIDEO': return 'Video';
      case 'PDF': return 'PDF';
      case 'PPT': return 'Presentation';
      case 'DOCUMENT': return 'Document';
      case 'LINK': return 'Link';
      case 'QUIZ': return 'Quiz';
      case 'SCORM': return 'SCORM';
      default: return type;
    }
  };

  // No content
  if (contents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-500">No content available for this lesson.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Lesson header with Mark as Complete ── */}
      <div className="p-5 bg-white border-b border-gray-200 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 leading-snug">
            {lesson.lesson_title}
          </h1>

          {/* Content type tabs (only when multiple content items) */}
          {contents.length > 1 && (
            <div className="flex items-center gap-1 mt-3">
              {contents.map((content, index) => (
                <button
                  key={content.id}
                  onClick={() => setActiveContentIndex(index)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    index === safeIndex
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-500 hover:bg-gray-100 border border-transparent'
                  )}
                >
                  {getContentIcon(content.content_type)}
                  {getContentLabel(content.content_type)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mark as Complete / Completed badge */}
        <div className="flex-shrink-0">
          {isLessonCompleted ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <CircleCheckBig className='h-5 w-5' />
              Completed
            </span>
          ) : showMarkCompleteButton ? (
            <button
              onClick={handleMarkComplete}
              disabled={markCompleteMutation.isPending}
              className="text-sm font-semibold text-blue-600"
            >
              {markCompleteMutation.isPending ? 'Saving...' : 'Mark as Complete'}
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto">
        {activeContent && (() => {
          switch (activeContent.content_type) {
            case 'VIDEO':
              return (
                <VideoPlayer
                  content={activeContent}
                  lesson={lesson}
                  enrollment={enrollment}
                  lessonProgress={lessonProgress}
                  nextLesson={nextLesson}
                />
              );
            case 'PDF':
            case 'PPT':
            case 'DOCUMENT':
              return (
                <DocumentViewer
                  content={activeContent}
                  lesson={lesson}
                  enrollment={enrollment}
                  lessonProgress={lessonProgress}
                  nextLesson={nextLesson}
                />
              );
            case 'LINK':
              return (
                <LinkContent
                  content={activeContent}
                  lesson={lesson}
                  enrollment={enrollment}
                  lessonProgress={lessonProgress}
                  nextLesson={nextLesson}
                />
              );
            case 'QUIZ':
              return (
                <AssessmentPlayer
                  lesson={lesson}
                  enrollment={enrollment}
                  lessonProgress={lessonProgress}
                  nextLesson={nextLesson}
                />
              );
            case 'SCORM':
              return (
                <ScormPlayer
                  content={activeContent}
                  lesson={lesson}
                  enrollment={enrollment}
                  lessonProgress={lessonProgress}
                  nextLesson={nextLesson}
                  scormMeta={activeContent.scorm_package!}
                />
              );
            default:
              return (
                <div className="flex items-center justify-center h-64">
                  <p className="text-sm text-gray-500">
                    Unsupported content type: {activeContent.content_type}
                  </p>
                </div>
              );
          }
        })()}
      </div>
    </div>
  );
};
