/**
 * Two-panel layout: collapsible sidebar + main content area.
 * Rendered inside a full-screen portal from CoursePlayerPage.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, MessageSquare, BookOpen, StickyNote } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useCoursePlayerStore } from '@/stores/coursePlayerStore';
import { DetailedEnrollmentProgress } from '@/types/player.types';
import { PlayerSidebar } from '@/components/learner/player/PlayerSidebar';
import { ContentRenderer } from '@/components/learner/player/ContentRenderer';
import { LessonCompleteOverlay } from '@/components/learner/player/LessonCompleteOverlay';
import { CourseCompletionModal } from '@/components/learner/player/CourseCompletionModal';
import { DiscussionPanel } from '@/components/learner/player/DiscussionPanel';
import { NotesPanel } from '@/components/learner/player/NotesPanel';
import { useCourseDetail } from '@/queries/learner/useLearnerQueries';

type PlayerTab = 'content' | 'discussion' | 'notes';

interface PlayerLayoutProps {
  enrollment: DetailedEnrollmentProgress;
}

export const PlayerLayout = ({ enrollment }: PlayerLayoutProps) => {
  const { isSidebarOpen, toggleSidebar, activeLessonId, completedLessonOverlay } =
    useCoursePlayerStore();

  const [activeTab, setActiveTab] = useState<PlayerTab>('content');

  const { data: courseData } = useCourseDetail(enrollment.course);

  const progressPercentage = parseFloat(enrollment.progress_percentage);
  const isCourseComplete = progressPercentage >= 100 || enrollment.status === 'COMPLETED';

  // Find the active lesson from course sections
  const activeLesson = useMemo(() => {
    if (!courseData?.sections || !activeLessonId) return null;
    for (const section of courseData.sections) {
      const lesson = section.lessons?.find((l) => l.id === activeLessonId);
      if (lesson) return lesson;
    }
    return null;
  }, [courseData, activeLessonId]);

  // Find the section for the active lesson (for breadcrumb)
  const activeSection = useMemo(() => {
    if (!courseData?.sections || !activeLessonId) return null;
    return (
      courseData.sections.find((s) =>
        s.lessons?.some((l) => l.id === activeLessonId)
      ) ?? null
    );
  }, [courseData, activeLessonId]);

  // Find the next lesson after the active one
  const nextLesson = useMemo(() => {
    if (!courseData?.sections || !activeLessonId) return null;
    const allLessons = courseData.sections.flatMap((s) => s.lessons ?? []);
    const currentIndex = allLessons.findIndex((l) => l.id === activeLessonId);
    return currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;
  }, [courseData, activeLessonId]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-200 flex-shrink-0">
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0"
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>

        {/* Back link */}
        <Link
          to="/my-learning"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          My Learning
        </Link>

        <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

        {/* Course title */}
        <span className="text-sm font-semibold text-gray-900 truncate">
          {enrollment.course_title}
        </span>

        {/* Breadcrumb */}
        {activeSection && activeLesson && (
          <>
            <div className="w-px h-4 bg-gray-200 hidden md:block flex-shrink-0" />
            <span className="text-xs text-gray-400 hidden md:block truncate max-w-[240px]">
              {activeSection.section_title}
              <span className="mx-1.5 text-gray-300">/</span>
              {activeLesson.lesson_title}
            </span>
          </>
        )}

        {/* Overall progress — pushed to right */}
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:block">
            {Math.round(progressPercentage)}% complete
          </span>
          <div className="w-28 h-1.5 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Body: Sidebar + Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={cn(
            'flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto transition-all duration-200 no-scrollbar',
            isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
          )}
        >
          {isSidebarOpen && courseData && (
            <PlayerSidebar
              sections={courseData.sections ?? []}
              lessonProgressList={enrollment.lesson_progress}
            />
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Tab bar */}
          <div className="flex items-center gap-1 pt-1 pb-0 bg-white border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('content')}
              className={cn(
                'flex items-center gap-1.5 px-6 py-2 text-xs font-semibold border-b-2 transition-colors',
                activeTab === 'content'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Content
            </button>
            <button
              onClick={() => setActiveTab('discussion')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors',
                activeTab === 'discussion'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Discussion
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors',
                activeTab === 'notes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <StickyNote className="h-3.5 w-3.5" />
              Notes
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'content' ? (
              activeLesson ? (
                <ContentRenderer
                  lesson={activeLesson}
                  enrollment={enrollment}
                  nextLesson={nextLesson}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-500">Select a lesson to begin.</p>
                </div>
              )
            ) : activeTab === 'notes' ? (
              <NotesPanel
                enrollmentId={enrollment.id}
                sections={courseData?.sections ?? []}
                activeLessonId={activeLessonId}
              />
            ) : (
              <DiscussionPanel courseId={enrollment.course} />
            )}
          </div>
        </div>
      </div>

      {/* ── Overlays ── */}
      {completedLessonOverlay !== null && (
        <LessonCompleteOverlay
          lessonId={completedLessonOverlay}
          nextLesson={nextLesson}
        />
      )}

      {isCourseComplete && (
        <CourseCompletionModal
          courseTitle={enrollment.course_title}
          enrollmentId={enrollment.id}
        />
      )}
    </div>
  );
};
