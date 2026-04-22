import { useState, useEffect } from 'react';
import { CourseContent, CourseDetail, CourseSection, CourseLesson } from '@/types/courses.types';
import { CurriculumNode } from '@/components/admin/builder/CurriculumTree';
import { CurriculumSyncPayload } from '@/api/course-api';

const mapLessonContentToNode = (contents?: CourseContent[]) => {
  const primaryContent = contents?.[0];

  if (!primaryContent) {
    return {};
  }

  const isDocumentContent = ['PDF', 'PPT', 'DOCUMENT'].includes(primaryContent.content_type);

  return {
    contentId: primaryContent.id,
    contentType: primaryContent.content_type,
    contentUrl: primaryContent.content_url || '',
    fileRefId: primaryContent.file_ref ?? null,
    fileUrl: primaryContent.file_url ?? null,
    filePath: primaryContent.file_path || '',
    videoUrl: primaryContent.content_type === 'VIDEO' ? primaryContent.content_url || '' : '',
    docMetadata: isDocumentContent
      ? {
          name:
            primaryContent.file_path?.split('/').pop() ||
            primaryContent.file_url?.split('/').pop() ||
            `${primaryContent.content_type.toLowerCase()}-content`,
          size: 'Unknown size',
        }
      : null,
  };
};

export const useCurriculumDraft = (initialCourse?: CourseDetail | null) => {
  const [nodes, setNodes] = useState<CurriculumNode[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = () => setIsDirty(true);
  const resetDirty = () => setIsDirty(false);
  // Initialize draft from backend response
  useEffect(() => {
    if (initialCourse && initialCourse.sections) {
      const mappedNodes: CurriculumNode[] = initialCourse.sections.map((sec: CourseSection) => ({
        id: `section-${sec.id}`,
        dbId: sec.id,
        type: 'SECTION',
        title: sec.section_title || 'Untitled Section',
        description: sec.description || '',
        children: (sec.lessons || []).map((les: CourseLesson) => ({
          id: `lesson-${les.id}`,
          dbId: les.id,
          type: 'LESSON',
          title: les.lesson_title || 'Untitled Lesson',
          estimatedDurationMinutes: les.estimated_duration_minutes ?? 15,
          requireMarkComplete: les.require_mark_complete ?? false,
          assessmentId: les.assessment_id ?? undefined,
          ...mapLessonContentToNode(les.contents),
        }))
      }));
      setNodes(mappedNodes);
    }
  }, [initialCourse]);

  const addSection = (title: string, dbId?: number) => {
    const newId = dbId ? `section-${dbId}` : `new-sec-${Date.now()}`;
    const newNode: CurriculumNode = {
      id: newId,
      dbId,
      title,
      type: 'SECTION',
      children: [],
    };
    setNodes(prev => [...prev, newNode]);
    markDirty();
    return newNode;
  };

  const addLesson = (sectionId: string, title: string, contentType: any, dbId?: number) => {
    const newId = dbId ? `lesson-${dbId}` : `new-les-${Date.now()}`;
    const newNode: CurriculumNode = {
      id: newId,
      dbId,
      type: 'LESSON',
      title,
      estimatedDurationMinutes: 15,
      contentType,
    };
    
    setNodes(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          children: [...(sec.children || []), newNode]
        };
      }
      return sec;
    }));
    markDirty();
    return newNode;
  };

  const removeNode = (id: string, type: 'SECTION' | 'LESSON', parentId?: string) => {
    if (type === 'SECTION') {
      setNodes(prev => prev.filter(n => n.id !== id));
    } else if (parentId) {
      setNodes(prev => prev.map(sec => {
        if (sec.id === parentId) {
          return {
            ...sec,
            children: (sec.children || []).filter(c => c.id !== id)
          };
        }
        return sec;
      }));
    }
    markDirty();
  };
  
  const updateNode = (id: string, type: 'SECTION' | 'LESSON', updates: Partial<CurriculumNode>, parentId?: string) => {
    if (type === 'SECTION') {
      setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    } else if (parentId) {
      setNodes(prev => prev.map(sec => {
        if (sec.id === parentId) {
          return {
            ...sec,
            children: (sec.children || []).map(c => c.id === id ? { ...c, ...updates } : c)
          };
        }
        return sec;
      }));
    }
    markDirty();
  };

  const toCurriculumSyncPayload = (): CurriculumSyncPayload => {
    const buildLessonContents = (lesson: CurriculumNode) => {
      const persistedType = lesson.contentType && lesson.contentType !== 'SCORM' ? lesson.contentType : undefined;
      const hasPersistableValue =
        persistedType === 'QUIZ' ||
        ((persistedType === 'VIDEO' || persistedType === 'LINK') && !!lesson.contentUrl?.trim()) ||
        ((persistedType === 'PDF' || persistedType === 'PPT' || persistedType === 'DOCUMENT') && !!lesson.fileRefId);

      if (!persistedType || !hasPersistableValue) {
        return [];
      }

      return [{
        ...(lesson.contentId ? { id: lesson.contentId } : {}),
        content_type: persistedType,
        content_url: lesson.contentUrl?.trim() || '',
        file_ref: lesson.fileRefId ?? null,
        display_order: 1,
      }];
    };

    return {
      sections: nodes.map((section, sectionIndex) => ({
        ...(section.dbId ? { id: section.dbId } : {}),
        section_title: section.title,
        description: section.description || '',
        display_order: sectionIndex + 1,
        lessons: (section.children || []).map((lesson, lessonIndex) => ({
          ...(lesson.dbId ? { id: lesson.dbId } : {}),
          lesson_title: lesson.title,
          estimated_duration_minutes: lesson.estimatedDurationMinutes ?? 15,
          require_mark_complete: lesson.requireMarkComplete ?? false,
          display_order: lessonIndex + 1,
          contents: buildLessonContents(lesson),
        })),
      })),
    };
  };

  // Expects the entire new tree after a drag/drop reorder
  const updateTree = (newTree: CurriculumNode[]) => {
    setNodes(newTree);
    markDirty();
  };

  const duplicateLesson = (lessonId: string) => {
    setNodes(prev => {
      const newNodes = JSON.parse(JSON.stringify(prev)) as CurriculumNode[];
      for (const section of newNodes) {
        const idx = section.children?.findIndex(c => c.id === lessonId) ?? -1;
        if (idx === -1) continue;
        const source = section.children![idx];
        const copy: CurriculumNode = {
          ...source,
          id: `new-les-${Date.now()}`,
          dbId: undefined,
          assessmentId: undefined,
          title: `${source.title} (Copy)`,
        };
        section.children!.splice(idx + 1, 0, copy);
        break;
      }
      return newNodes;
    });
    markDirty();
  };

  return {
    nodes,
    isDirty,
    resetDirty,
    addSection,
    addLesson,
    removeNode,
    updateNode,
    updateTree,
    duplicateLesson,
    toCurriculumSyncPayload,
  };
};
