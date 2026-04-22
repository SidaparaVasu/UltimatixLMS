import React, { useState, useEffect, useCallback } from 'react';
import {
  Video, FileText, Presentation, Link as LinkIcon,
  LayoutList, ChevronDown, ChevronUp, CheckCircle, Check,
  MonitorPlay, BookOpen, X, ChevronLeft, ChevronRight,
  Keyboard, Loader2
} from 'lucide-react';
import { CurriculumNode } from '@/components/admin/builder/CurriculumTree';
import { VideoViewer } from './VideoViewer';
import { DocumentViewer } from './DocumentViewer';
import { QuizPlayer } from './QuizPlayer';
import { assessmentApi } from '@/api/assessment-api';
import { cn } from '@/utils/cn';

interface LearnerPreviewPaneProps {
  nodes: CurriculumNode[];
  courseTitle: string;
  onExitPreview: () => void;
}

// ─── Flatten all lessons in order ────────────────────────────────────────────
const getAllLessons = (nodes: CurriculumNode[]): CurriculumNode[] =>
  nodes.flatMap(n => (n.type === 'SECTION' ? (n.children || []) : [n]));

// ─── Content type icon ───────────────────────────────────────────────────────
const LessonIcon: React.FC<{ contentType?: string; size?: number }> = ({ contentType, size = 14 }) => {
  switch (contentType) {
    case 'VIDEO':  return <Video size={size} className="text-blue-400 shrink-0" />;
    case 'PDF':    return <FileText size={size} className="text-red-400 shrink-0" />;
    case 'PPT':    return <Presentation size={size} className="text-orange-400 shrink-0" />;
    case 'QUIZ':   return <LayoutList size={size} className="text-purple-400 shrink-0" />;
    case 'LINK':   return <LinkIcon size={size} className="text-cyan-400 shrink-0" />;
    default:       return <MonitorPlay size={size} className="text-slate-500 shrink-0" />;
  }
};

// ─── Circular Progress Ring (SVG) ────────────────────────────────────────────
const CircularProgress: React.FC<{ pct: number; size?: number; stroke?: number }> = ({
  pct,
  size = 28,
  stroke = 2.5,
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const isDone = pct >= 100;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke} className="text-slate-800" />
      {/* Fill */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={cn(
          'transition-all duration-500',
          isDone ? 'text-emerald-400' : 'text-blue-400'
        )}
      />
    </svg>
  );
};

/**
 * Lazily loads quiz data for a lesson node and renders QuizPlayer.
 * Uses cached quizData from the node if available, otherwise fetches from backend.
 */
