import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Video,
  FileText,
  Link as LinkIcon,
  Trash2,
  Copy,
  FolderClosed,
  FolderOpen,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/utils/cn";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CourseContentType } from "@/types/courses.types";

export type NodeType = "SECTION" | "LESSON";
export type ContentType = CourseContentType | "SCORM";

export interface LessonDocumentMetadata {
  name: string;
  size: string;
}

export interface CurriculumNode {
  id: string;
  dbId?: number;
  type: NodeType;
  title: string;
  contentType?: ContentType;
  children?: CurriculumNode[];
  isExpanded?: boolean;
  contentId?: number;
  contentUrl?: string;
  fileRefId?: number | null;
  fileUrl?: string | null;
  filePath?: string;
  videoUrl?: string;
  docMetadata?: LessonDocumentMetadata | null;
}

interface CurriculumTreeProps {
  nodes: CurriculumNode[];
  selectedNodeId?: string;
  onSelect: (node: CurriculumNode) => void;
  onAdd: (type: NodeType, parentId?: string) => void;
  onReorder: (nodes: CurriculumNode[]) => void;
  onDelete: (node: CurriculumNode) => void;
  onDuplicate: (node: CurriculumNode) => void;
}

/* ── Individual Sortable Node Component ── */
interface SortableItemProps {
  node: CurriculumNode;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: (e: React.MouseEvent) => void;
  onSelect: (n: CurriculumNode) => void;
  onAdd: (type: NodeType, parentId?: string) => void;
  onDelete: (n: CurriculumNode) => void;
  onDuplicate: (n: CurriculumNode) => void;
}

const SortableNode: React.FC<SortableItemProps> = ({
  node,
  isSelected,
  isExpanded,
  onToggleExpand,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: { type: node.type },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.6 : 1,
  };

  const renderIcon = () => {
    if (node.type === "SECTION") {
      return isExpanded ? <FolderOpen size={14} className="text-amber-500" /> : <FolderClosed size={14} className="text-amber-500" />;
    }
    switch (node.contentType) {
      case "VIDEO": return <Video size={14} className="text-blue-500" />;
      case "PDF": return <FileText size={14} className="text-red-500" />;
      case "PPT": return <FileText size={14} className="text-orange-500" />;
      case "QUIZ": return <FileText size={14} className="text-purple-500" />;
      default: return <LinkIcon size={14} className="text-slate-400" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 py-2 px-3 cursor-pointer transition-colors border-l-2",
        isSelected
          ? "bg-blue-500/10 border-blue-500"
          : "border-transparent hover:bg-slate-800/50 hover:border-slate-700",
        node.type === "SECTION" ? "mt-2 bg-[#1a1d27] shadow-sm border border-slate-800/50 rounded-md mx-2" : "ml-6 mr-2",
      )}
      onClick={() => onSelect(node)}
    >
      <div className="flex items-center gap-1 shrink-0">
        <div {...attributes} {...listeners} className="cursor-grab hover:bg-slate-700/50 p-0.5 rounded touch-none">
          <GripVertical size={14} className="text-slate-600 group-hover:text-slate-400" />
        </div>
        {node.type === "SECTION" && (
          <button onClick={onToggleExpand} className="p-0.5 hover:bg-slate-700/50 rounded text-slate-400">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>

      <div className={cn("flex items-center gap-2 flex-1 min-w-0 text-[11px]", node.type === "SECTION" ? "font-bold text-slate-200" : "text-slate-400 font-medium")}>
        {renderIcon()}
        <span className="truncate">{node.title}</span>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {node.type === "SECTION" && (
          <button
            onClick={(e) => { e.stopPropagation(); onAdd("LESSON", node.id); }}
            className="p-1 hover:bg-slate-700/50 rounded shadow-sm text-blue-400"
            title="Add Lesson"
          >
            <Plus size={12} />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(node); }} className="p-1 hover:bg-slate-700/50 rounded shadow-sm text-slate-400">
          <Copy size={12} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(node); }} className="p-1 hover:bg-slate-700/50 rounded shadow-sm text-red-400">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

export const CurriculumTree: React.FC<CurriculumTreeProps> = ({
  nodes,
  selectedNodeId,
  onSelect,
  onAdd,
  onReorder,
  onDelete,
  onDuplicate,
}) => {
  const getAllIds = (items: CurriculumNode[]): string[] => {
    return items.reduce((acc, item) => [...acc, item.id, ...(item.children ? getAllIds(item.children) : [])], [] as string[]);
  };

  const initialExpanded = useMemo(() => new Set(getAllIds(nodes)), [nodes]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(initialExpanded);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) newExpanded.delete(id); else newExpanded.add(id);
    setExpandedIds(newExpanded);
  };

  // Setup Dnd Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Deep clone to avoid mutating state directly
    const newNodes = JSON.parse(JSON.stringify(nodes)) as CurriculumNode[];

    // Find if the dragged item is a root section
    const activeSectionIndex = newNodes.findIndex((n) => n.id === active.id);
    const overSectionIndex = newNodes.findIndex((n) => n.id === over.id);

    if (activeSectionIndex !== -1 && overSectionIndex !== -1) {
      // It's a root level (section) reorder
      const reordered = arrayMove(newNodes, activeSectionIndex, overSectionIndex);
      onReorder(reordered);
      return;
    }

    // Otherwise, check inside children (lesson reorder)
    for (let i = 0; i < newNodes.length; i++) {
      const section = newNodes[i];
      if (section.children) {
        const activeLessonIndex = section.children.findIndex((c) => c.id === active.id);
        const overLessonIndex = section.children.findIndex((c) => c.id === over.id);

        if (activeLessonIndex !== -1 && overLessonIndex !== -1) {
          section.children = arrayMove(section.children, activeLessonIndex, overLessonIndex);
          onReorder(newNodes);
          return;
        }
      }
    }
  };

  const sectionIds = nodes.map(n => n.id);

  return (
    <div className="flex flex-col h-full bg-[#141620] border-r border-slate-800/50 w-[280px] shrink-0 text-white">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-[#141620]">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <LayoutGrid size={14} className="text-blue-500" />
          Curriculum
        </h2>
        <button
          onClick={() => onAdd("SECTION")}
          className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300"
        >
          <Plus size={12} />
          SECTION
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 custom-scrollbar no-scrollbar">
        {nodes.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              {nodes.map((section) => (
                <div key={section.id} className="flex flex-col mb-1">
                  <SortableNode
                    node={section}
                    isSelected={selectedNodeId === section.id}
                    isExpanded={expandedIds.has(section.id)}
                    onToggleExpand={(e) => toggleExpand(section.id, e)}
                    onSelect={onSelect}
                    onAdd={onAdd}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                  />

                  {/* Render children array safely inside their own SortableContext */}
                  {expandedIds.has(section.id) && section.children && section.children.length > 0 && (
                    <SortableContext
                      items={section.children.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col mt-1">
                        {section.children.map((child) => (
                          <SortableNode
                            key={child.id}
                            node={child}
                            isSelected={selectedNodeId === child.id}
                            isExpanded={false}
                            onToggleExpand={() => {}}
                            onSelect={onSelect}
                            onAdd={onAdd}
                            onDelete={onDelete}
                            onDuplicate={onDuplicate}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </div>
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <LayoutGrid size={24} className="mb-2 opacity-20" />
            <p className="text-[10px] italic">
              Curriculum is empty. Access the add button to create a structure.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

