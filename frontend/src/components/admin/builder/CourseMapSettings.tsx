import React, { useEffect, useState } from "react";
import { CourseMaster } from "@/types/courses.types";
import { CourseSkillMapping, CourseTagMap } from "@/types/courses.types";
import { Target, Tag as TagIcon, BarChart, Plus, X, Loader2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSkills, useSkillLevels, useTags, ADMIN_QUERY_KEYS } from "@/queries/admin/useAdminMasters";
import { courseApi } from "@/api/course-api";
import { skillApi } from "@/api/skill-api";
import { SearchableDropdown } from "./SearchableDropdown";

interface CourseMapSettingsProps {
  course: CourseMaster;
}

export const CourseMapSettings: React.FC<CourseMapSettingsProps> = ({ course }) => {
  const queryClient = useQueryClient();

  // ── Live data from API ──────────────────────────────────────────────────
  const { data: skillsRes, isError: skillsError } = useSkills();
  const { data: levelsRes, isError: levelsError } = useSkillLevels();
  const { data: tagsRes } = useTags();

  const allSkills = skillsRes?.results ?? [];
  const allLevels = levelsRes?.results ?? [];
  const allTags   = tagsRes?.results ?? [];

  // ── Local mapped state (initialised from course prop) ───────────────────
  const [mappedSkills, setMappedSkills] = useState<CourseSkillMapping[]>(course.skills ?? []);
  const [mappedTags,   setMappedTags]   = useState<CourseTagMap[]>(course.tags ?? []);

  // Sync when parent refetches course (e.g. after curriculum sync)
  useEffect(() => { setMappedSkills(course.skills ?? []); }, [course.skills]);
  useEffect(() => { setMappedTags(course.tags ?? []); },   [course.tags]);

  // ── Selection state ─────────────────────────────────────────────────────
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [selectedTagId,   setSelectedTagId]   = useState<number | null>(null);

  // ── Mutation loading / error ─────────────────────────────────────────────
  const [skillAdding,  setSkillAdding]  = useState(false);
  const [tagAdding,    setTagAdding]    = useState(false);
  const [skillError,   setSkillError]   = useState<string | null>(null);
  const [tagError,     setTagError]     = useState<string | null>(null);

  // ── Derived helpers ──────────────────────────────────────────────────────
  const mappedSkillIds = mappedSkills.map((s) => s.skill);
  const mappedTagIds   = mappedTags.map((t) => t.tag);

  const canAddSkill =
    selectedSkillId !== null &&
    selectedLevelId !== null &&
    !mappedSkillIds.includes(selectedSkillId) &&
    !skillAdding &&
    !skillsError &&
    !levelsError &&
    allLevels.length > 0;

  const canAddTag =
    selectedTagId !== null &&
    !mappedTagIds.includes(selectedTagId) &&
    !tagAdding;

  // ── Skill mutations ──────────────────────────────────────────────────────
  const handleAddSkill = async () => {
    if (!canAddSkill || selectedSkillId === null || selectedLevelId === null) return;
    setSkillError(null);

    const skill = allSkills.find((s) => s.id === selectedSkillId);
    const level = allLevels.find((l) => l.id === selectedLevelId);
    if (!skill || !level) return;

    // Optimistic
    const optimistic: CourseSkillMapping = {
      id: -Date.now(),
      course: course.id,
      skill: skill.id,
      skill_name: skill.skill_name,
      target_level: level.id,
      target_level_name: level.level_name,
      created_at: new Date().toISOString(),
    };
    setMappedSkills((prev) => [...prev, optimistic]);
    setSelectedSkillId(null);
    setSelectedLevelId(null);
    setSkillAdding(true);

    const result = await courseApi.addSkillMapping({
      course: course.id,
      skill: skill.id,
      target_level: level.id,
    });

    setSkillAdding(false);
    if (result === null) {
      // Revert
      setMappedSkills((prev) => prev.filter((s) => s.id !== optimistic.id));
      setSkillError("Failed to save skill mapping. Please try again.");
    } else {
      // Replace optimistic with real record
      setMappedSkills((prev) =>
        prev.map((s) => (s.id === optimistic.id ? (result as CourseSkillMapping) : s))
      );
    }
  };

  const handleRemoveSkill = async (mapping: CourseSkillMapping) => {
    setSkillError(null);
    setMappedSkills((prev) => prev.filter((s) => s.id !== mapping.id));
    const result = await courseApi.removeSkillMapping(mapping.id);
    if (result === null) {
      setMappedSkills((prev) => [...prev, mapping]);
      setSkillError("Failed to remove skill mapping. Please try again.");
    }
  };

  // ── Tag mutations ────────────────────────────────────────────────────────
  const handleAddTag = async () => {
    if (!canAddTag || selectedTagId === null) return;
    setTagError(null);

    const tag = allTags.find((t) => t.id === selectedTagId);
    if (!tag) return;

    const optimistic: CourseTagMap = {
      id: -Date.now(),
      course: course.id,
      tag: tag.id,
      tag_name: tag.tag_name,
      created_at: new Date().toISOString(),
    };
    setMappedTags((prev) => [...prev, optimistic]);
    setSelectedTagId(null);
    setTagAdding(true);

    const result = await courseApi.addTagMapping({ course: course.id, tag: tag.id });

    setTagAdding(false);
    if (result === null) {
      setMappedTags((prev) => prev.filter((t) => t.id !== optimistic.id));
      setTagError("Failed to save tag. Please try again.");
    } else {
      setMappedTags((prev) =>
        prev.map((t) => (t.id === optimistic.id ? (result as CourseTagMap) : t))
      );
    }
  };

  const handleRemoveTag = async (mapping: CourseTagMap) => {
    setTagError(null);
    setMappedTags((prev) => prev.filter((t) => t.id !== mapping.id));
    const result = await courseApi.removeTagMapping(mapping.id);
    if (result === null) {
      setMappedTags((prev) => [...prev, mapping]);
      setTagError("Failed to remove tag. Please try again.");
    }
  };

  // ── Create-and-map handlers ──────────────────────────────────────────────
  /** Creates a new skill in the DB, refreshes the skills list, then auto-selects it. */
  const handleCreateSkill = async (name: string) => {
    // Generate a simple code from the name: uppercase, spaces → underscores
    const code = name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "").slice(0, 50);
    const result = await skillApi.createSkill({ skill_name: name, skill_code: code });
    if (result !== null) {
      await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.skills });
      setSelectedSkillId((result as { id: number }).id);
    } else {
      setSkillError("Failed to create skill. Please try again.");
    }
  };

  /** Creates a new tag in the DB, refreshes the tags list, then auto-selects it. */
  const handleCreateTag = async (name: string) => {
    const result = await courseApi.createTag({ tag_name: name });
    if (result !== null) {
      await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.courseTags });
      setSelectedTagId((result as { id: number }).id);
    } else {
      setTagError("Failed to create tag. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#161925] text-slate-300">
      <div className="p-4 space-y-5 flex-1 overflow-y-auto no-scrollbar">

        {/* ── Core Properties ── */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-2 flex items-center gap-2">
            <BarChart size={12} /> Core Properties
          </h4>
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
                labelKey="skill_name"
                valueKey="id"
                value={selectedSkillId}
                onChange={setSelectedSkillId}
                placeholder="Search skills..."
                disabledIds={mappedSkillIds}
                disabled={skillsError || levelsError}
                onCreateOption={handleCreateSkill}
                createLabel="Create skill"
              />
            </div>
            <div className="w-28">
              {allLevels.length === 0 && !levelsError ? (
                <div className="flex items-center justify-center h-full text-[9px] text-slate-500 italic">
                  No levels
                </div>
              ) : (
                <SearchableDropdown
                  items={allLevels as unknown as Record<string, unknown>[]}
                  labelKey="level_name"
                  valueKey="id"
                  value={selectedLevelId}
                  onChange={setSelectedLevelId}
                  placeholder="Level..."
                  disabled={levelsError}
                />
              )}
            </div>
            <button
              onClick={handleAddSkill}
              disabled={!canAddSkill}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 rounded flex items-center justify-center transition"
            >
              {skillAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>

          {skillError && (
            <p className="text-[10px] text-red-400 flex items-center gap-1">
              <AlertCircle size={10} /> {skillError}
            </p>
          )}

          {mappedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {mappedSkills.map((s) => (
                <div
                  key={s.id}
                  className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold rounded flex items-center gap-1"
                >
                  {s.skill_name}
                  <span className="text-blue-400 font-medium lowercase italic">
                    ({s.target_level_name})
                  </span>
                  <button
                    onClick={() => handleRemoveSkill(s)}
                    className="text-slate-500 hover:text-red-400 ml-1"
                  >
                    <X size={10} />
                  </button>
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
                labelKey="tag_name"
                valueKey="id"
                value={selectedTagId}
                onChange={setSelectedTagId}
                placeholder="Search tags..."
                disabledIds={mappedTagIds}
                onCreateOption={handleCreateTag}
                createLabel="Create tag"
              />
            </div>
            <button
              onClick={handleAddTag}
              disabled={!canAddTag}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 rounded flex items-center justify-center transition"
            >
              {tagAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>

          {tagError && (
            <p className="text-[10px] text-red-400 flex items-center gap-1">
              <AlertCircle size={10} /> {tagError}
            </p>
          )}

          {mappedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mappedTags.map((t) => (
                <span
                  key={t.id}
                  className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold rounded flex items-center gap-1"
                >
                  #{t.tag_name || "tag"}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="text-slate-500 hover:text-red-400 ml-1"
                  >
                    <X size={10} />
                  </button>
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