const QuizLessonPlayer: React.FC<{ lesson: CurriculumNode }> = ({ lesson }) => {
  const [quizData, setQuizData] = useState(lesson.quizData ?? null);
  const [loading, setLoading] = useState(!lesson.quizData && !!lesson.assessmentId);

  useEffect(() => {
    // If quizData is already cached on the node, use it directly
    if (lesson.quizData) {
      setQuizData(lesson.quizData);
      setLoading(false);
      return;
    }
    // Otherwise fetch from backend using assessmentId
    if (!lesson.assessmentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    assessmentApi.getAssessmentDetail(lesson.assessmentId).then(res => {
      if (res?.questions) {
        setQuizData({
          questions: res.questions.map(q => ({
            id: q.id,
            type: q.question_type,
            prompt: q.question_text,
            scenarioText: q.scenario_text,
            options: q.options?.map(o => ({
              id: String(o.id),
              text: o.option_text,
              isCorrect: o.is_correct,
            })),
          })),
          settings: {
            passingScore: Number(res.passing_percentage),
            timeLimit: res.duration_minutes,
            shuffleQuestions: res.is_randomized,
            attemptLimit: res.retake_limit,
          },
        });
      }
    }).finally(() => setLoading(false));
  }, [lesson.id, lesson.assessmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading assessment...</span>
      </div>
    );
  }

  return <QuizPlayer quizData={quizData ?? undefined} lessonTitle={lesson.title} />;
};

/**
 * LearnerPreviewPane — Full-screen learner-facing course preview.
 * Enhancements:
 *  - Circular section progress ring (replaces folder icons)
 *  - Previous / Next lesson navigation buttons in content area
 *  - Keyboard arrow navigation (← →) 
 *  - Lesson breadcrumb (Section > Lesson N of M)
 *  - Per-section completion sub-count in sidebar
 */
export const LearnerPreviewPane: React.FC<LearnerPreviewPaneProps> = ({
  nodes,
  courseTitle,
  onExitPreview,
}) => {
  const allLessons = getAllLessons(nodes);
  const [selectedLesson, setSelectedLesson] = useState<CurriculumNode | null>(
    allLessons[0] ?? null
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(nodes.map(n => n.id))
  );
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);

  // ── Auto-select first lesson ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedLesson && allLessons.length > 0) setSelectedLesson(allLessons[0]);
  }, [nodes]);

  // ── Current global index ─────────────────────────────────────────────────
  const currentIndex = selectedLesson
    ? allLessons.findIndex(l => l.id === selectedLesson.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allLessons.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) setSelectedLesson(allLessons[currentIndex - 1]);
  }, [hasPrev, currentIndex, allLessons]);

  const goToNext = useCallback(() => {
    if (hasNext) setSelectedLesson(allLessons[currentIndex + 1]);
  }, [hasNext, currentIndex, allLessons]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as Element).tagName)) return;
      if (e.key === 'ArrowLeft')  goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goToPrev, goToNext]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const markComplete = (id: string) => {
    setCompletedIds(prev => new Set([...prev, id]));
    // Auto-advance
    const idx = allLessons.findIndex(l => l.id === id);
    if (idx !== -1 && idx < allLessons.length - 1) {
      setSelectedLesson(allLessons[idx + 1]);
    }
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalLessons = allLessons.length;
  const completedCount = completedIds.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Per-section stats
  const getSectionStats = (section: CurriculumNode) => {
    const lessons = section.children || [];
    const done = lessons.filter(l => completedIds.has(l.id)).length;
    const pct = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0;
    return { total: lessons.length, done, pct };
  };

  // Breadcrumb: find which section the current lesson belongs to
  const currentSection = nodes.find(s =>
    s.children?.some(l => l.id === selectedLesson?.id)
  );
  const lessonIndexInSection = currentSection?.children?.findIndex(l => l.id === selectedLesson?.id) ?? -1;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0c0e16] text-slate-200">

      {/* ── Preview Header ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between h-14 px-5 bg-[#141620] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
            <MonitorPlay size={12} />
            Learner Preview
          </div>
          <span className="text-sm font-semibold text-white truncate max-w-xs">{courseTitle}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Keyboard hint toggle */}
          <button
            onClick={() => setShowKeyboardHint(v => !v)}
            className="relative flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            title="Keyboard shortcuts"
          >
            <Keyboard size={13} />
            <span className="hidden sm:inline">Shortcuts</span>
            {showKeyboardHint && (
              <div className="absolute top-6 right-0 z-50 w-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-left shadow-xl space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Keyboard</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>← Previous</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] border border-slate-700">←</kbd>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Next →</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] border border-slate-700">→</kbd>
                </div>
              </div>
            )}
          </button>

          {/* Overall progress */}
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }} />
            </div>
            <span className="font-bold text-slate-300">{progressPct}%</span>
            <span className="text-slate-600">({completedCount}/{totalLessons})</span>
          </div>

          <button
            onClick={onExitPreview}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <X size={14} />
            Exit Preview
          </button>
        </div>
      </header>

      {/* ── Main Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Curriculum Sidebar ──────────────────────────────────────── */}
        <aside className="w-[280px] shrink-0 flex flex-col bg-[#141620] border-r border-slate-800 overflow-hidden">
          
          {/* Sidebar header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
            <BookOpen size={14} className="text-blue-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Course Content</span>
          </div>

          {/* Section tree */}
          <div className="flex-1 overflow-y-auto pb-6 no-scrollbar">
            {nodes.length === 0 ? (
              <div className="text-center text-slate-600 text-xs p-8">
                No curriculum content added yet.
              </div>
            ) : (
              nodes.map(section => {
                const { total, done, pct } = getSectionStats(section);
                const isOpen = expandedSections.has(section.id);

                return (
                  <div key={section.id}>
                    {/* ── Section row with circular progress ── */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-800/60 transition-colors"
                    >
                      {/* Circular progress ring */}
                      <div className="relative shrink-0">
                        <CircularProgress pct={pct} size={20} stroke={2} />
                        {pct >= 100 && (
                          <Check
                            size={10}
                            className="text-emerald-400 absolute inset-0 m-auto"
                          />
                        )}
                      </div>

                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-[11px] font-black text-slate-300 truncate">
                          {section.title}
                        </span>
                        <span className="text-[9px] text-slate-600">
                          {done} of {total} completed
                        </span>
                      </div>

                      {isOpen
                        ? <ChevronDown size={12} className="text-slate-600 shrink-0" />
                        : <ChevronUp size={12} className="text-slate-600 shrink-0" />
                      }
                    </button>

                    {/* ── Lessons ── */}
                    {isOpen && (
                      <div className="ml-3 border-l border-slate-800">
                        {(section.children || []).length === 0 ? (
                          <p className="text-[10px] text-slate-700 italic px-3 py-1.5">No lessons in this section.</p>
                        ) : (
                          (section.children || []).map(lesson => {
                            const isActive = selectedLesson?.id === lesson.id;
                            const isDone = completedIds.has(lesson.id);
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => setSelectedLesson(lesson)}
                                className={cn(
                                  'w-full flex items-center gap-2.5 pl-2.5 py-2 text-left transition-all text-[11px]',
                                  isActive
                                    ? 'bg-blue-500/10 text-blue-300'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                )}
                              >
                                {isDone
                                  ? <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                                  : <LessonIcon contentType={lesson.contentType} />
                                }
                                <span className={cn('truncate flex-1 font-medium', isDone && 'line-through text-slate-600')}>
                                  {lesson.title}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Right: Content Area ───────────────────────────────────────────── */}
        <main className="flex-1 px-10 overflow-y-auto no-scrollbar">
          {!selectedLesson ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
              <BookOpen size={40} className="opacity-20" />
              <p className="text-sm">Select a lesson from the sidebar to begin.</p>
            </div>
          ) : (
            <div className="max-w-full mx-auto px-8 py-10 space-y-5">

              {/* ── Breadcrumb ─────────────────────────────────────────────── */}
              {currentSection && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span className="truncate max-w-[140px]">{currentSection.title}</span>
                  <ChevronRight size={12} className="shrink-0" />
                  <span className="text-slate-400 font-medium truncate">{selectedLesson.title}</span>
                  <span className="ml-auto shrink-0 text-slate-300">
                    Lesson {lessonIndexInSection + 1} of {currentSection.children?.length}
                  </span>
                </div>
              )}

              {/* ── Lesson header ───────────────────────────────────────────── */}
              <div className="pb-3 border-b border-slate-800">
                <h1 className="text-2xl font-black text-white tracking-tight leading-snug">
                  {selectedLesson.title}
                </h1>
              </div>

              {/* ── Content Renderer ────────────────────────────────────────── */}
              {selectedLesson.contentType === 'VIDEO' && (
                <VideoViewer videoUrl={selectedLesson.videoUrl} title={selectedLesson.title} />
              )}
              {selectedLesson.contentType === 'PDF' && (
                <DocumentViewer contentType="PDF" docMetadata={selectedLesson.docMetadata} fileUrl={selectedLesson.fileUrl} />
              )}
              {selectedLesson.contentType === 'PPT' && (
                <DocumentViewer contentType="PPT" docMetadata={selectedLesson.docMetadata} fileUrl={selectedLesson.fileUrl} />
              )}
              {selectedLesson.contentType === 'DOCUMENT' && (
                <DocumentViewer contentType="DOCUMENT" docMetadata={selectedLesson.docMetadata} fileUrl={selectedLesson.fileUrl} />
              )}
              {selectedLesson.contentType === 'QUIZ' && (
                <QuizLessonPlayer lesson={selectedLesson} />
              )}
              {selectedLesson.contentType === 'LINK' && (
                <div className="flex flex-col items-center justify-center h-64 rounded-xl bg-slate-900/50 border border-dashed border-slate-700 text-slate-400 gap-4 p-6 text-center">
                  <LinkIcon size={36} className="opacity-30" />
                  <p className="text-sm font-medium">External resource link.</p>
                  {selectedLesson.contentUrl ? (
                    <a
                      href={selectedLesson.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 break-all"
                    >
                      {selectedLesson.contentUrl}
                    </a>
                  ) : (
                    <p className="text-xs text-slate-600">No resource URL added yet.</p>
                  )}
                </div>
              )}

              {/* No content type set yet */}
              {!selectedLesson.contentType && (
                <div className="flex flex-col items-center justify-center h-64 rounded-xl bg-slate-900/50 border border-dashed border-slate-700 text-slate-600 gap-3">
                  <MonitorPlay size={36} className="opacity-20" />
                  <p className="text-sm">This lesson has no content added yet.</p>
                </div>
              )}

              {/* ── Mark Complete CTA ───────────────────────────────────────── */}
              {selectedLesson.contentType !== 'QUIZ' && (
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    {completedIds.has(selectedLesson.id) ? '✓ Marked as complete' : 'Finished reviewing this lesson?'}
                  </p>
                  {!completedIds.has(selectedLesson.id) ? (
                    <button
                      onClick={() => markComplete(selectedLesson.id)}
                      className="flex items-center gap-2 px-5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-900/20 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <CheckCircle size={15} />
                      Mark as Complete
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                      <CheckCircle size={15} />
                      Completed
                    </span>
                  )}
                </div>
              )}

              {/* ── Previous / Next navigation ──────────────────────────────── */}
              <div className="grid grid-cols-3 gap-x-20 w-full pt-2">
                {hasPrev ? (
                  <button
                    onClick={goToPrev}
                    disabled={!hasPrev}
                    className={cn(
                      'flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-semibold transition-all',
                      hasPrev
                        ? 'bg-slate-800/70 hover:bg-slate-700 border-slate-700 text-slate-200'
                        : 'bg-slate-900/30 border-slate-800 text-slate-700 cursor-not-allowed'
                    )}
                  >
                    <ChevronLeft size={16} />
                    <span className="flex flex-col items-start leading-none gap-0.5">
                      <span className="text-[9px] uppercase tracking-widest font-black text-slate-500">Previous</span>
                      <span className="truncate max-w-[120px]">
                        {hasPrev ? allLessons[currentIndex - 1].title : ''}
                      </span>
                    </span>
                  </button>
                ):(
                  <div></div>
                )}

                {/* Lesson dot indicators */}
                <div className="flex items-center justify-center w-full gap-1.5">
                  {allLessons.slice(
                    Math.max(0, currentIndex - 1),
                    Math.min(allLessons.length, currentIndex + 2)
                  ).map((l, i) => {
                    const absIdx = Math.max(0, currentIndex - 1) + i;
                    const isCurrentDot = absIdx === currentIndex;
                    const isDoneDot = completedIds.has(l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() => setSelectedLesson(l)}
                        title={l.title}
                        className={cn(
                          'rounded-full transition-all duration-200',
                          isCurrentDot
                            ? 'w-5 h-2 bg-blue-400'
                            : isDoneDot
                            ? 'w-2 h-2 bg-emerald-500 hover:bg-emerald-400'
                            : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'
                        )}
                      />
                    );
                  })}
                </div>

                {hasNext && (
                  <button
                    onClick={goToNext}
                    className={cn(
                      'flex items-center justify-end gap-2 px-5 py-3 rounded-lg border text-sm font-semibold transition-all',
                      'bg-slate-800/70 hover:bg-slate-700 border-slate-700 text-slate-200 hover:translate-x-0.5'
                    )}
                  >
                    <span className="flex flex-col justify-end items-end leading-none gap-0.5">
                      <span className="text-[9px] uppercase tracking-widest font-black text-slate-500">Next</span>
                      <span className="truncate max-w-[120px]">
                        {allLessons[currentIndex + 1].title}
                      </span>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
};
