import React, { useEffect, useState } from "react";
import { CourseMaster } from "@/types/courses.types";
import { CourseSkillMapping, CourseTagMap } from "@/types/courses.types";
import {
  Target, Tag as TagIcon, BarChart, Plus, X, Loader2, AlertCircle,
  Pencil, Check, ChevronDown,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSkills, useSkillLevels, useTags, useCourseCategories, ADMIN_QUERY_KEYS } from "@/queries/admin/useAdminMasters";
import { courseApi } from "@/api/course-api";
import { skillApi } from "@/api/skill-api";
import { SearchableDropdown } from "./SearchableDropdown";
import { cn } from "@/utils/cn";

const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'DOCTOR', label: 'Expert' },
] as const;

interface CourseMapSettingsProps {
  course: CourseMaster;
  onCourseUpdated?: (updated: CourseMaster) => void;
}

export const CourseMapSettings: React.FC<CourseMapSettingsProps> = ({ course, onCourseUpdated }) => {
  const queryClient = useQueryClient();

  // ── Live data from API ──────────────────────────────────────────────────
  const { data: skillsRes, isError: skillsError } = useSkills();
  const { data: levelsRes, isError: levelsError } = useSkillLevels();
  const { data: tagsRes } = useTags();
  const { data: categoriesRes } = useCourseCategories({ page_size: 100 });

  const allSkills = skillsRes?.results ?? [];
  const allLevels = levelsRes?.results ?? [];
  const allTags = tagsRes?.results ?? [];
  const allCategories = categoriesRes?.results ?? [];

  // ── Local mapped state ───────────────────────────────────────────────────
  const [mappedSkills, setMappedSkills] = useState<CourseSkillMapping[]>(course.skills ?? []);
  const [mappedTags, setMappedTags] = useState<CourseTagMap[]>(course.tags ?? []);

  useEffect(() => { setMappedSkills(course.skills ?? []); }, [course.skills]);
  useEffect(() => { setMappedTags(course.tags ?? []); }, [course.tags]);

  // ── Course metadata edit state ───────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(course.course_title);
  const [editDescription, setEditDescription] = useState(course.description);
  const [editCategoryId, setEditCategoryId] = useState<number>(course.category);
  const [editDifficulty, setEditDifficulty] = useState(course.difficulty_level ?? 'BEGINNER');
  const [editDuration, setEditDuration] = useState(course.estimated_duration_hours);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Sync edit fields when course prop changes (e.g. after external refetch)
  useEffect(() => {
    if (!isEditing) {
      setEditTitle(course.course_title);
      setEditDescription(course.description);
      setEditCategoryId(course.category);
      setEditDifficulty(course.difficulty_level ?? 'BEGINNER');
      setEditDuration(course.estimated_duration_hours);
    }
  }, [course, isEditing]);

  const handleCancelEdit = () => {
    setEditTitle(course.course_title);
    setEditDescription(course.description);
    setEditCategoryId(course.category);
    setEditDifficulty(course.difficulty_level ?? 'BEGINNER');
    setEditDuration(course.estimated_duration_hours);
    setMetaError(null);
    setIsEditing(false);
  };

  const handleSaveMeta = async () => {
    setIsSavingMeta(true);
    setMetaError(null);
    const result = await courseApi.updateCourse(course.id, {
      course_title: editTitle,
      description: editDescription,
      category: editCategoryId,
      difficulty_level: editDifficulty as CourseMaster['difficulty_level'],
      estimated_duration_hours: editDuration,
    });
    setIsSavingMeta(false);
    if (result === null) {
      setMetaError("Failed to save course info. Please try again.");
      return;
    }
    onCourseUpdated?.(result as CourseMaster);
    setIsEditing(false);
  };

  // ── Skill / Tag selection state ──────────────────────────────────────────
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  const [skillAdding, setSkillAdding] = useState(false);
  const [tagAdding, setTagAdding] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);

  const mappedSkillIds = mappedSkills.map(s => s.skill);
  const mappedTagIds = mappedTags.map(t => t.tag);

  const canAddSkill =
    selectedSkillId !== null && selectedLevelId !== null &&
    !mappedSkillIds.includes(selectedSkillId) && !skillAdding &&
    !skillsError && !levelsError && allLevels.length > 0;

  const canAddTag = selectedTagId !== null && !mappedTagIds.includes(selectedTagId) && !tagAdding;

  const handleAddSkill = async () => {
    if (!canAddSkill || selectedSkillId === null || selectedLevelId === null) return;
    setSkillError(null);
    const skill = allSkills.find(s => s.id === selectedSkillId);
    const level = allLevels.find(l => l.id === selectedLevelId);
    if (!skill || !level) return;
    const optimistic: CourseSkillMapping = {
      id: -Date.now(), course: course.id, skill: skill.id, skill_name: skill.skill_name,
      target_level: level.id, target_level_name: level.level_name, created_at: new Date().toISOString(),
    };
    setMappedSkills(prev => [...prev, optimistic]);
    setSelectedSkillId(null); setSelectedLevelId(null); setSkillAdding(true);
    const result = await courseApi.addSkillMapping({ course: course.id, skill: skill.id, target_level: level.id });
    setSkillAdding(false);
    if (result === null) {
      setMappedSkills(prev => prev.filter(s => s.id !== optimistic.id));
      setSkillError("Failed to save skill mapping. Please try again.");
    } else {
      setMappedSkills(prev => prev.map(s => s.id === optimistic.id ? (result as CourseSkillMapping) : s));
    }
  };

  const handleRemoveSkill = async (mapping: CourseSkillMapping) => {
    setSkillError(null);
    setMappedSkills(prev => prev.filter(s => s.id !== mapping.id));
    const result = await courseApi.removeSkillMapping(mapping.id);
    if (result === null) { setMappedSkills(prev => [...prev, mapping]); setSkillError("Failed to remove skill mapping."); }
  };

  const handleAddTag = async () => {
    if (!canAddTag || selectedTagId === null) return;
    setTagError(null);
    const tag = allTags.find(t => t.id === selectedTagId);
    if (!tag) return;
    const optimistic: CourseTagMap = {
      id: -Date.now(), course: course.id, tag: tag.id, tag_name: tag.tag_name, created_at: new Date().toISOString(),
    };
    setMappedTags(prev => [...prev, optimistic]);
    setSelectedTagId(null); setTagAdding(true);
    const result = await courseApi.addTagMapping({ course: course.id, tag: tag.id });
    setTagAdding(false);
    if (result === null) {
      setMappedTags(prev => prev.filter(t => t.id !== optimistic.id));
      setTagError("Failed to save tag. Please try again.");
    } else {
      setMappedTags(prev => prev.map(t => t.id === optimistic.id ? (result as CourseTagMap) : t));
    }
  };

  const handleRemoveTag = async (mapping: CourseTagMap) => {
    setTagError(null);
    setMappedTags(prev => prev.filter(t => t.id !== mapping.id));
    const result = await courseApi.removeTagMapping(mapping.id);
    if (result === null) { setMappedTags(prev => [...prev, mapping]); setTagError("Failed to remove tag."); }
  };

  const handleCreateSkill = async (name: string) => {
    const code = name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "").slice(0, 50);
    const result = await skillApi.createSkill({ skill_name: name, skill_code: code });
    if (result !== null) {
      await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.skills });
      setSelectedSkillId((result as { id: number }).id);
    } else { setSkillError("Failed to create skill."); }
  };

  const handleCreateTag = async (name: string) => {
    const result = await courseApi.createTag({ tag_name: name });
    if (result !== null) {
      await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.courseTags });
      setSelectedTagId((result as { id: number }).id);
    } else { setTagError("Failed to create tag."); }
  };

  return (
    <div className="flex flex-col h-full bg-[#161925] text-slate-300">
      <div className="p-4 space-y-5 flex-1 overflow-y-auto no-scrollbar">

        {/* ── Core Properties / Edit Course Info ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <BarChart size={12} /> Course Info
            </h4>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Pencil size={10} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSavingMeta}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMeta}
                  disabled={isSavingMeta}
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {isSavingMeta ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                  Save
                </button>
              </div>
            )}
          </div>

          {metaError && (
            <p className="text-[10px] text-red-400 flex items-center gap-1">
              <AlertCircle size={10} /> {metaError}
            </p>
          )}

          {!isEditing ? (
            /* Read-only view */
            <div className="grid text-xs">
              <div className="flex justify-between items-center bg-slate-800/30 p-2 rounded-t">
                <span className="text-slate-500">Category</span>
                <span className="font-medium text-slate-200">{course.category_name || "-"}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/30 p-2">
                <span className="text-slate-500">Difficulty</span>
                <span className="font-medium text-slate-200">{course.difficulty_level || "-"}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/30 p-2 rounded-b">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium text-slate-200">{course.estimated_duration_hours}h</span>
              </div>
            </div>
          ) : (
            /* Edit form */
            <div className="space-y-3">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition resize-none"
                  placeholder="Describe what learners will gain..."
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Category</label>
                <div className="relative">
                  <select
                    value={editCategoryId}
                    onChange={e => setEditCategoryId(Number(e.target.value))}
                    className="w-full appearance-none px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 transition pr-7"
                  >
                    {allCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.category_name}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Difficulty */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Difficulty</label>
                <div className="relative">
                  <select
                    value={editDifficulty}
                    onChange={e => setEditDifficulty(e.target.value as CourseMaster['difficulty_level'])}
                    className="w-full appearance-none px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 transition pr-7"
                  >
                    {DIFFICULTY_OPTIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Duration */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Duration (hours)</label>
                <input
                  type="number"
                  min={0}
                  value={editDuration}
                  onChange={e => setEditDuration(Math.max(0, parseInt(e.target.value) || 0))}
                  className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Course Outcomes (Skills) ── */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Target size={12} /> Course Outcomes
          </h4>

          {(skillsError || levelsError) && (
            <p className="text-[10px] text-red-400 flex items-center gap-1">
              <AlertCircle size={10} /> Failed to load skills or levels.
            </p>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <SearchableDropdown
                items={allSkills as unknown as Record<string, unknown>[]}
                labelKey="skill_name" valueKey="id"
                value={selectedSkillId} onChange={setSelectedSkillId}
                placeholder="Search skills..." disabledIds={mappedSkillIds}
                disabled={skillsError || levelsError}
                onCreateOption={handleCreateSkill} createLabel="Create skill"
              />
            </div>
            <div className="w-28">
              {allLevels.length === 0 && !levelsError ? (
                <div className="flex items-center justify-center h-full text-[9px] text-slate-500 italic">No levels</div>
              ) : (
                <SearchableDropdown
                  items={allLevels as unknown as Record<string, unknown>[]}
                  labelKey="level_name" valueKey="id"
                  value={selectedLevelId} onChange={setSelectedLevelId}
                  placeholder="Level..." disabled={levelsError}
                />
              )}
            </div>
            <button
              onClick={handleAddSkill} disabled={!canAddSkill}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 rounded flex items-center justify-center transition"
            >
              {skillAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>

          {skillError && (
            <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle size={10} /> {skillError}</p>
          )}

          {mappedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {mappedSkills.map(s => (
                <div key={s.id} className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold rounded flex items-center gap-1">
                  {s.skill_name}
                  <span className="text-blue-400 font-medium lowercase italic">({s.target_level_name})</span>
                  <button onClick={() => handleRemoveSkill(s)} className="text-slate-500 hover:text-red-400 ml-1"><X size={10} /></button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No learning skills mapped yet.</p>
          )}
        </div>

        {/* ── Tags ── */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <TagIcon size={12} /> Tags
          </h4>

          <div className="flex gap-2">
            <div className="flex-1">
              <SearchableDropdown
                items={allTags as unknown as Record<string, unknown>[]}
                labelKey="tag_name" valueKey="id"
                value={selectedTagId} onChange={setSelectedTagId}
                placeholder="Search tags..." disabledIds={mappedTagIds}
                onCreateOption={handleCreateTag} createLabel="Create tag"
              />
            </div>
            <button
              onClick={handleAddTag} disabled={!canAddTag}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 rounded flex items-center justify-center transition"
            >
              {tagAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>

          {tagError && (
            <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle size={10} /> {tagError}</p>
          )}

          {mappedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mappedTags.map(t => (
                <span key={t.id} className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold rounded flex items-center gap-1">
                  #{t.tag_name || "tag"}
                  <button onClick={() => handleRemoveTag(t)} className="text-slate-500 hover:text-red-400 ml-1"><X size={10} /></button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No course tags applied.</p>
          )}
        </div>

      </div>
    </div>
  );
};
