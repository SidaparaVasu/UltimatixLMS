import React, { useState, useEffect } from 'react';
import {
  Video, FileText, Presentation, Link as LinkIcon,
  LayoutList, ChevronDown, ChevronRight, CheckCircle,
  FolderOpen, FolderClosed, MonitorPlay, ExternalLink,
  BookOpen, X
} from 'lucide-react';
import { CurriculumNode } from '@/components/admin/builder/CurriculumTree';
import { VideoViewer } from './VideoViewer';
import { DocumentViewer } from './DocumentViewer';
import { QuizPlayer } from './QuizPlayer';
import { cn } from '@/utils/cn';

interface LearnerPreviewPaneProps {
  nodes: CurriculumNode[];
  courseTitle: string;
  onExitPreview: () => void;
}

// ─── Flatten all lessons in order for completion tracking ────────────────────
const getAllLessons = (nodes: CurriculumNode[]): CurriculumNode[] =>
  nodes.flatMap(n => (n.type === 'SECTION' ? (n.children || []) : [n]));

// ─── Content type icon helper ─────────────────────────────────────────────────
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

/**
 * LearnerPreviewPane — Full-screen learner-facing course preview overlay.
 * 2-column layout: read-only curriculum sidebar + dynamic content area.
 * Uses draft-state data only (no API calls) to render VideoViewer,
 * DocumentViewer, and QuizPlayer for all supported content formats.
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

  // Auto-select first lesson on mount or if nodes change
  useEffect(() => {
    if (!selectedLesson && allLessons.length > 0) {
      setSelectedLesson(allLessons[0]);
    }
  }, [nodes]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const markComplete = (id: string) => {
    setCompletedIds(prev => new Set([...prev, id]));
    // Auto-advance to next lesson
    const idx = allLessons.findIndex(l => l.id === id);
    if (idx !== -1 && idx < allLessons.length - 1) {
      setSelectedLesson(allLessons[idx + 1]);
    }
  };

  const totalLessons = allLessons.length;
  const completedCount = completedIds.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0c0e16] text-slate-200">
      
      {/* ── Preview Header ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between h-14 px-5 bg-[#141620] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
            <MonitorPlay size={12} />
            Learner Preview
          </div>
          <span className="text-sm font-semibold text-white truncate max-w-xs">{courseTitle}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Overall progress */}
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
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

      {/* ── Main Body ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Curriculum Sidebar ─────────────────────────────────────── */}
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
              nodes.map(section => (
                <div key={section.id} className="mt-1">
                  {/* Section row */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-800/60 transition-colors"
                  >
                    {expandedSections.has(section.id)
                      ? <FolderOpen size={13} className="text-amber-500 shrink-0" />
                      : <FolderClosed size={13} className="text-amber-500 shrink-0" />
                    }
                    <span className="text-[11px] font-black text-slate-300 flex-1 truncate uppercase tracking-wide">
                      {section.title}
                    </span>
                    {expandedSections.has(section.id)
                      ? <ChevronDown size={12} className="text-slate-600 shrink-0" />
                      : <ChevronRight size={12} className="text-slate-600 shrink-0" />
                    }
                  </button>

                  {/* Lessons */}
                  {expandedSections.has(section.id) && (
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
                              {isDone ? (
                                <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                              ) : (
                                <LessonIcon contentType={lesson.contentType} />
                              )}
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
              ))
            )}
          </div>
        </aside>

        {/* ── Right: Content Area ───────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto no-scrollbar">
          {!selectedLesson ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
              <BookOpen size={40} className="opacity-20" />
              <p className="text-sm">Select a lesson from the sidebar to begin.</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">

              {/* Lesson header */}
              <div className="space-y-2 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <LessonIcon contentType={selectedLesson.contentType} size={16} />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    {selectedLesson.contentType || 'Lesson'}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight leading-snug">
                  {selectedLesson.title}
                </h1>
              </div>

              {/* ── Content Renderer ──────────────────────────────────────── */}

              {/* VIDEO */}
              {selectedLesson.contentType === 'VIDEO' && (
                <VideoViewer
                  videoUrl={selectedLesson.videoUrl}
                  title={selectedLesson.title}
                />
              )}

              {/* PDF */}
              {selectedLesson.contentType === 'PDF' && (
                <DocumentViewer
                  contentType="PDF"
                  docMetadata={selectedLesson.docMetadata}
                />
              )}

              {/* PPT */}
              {selectedLesson.contentType === 'PPT' && (
                <DocumentViewer
                  contentType="PPT"
                  docMetadata={selectedLesson.docMetadata}
                />
              )}

              {/* QUIZ */}
              {selectedLesson.contentType === 'QUIZ' && (
                <QuizPlayer
                  quizData={(selectedLesson as any).quizData}
                  lessonTitle={selectedLesson.title}
                />
              )}

              {/* LINK */}
              {selectedLesson.contentType === 'LINK' && (
                <div className="flex flex-col items-center justify-center h-64 rounded-xl bg-slate-900/50 border border-dashed border-slate-700 text-slate-400 gap-4">
                  <LinkIcon size={36} className="opacity-30" />
                  <p className="text-sm font-medium">External resource link.</p>
                  <p className="text-xs text-slate-600">URL will be available after backend integration.</p>
                </div>
              )}

              {/* No content type set yet */}
              {!selectedLesson.contentType && (
                <div className="flex flex-col items-center justify-center h-64 rounded-xl bg-slate-900/50 border border-dashed border-slate-700 text-slate-600 gap-3">
                  <MonitorPlay size={36} className="opacity-20" />
                  <p className="text-sm">This lesson has no content added yet.</p>
                </div>
              )}

              {/* ── Mark Complete CTA ──────────────────────────────────────── */}
              {selectedLesson.contentType !== 'QUIZ' && (
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    {completedIds.has(selectedLesson.id)
                      ? '✓ Marked as complete'
                      : 'Finished reviewing this lesson?'}
                  </p>
                  {!completedIds.has(selectedLesson.id) ? (
                    <button
                      onClick={() => markComplete(selectedLesson.id)}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-900/20 hover:-translate-y-0.5 active:translate-y-0"
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

            </div>
          )}
        </main>
      </div>
    </div>
  );
};
