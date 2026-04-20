import { useState, useEffect } from 'react';
import { CourseContent, CourseDetail, CourseSection, CourseLesson } from '@/types/courses.types';
import { CurriculumNode } from '@/components/admin/builder/CurriculumTree';

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
        children: (sec.lessons || []).map((les: CourseLesson) => ({
          id: `lesson-${les.id}`,
          dbId: les.id,
          type: 'LESSON',
          title: les.lesson_title || 'Untitled Lesson',
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
    
    setNodes(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          children: [...(sec.children || []), {
            id: newId,
            type: 'LESSON',
            title,
            contentType,
          }]
        };
      }
      return sec;
    }));
    markDirty();
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
  
  const updateNodeTitle = (id: string, type: 'SECTION' | 'LESSON', title: string, parentId?: string) => {
    if (type === 'SECTION') {
      setNodes(prev => prev.map(n => n.id === id ? { ...n, title } : n));
    } else if (parentId) {
      setNodes(prev => prev.map(sec => {
        if (sec.id === parentId) {
          return {
            ...sec,
            children: (sec.children || []).map(c => c.id === id ? { ...c, title } : c)
          };
        }
        return sec;
      }));
    }
    markDirty();
  };

  // Expects the entire new tree after a drag/drop reorder
  const updateTree = (newTree: CurriculumNode[]) => {
    setNodes(newTree);
    markDirty();
  };

  return {
    nodes,
    isDirty,
    resetDirty,
    addSection,
    addLesson,
    removeNode,
    updateNodeTitle,
    updateTree,
  };
};
