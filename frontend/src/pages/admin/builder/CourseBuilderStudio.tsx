import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, PlayCircle, Settings, LayoutTemplate, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { courseApi } from '@/api/course-api';
import { useCurriculumDraft } from './useCurriculumDraft';
import { CurriculumTree, CurriculumNode } from '@/components/admin/builder/CurriculumTree';
import { SectionEditor } from '@/components/admin/builder/SectionEditor';
import { LessonEditor } from '@/components/admin/builder/LessonEditor';
import { ElementProperties } from '@/components/admin/builder/ElementProperties';
import { CourseMapSettings } from '@/components/admin/builder/CourseMapSettings';
import { LearnerPreviewPane } from '@/components/admin/builder/preview/LearnerPreviewPane';

const CourseBuilderStudio: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch course details
  const { data: courseRes, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'courses', id],
    queryFn: () => courseApi.getCourseDetails(Number(id)),
    enabled: !!id,
  });

  const course = courseRes;
  const draft = useCurriculumDraft(course);

  // Layout state
  const [activePane, setActivePane] = useState<'editor' | 'settings'>('settings');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  // Track course title separately so edits in CourseMapSettings update the header instantly
  const [courseTitle, setCourseTitle] = useState(course?.course_title ?? '');

  useEffect(() => {
    if (course?.course_title) setCourseTitle(course.course_title);
  }, [course?.course_title]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }

    for (const section of draft.nodes) {
      if (section.id === selectedNodeId) {
        return section;
      }

      const lesson = section.children?.find((child) => child.id === selectedNodeId);
      if (lesson) {
        return lesson;
      }
    }

    return null;
  }, [draft.nodes, selectedNodeId]);

  // ── Unsaved Changes Guard ──────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (draft.isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome to show the native dialog
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [draft.isDirty]);

  useEffect(() => {
    if (selectedNodeId && !selectedNode) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, selectedNode]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
          <p className="text-sm font-medium text-slate-400">Loading Studio...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-red-400">Course not found or access denied.</p>
          <button 
            onClick={() => navigate('/admin/courses')}
            className="px-4 py-2 bg-slate-800 rounded hover:bg-slate-700 transition"
          >
            Return to Master Hub
          </button>
        </div>
      </div>
    );
  }

  const handleCreateNode = (type: 'SECTION' | 'LESSON', parentId?: string) => {
    if (type === 'SECTION') {
      const newNode = draft.addSection('New Section');
      setSelectedNodeId(newNode.id);
    } else if (parentId) {
      const newNode = draft.addLesson(parentId, 'New Lesson', undefined);
      setSelectedNodeId(newNode.id);
    }
  };

  const handleDeleteNode = (node: CurriculumNode) => {
    draft.removeNode(node.id, node.type, node.type === 'LESSON' ? getParentSectionId(node.id) : undefined);
    if (selectedNodeId === node.id) {
      setSelectedNodeId(null);
    }
  };

  // Helper to find parent section for a lesson
  const getParentSectionId = (lessonId: string) => {
      for(const section of draft.nodes) {
          if (section.children?.find(l => l.id === lessonId)) {
              return section.id;
          }
      }
      return undefined;
  };

  const handleSaveNode = (id: string, updates: Partial<CurriculumNode>) => {
      const isSection = draft.nodes.some(n => n.id === id);
      const type: 'SECTION' | 'LESSON' = isSection ? 'SECTION' : 'LESSON';
      const parentId = isSection ? undefined : getParentSectionId(id);
      if (Object.keys(updates).length > 0) {
        draft.updateNode(id, type, updates, parentId);
      }
  };

  const handleDuplicate = (node: CurriculumNode) => {
    if (node.type !== 'LESSON') return;
    draft.duplicateLesson(node.id);
  };

  const handleCourseUpdated = (updated: import('@/types/courses.types').CourseMaster) => {
    setCourseTitle(updated.course_title);
  };

  const handlePublish = async () => {
    if (!id || !draft.isDirty) {
      return;
    }

    setIsPublishing(true);
    try {
      const result = await courseApi.syncCurriculum(Number(id), draft.toCurriculumSyncPayload());
      if (result !== null) {
        await refetch();
        draft.resetDirty();
      }
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0f111a] text-slate-200 font-sans selection:bg-blue-500/30">

      {/* ── Learner Preview Overlay (fullscreen, replaces IDE) ── */}
      {isPreviewMode && (
        <LearnerPreviewPane
          nodes={draft.nodes}
          courseTitle={course.course_title}
          onExitPreview={() => setIsPreviewMode(false)}
        />
      )}

      {/* ── IDE (hidden when preview is active) ── */}
      <div className={isPreviewMode ? 'hidden' : 'contents'}>

      {/* ── Studio Header ── */}
      <header className="flex items-center justify-between h-14 px-4 bg-[#1a1d27] border-b border-slate-800/50 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/courses')}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Back to Hub"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white tracking-tight">
                {courseTitle}
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-blue-500/20 text-blue-400">
                {course.course_code}
              </span>
            </div>
            <p className="text-[11px] flex items-center gap-1.5 transition-colors">
              {draft.isDirty ? (
                <>
                  <AlertCircle size={11} className="text-amber-400" />
                  <span className="text-amber-400 font-semibold">Changes Pending</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-500">Draft saved locally</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPreviewMode(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded transition border border-transparent hover:border-slate-600"
          >
            <PlayCircle size={14} />
            Preview
          </button>
          <button
            onClick={handlePublish}
            disabled={!draft.isDirty || isPublishing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded shadow-lg shadow-blue-900/20 transition"
          >
            <Save size={14} />
            {isPublishing ? 'Publishing...' : 'Publish Changes'}
          </button>
        </div>
      </header>

      {/* ── Studio Workspace ── */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* Left Pane: Curriculum Tree */}
        <CurriculumTree 
          nodes={draft.nodes}
          selectedNodeId={selectedNodeId || undefined}
          onSelect={(node) => { setSelectedNodeId(node.id); setActivePane('editor'); }}
          onAdd={handleCreateNode}
          onReorder={draft.updateTree}
          onDelete={handleDeleteNode}
          onDuplicate={handleDuplicate}
        />

        {/* Center Pane: Editor */}
        <section className="flex-1 flex flex-col bg-[#0f111a] relative z-0 overflow-hidden">
          {!selectedNode ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#0f111a] to-[#161a29]">
               <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-2xl">
                 <LayoutTemplate size={32} className="text-blue-500/50" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Canvas is Empty</h3>
               <p className="text-sm text-slate-400 text-center max-w-sm mb-8 leading-relaxed">
                 Select an item from the curriculum tree on the left to edit its contents, or add a new lesson to get started.
               </p>
               <button 
                 onClick={() => handleCreateNode('SECTION')}
                 className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all flex items-center gap-2"
               >
                 Create New Section
               </button>
            </div>
          ) : (
             <div className="h-full w-full">
               {selectedNode.type === 'SECTION' 
                  ? <SectionEditor node={selectedNode} onSave={handleSaveNode} />
                  : <LessonEditor node={selectedNode} courseId={course.id} onSave={handleSaveNode} />
               }
             </div>
          )}
        </section>

        {/* Right Pane: Properties / Settings */}
        <aside className="w-[320px] flex flex-col border-l border-slate-800/50 bg-[#161925] shrink-0 z-10">
          <div className="flex items-center gap-4 pt-3 border-b border-slate-800/50">
            <button 
              className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activePane === 'settings' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              onClick={() => setActivePane('settings')}
            >
              <Settings size={12} />
              Course Settings
            </button>
            <button 
              className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors ${activePane === 'editor' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              onClick={() => setActivePane('editor')}
            >
              Element Properties
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {activePane === 'editor' ? (
              <ElementProperties selectedNode={selectedNode} />
            ) : (
              <CourseMapSettings course={course} onCourseUpdated={handleCourseUpdated} />
            )}
          </div>
        </aside>

      </main>

      </div> {/* end IDE wrapper */}
    </div>
  );
};

export default CourseBuilderStudio;
