import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Puzzle, Plus, Pencil, Trash2, RotateCcw, AlertTriangle, Tags } from 'lucide-react';
import {
  useSkillCategories,
  useSkills,
  useSkillLevels,
  useSkillMappings,
  ADMIN_QUERY_KEYS,
} from '@/queries/admin/useAdminMasters';
import {
  SkillCategory,
  Skill,
  SkillLevel,
  skillApi,
} from '@/api/skill-api';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { SplitLayout, SidebarCard } from '@/components/ui/split-layout';
import { GridCard, ResponsiveGrid } from '@/components/ui/grid-card';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { SkillTag } from '@/components/ui/skill-tag';
import { InlineAdd } from '@/components/ui/inline-add';
import { CheckboxFilterList } from '@/components/ui/checkbox-filter-list';
import { QuickActionsList, OrderedItemList } from '@/components/ui/quick-actions';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { AdminInput, AdminToggle } from '@/components/admin/form';
import { DialogFooterActions } from '@/components/admin/form';

/* ─────────────────────────────────────────────────────────────
   ACCENT COLOURS — one per category (cycles via index)
───────────────────────────────────────────────────────────── */
const ACCENTS = [
  'var(--color-accent)',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
];

/* ─────────────────────────────────────────────────────────────
   SKELETON CARD
───────────────────────────────────────────────────────────── */
const SkeletonCard: React.FC = () => (
  <div
    style={{
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderLeft: '3px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}
  >
    <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
      <div style={{ height: '14px', width: '55%', background: 'var(--color-surface-alt)', borderRadius: '6px', marginBottom: '6px' }} className="skeleton" />
      <div style={{ height: '10px', width: '30%', background: 'var(--color-surface-alt)', borderRadius: '6px' }} className="skeleton" />
    </div>
    <div style={{ padding: 'var(--space-3) var(--space-4)', minHeight: '80px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignContent: 'flex-start' }}>
      {[60, 90, 70].map((w, i) => (
        <div key={i} style={{ height: '24px', width: `${w}px`, background: 'var(--color-surface-alt)', borderRadius: '999px' }} className="skeleton" />
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   DIALOG: Add / Edit Category
───────────────────────────────────────────────────────────── */
interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  editing: SkillCategory | null;
  onSave: (data: Partial<SkillCategory>) => void;
  isLoading?: boolean;
}
const CategoryDialog: React.FC<CategoryDialogProps> = ({ open, onClose, editing, onSave, isLoading }) => {
  const [form, setForm] = useState({ category_name: '', category_code: '', description: '', is_active: true });

  React.useEffect(() => {
    if (open) {
      setForm(editing
        ? { category_name: editing.category_name, category_code: editing.category_code, description: editing.description, is_active: editing.is_active }
        : { category_name: '', category_code: '', description: '', is_active: true }
      );
    }
  }, [open, editing]);

  const handleSave = () => {
    onSave(form);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title={editing ? 'Edit Skill Category' : 'Add Skill Category'}
      description="Skill Categories group related skills together for reporting and skill-gap analysis."
      footer={
        <DialogFooterActions
          onCancel={onClose}
          onSave={handleSave}
          isEditing={!!editing}
          label="Category"
          isSaveDisabled={!form.category_name.trim() || !form.category_code.trim()}
          isLoading={isLoading}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--space-4)' }}>
          <AdminInput label="Category Name" required value={form.category_name} onChange={v => setForm(p => ({ ...p, category_name: v }))} placeholder="e.g. Technical Skills" />
          <AdminInput label="Category Code" required value={form.category_code} onChange={v => setForm(p => ({ ...p, category_code: v.toUpperCase() }))} placeholder="e.g. TECH" />
        </div>
        <AdminInput label="Description" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} placeholder="Brief description of this category" />
        <AdminToggle label="Active Status" hint="Inactive categories are hidden from skill-gap reports." checked={form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
      </div>
    </Dialog>
  );
};

/* ─────────────────────────────────────────────────────────────
   DIALOG: Add / Edit Skill
───────────────────────────────────────────────────────────── */
interface SkillDialogProps {
  open: boolean;
  onClose: () => void;
  editing: Skill | null;
  skills: Skill[];
  onSave: (data: Partial<Skill>) => void;
  isLoading?: boolean;
}
const SkillDialog: React.FC<SkillDialogProps> = ({ open, onClose, editing, skills, onSave, isLoading }) => {
  const [form, setForm] = useState({ skill_name: '', skill_code: '', description: '', parent_skill: '', is_active: true });

  React.useEffect(() => {
    if (open) {
      setForm(editing
        ? { skill_name: editing.skill_name, skill_code: editing.skill_code, description: editing.description, parent_skill: editing.parent_skill ? String(editing.parent_skill) : '', is_active: editing.is_active }
        : { skill_name: '', skill_code: '', description: '', parent_skill: '', is_active: true }
      );
    }
  }, [open, editing]);

  const handleSave = () => {
    onSave({
      ...form,
      parent_skill: form.parent_skill ? Number(form.parent_skill) : undefined
    });
  };

  const parentOptions = skills
    .filter(s => s.id !== editing?.id && !s.parent_skill) 
    .map(s => ({ label: s.skill_name, value: s.id }));

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title={editing ? 'Edit Skill' : 'Add Skill'}
      description="Define a skill available for category mapping and employee profiles."
      footer={
        <DialogFooterActions
          onCancel={onClose}
          onSave={handleSave}
          isEditing={!!editing}
          label="Skill"
          isSaveDisabled={!form.skill_name.trim() || !form.skill_code.trim()}
          isLoading={isLoading}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--space-4)' }}>
          <AdminInput label="Skill Name" required value={form.skill_name} onChange={v => setForm(p => ({ ...p, skill_name: v }))} placeholder="e.g. Python" />
          <AdminInput label="Skill Code" required value={form.skill_code} onChange={v => setForm(p => ({ ...p, skill_code: v.toUpperCase() }))} placeholder="e.g. PY" />
        </div>
        <AdminInput label="Description" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} placeholder="Brief description" />
        <div className="form-group">
          <label className="form-label">Parent Skill <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional – for sub-skills)</span></label>
          <select
            className="form-input"
            value={form.parent_skill}
            onChange={e => setForm(p => ({ ...p, parent_skill: e.target.value }))}
            style={{ cursor: 'pointer' }}
          >
            <option value="">None (Root Skill)</option>
            {parentOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <AdminToggle label="Active Status" checked={form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
      </div>
    </Dialog>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
const CompetencyMasterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: catRes, isLoading: catsLoading } = useSkillCategories();
  const { data: skillRes, isLoading: skillsLoading } = useSkills();
  const { data: levelRes } = useSkillLevels();
  const { data: mappingRes } = useSkillMappings();

  const categories = catRes?.results || [];
  const skills = skillRes?.results || [];
  const levels = levelRes?.results || [];
  const mappings = mappingRes?.results || [];

  const isLoading = catsLoading || skillsLoading;

  /* ── Local state ── */
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; editing: SkillCategory | null }>({ open: false, editing: null });
  const [skillDialog, setSkillDialog] = useState<{ open: boolean; editing: Skill | null }>({ open: false, editing: null });
  
  const [expandedMappingId, setExpandedMappingId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ 
    open: boolean; 
    type: 'soft-delete' | 'hard-delete' | 'restore'; 
    category: SkillCategory | null 
  }>({ open: false, type: 'soft-delete', category: null });

  /* ── Derived data ── */
  const skillsById = useMemo(() => new Map(skills.map(s => [s.id, s])), [skills]);

  const getMappedSkillIds = (catId: number) =>
    mappings.filter(m => m.category === catId).map(m => m.skill);

  /* ── Mutations ── */
  const categoryMutation = useMutation({
    mutationFn: (data: Partial<SkillCategory> & { id?: number }) => {
      const id = data.id ?? categoryDialog.editing?.id;
      return id
        ? skillApi.updateSkillCategory(id, data)
        : skillApi.createSkillCategory(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.skillCategories });
      setCategoryDialog({ open: false, editing: null });
      setConfirmAction(prev => ({ ...prev, open: false }));
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: ({ id, soft }: { id: number; soft: boolean }) => skillApi.deleteSkillCategory(id, soft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.skillCategories });
      setConfirmAction(prev => ({ ...prev, open: false }));
    },
  });

  const skillMutation = useMutation({
    mutationFn: (data: Partial<Skill>) =>
      skillDialog.editing
        ? skillApi.updateSkill(skillDialog.editing.id, data)
        : skillApi.createSkill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.skills });
      setSkillDialog({ open: false, editing: null });
    },
  });

  const levelMutation = useMutation({
    mutationFn: (data: Partial<SkillLevel>) => skillApi.createSkillLevel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.skillLevels });
    },
  });

  const createMappingMutation = useMutation({
    mutationFn: (data: { category: number; skill: number }) => skillApi.createSkillMapping(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.skillMappings });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: (id: number) => skillApi.deleteSkillMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.skillMappings });
    },
  });

  /* ── Handlers ── */
  const handleMappingChange = (catId: number, newSkillIds: number[]) => {
    const currentMappingsForCat = mappings.filter(m => m.category === catId);
    const currentIds = currentMappingsForCat.map(m => m.skill);
    
    // add new
    const toAdd = newSkillIds.filter(id => !currentIds.includes(id));
    toAdd.forEach(skillId => createMappingMutation.mutate({ category: catId, skill: skillId }));

    // Note: Removal is handled via SkillTag onRemove which calls deleteMappingMutation directly
  };

  const handleRemoveMapping = (catId: number, skillId: number) => {
    const mapping = mappings.find(m => m.category === catId && m.skill === skillId);
    if (mapping) {
      deleteMappingMutation.mutate(mapping.id);
    }
  };

  const handleConfirmAction = () => {
    if (!confirmAction.category) return;
    
    if (confirmAction.type === 'soft-delete') {
      categoryMutation.mutate({ id: confirmAction.category.id, is_active: false });
    } else if (confirmAction.type === 'restore') {
      categoryMutation.mutate({ id: confirmAction.category.id, is_active: true });
    } else if (confirmAction.type === 'hard-delete') {
      deleteCategoryMutation.mutate({ id: confirmAction.category.id, soft: false });
    }
  };

  /* ─────────────────────────────────────────────────────────────
     SKILL MAPPING FOOTER — staged selection logic
  ───────────────────────────────────────────────────────────── */
  const SkillMappingFooter: React.FC<{ 
    catId: number; 
    mappedIds: number[]; 
    skillOptions: ComboboxOption[];
    onSkillCreate: (name: string) => void;
  }> = ({ catId, mappedIds, skillOptions, onSkillCreate }) => {
    const [pendingIds, setPendingIds] = useState<string[]>([]);

    const handleCommit = () => {
      if (pendingIds.length === 0) return;
      handleMappingChange(catId, [...mappedIds, ...pendingIds.map(Number)]);
      setPendingIds([]);
    };

    // Filter out skills that are already mapped to this category
    const availableOptions = useMemo(() => 
      skillOptions.filter(opt => !mappedIds.includes(Number(opt.value))),
      [skillOptions, mappedIds]
    );

    return (
      <div style={{ paddingTop: 'var(--space-1)' }}>
        <Combobox
          options={availableOptions}
          value={pendingIds}
          onChange={setPendingIds}
          placeholder="+ Search and press enter to add skills…"
          onCreate={onSkillCreate}
          createLabel="Add Skill"
          onEnter={handleCommit}
        />
      </div>
    );
  };

  /* ── Inline skill level create via InlineAdd ── */
  const handleAddLevel = (name: string) => {
    levelMutation.mutate({ level_name: name, level_rank: levels.length + 1, description: '' });
  };

  /* ── Inline category create via InlineAdd ── */
  const handleAddCategoryInline = (name: string) => {
    categoryMutation.mutate({
      category_name: name,
      category_code: name.substring(0, 4).toUpperCase(),
      description: '',
      is_active: true,
    });
  };

  /* ── Inline skill create via Combobox onCreate ── */
  const handleAddSkillInline = (name: string) => {
    skillMutation.mutate({
      skill_name: name,
      skill_code: name.substring(0, 4).toUpperCase(),
      parent_skill: undefined,
      description: '',
      is_active: true,
    });
  };

  /* ── Filtering logic ── */
  const filteredCategories = categories.filter(cat => {
    // Search by name
    const matchesSearch = cat.category_name.toLowerCase().includes(searchTerm.toLowerCase());

    // Skill filter: only show categories that contain ALL selected skills
    const matchesSkills = skillFilter.length === 0 ||
      skillFilter.every(sid => getMappedSkillIds(cat.id).includes(Number(sid)));

    return matchesSearch && matchesSkills;
  });

  /* ── Combobox options per category (all active skills) ── */
  const skillOptions: ComboboxOption[] = skills
    .filter(s => s.is_active)
    .map(s => ({
      value: String(s.id),
      label: s.skill_name,
      sub: s.parent_skill ? `Sub-skill of ${skillsById.get(s.parent_skill)?.skill_name ?? s.parent_skill}` : s.skill_code,
    }));

  /* ── Skill filter options (with mapping count) ── */
  const skillFilterOptions = skills.filter(s => s.is_active).map(s => ({
    value: String(s.id),
    label: s.skill_name,
    count: mappings.filter(m => m.skill === s.id).length,
  }));

  /* ── Sidebar: Quick Actions ── */
  const quickActions = [
    { label: 'Add Skill',             onClick: () => setSkillDialog({ open: true, editing: null }) },
    { label: 'Add Skill Category',    onClick: () => setCategoryDialog({ open: true, editing: null }) },
  ];

  /* ─────────────────────────────────────────────────────────────
     SIDEBAR CONTENT
  ───────────────────────────────────────────────────────────── */
  const sidebarContent = (
    <>
      {/* Skill Levels */}
      <SidebarCard
        title="Skill Levels"
        action={
          <InlineAdd
            trigger={({ onClick }) => (
              <button
                onClick={onClick}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'white', border: 'none', cursor: 'pointer',
                  color: 'var(--color-accent)', fontSize: '12px', fontWeight: 600, padding: '2px 4px',
                }}
              >
                <Plus size={12} strokeWidth={2.5} />
                Add Level
              </button>
            )}
            placeholder="Level name (e.g. Expert)"
            onSubmit={handleAddLevel}
            placement="bottom-end"
            width='auto'
            validate={v => levels.some(l => l.level_name.toLowerCase() === v.toLowerCase()) ? 'Level already exists' : null}
          />
        }
      >
        <OrderedItemList
          items={levels.map(l => ({ id: String(l.id), label: l.level_name, rank: l.level_rank, sub: l.description || undefined }))}
          emptyText="No skill levels defined yet."
        />
      </SidebarCard>

      {/* Filter by Skill */}
      <SidebarCard title="Filter by Skill">
        <CheckboxFilterList
          options={skillFilterOptions}
          value={skillFilter}
          onChange={setSkillFilter}
          pageSize={10}
          showSelectAll={skillFilterOptions.length > 1}
        />
      </SidebarCard>

      {/* Quick Actions */}
      <SidebarCard title="Quick Actions">
        <QuickActionsList items={quickActions} />
      </SidebarCard>
    </>
  );

  /* ─────────────────────────────────────────────────────────────
     MAIN GRID CONTENT
  ───────────────────────────────────────────────────────────── */
  const mainContent = (
    <>
      {/* Search bar */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            className="form-input"
            placeholder="Search categories…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px' }}
          />
          <Layers size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
        </div>

        {/* Quick add category via inline popover */}
        <InlineAdd
          trigger={({ onClick, isOpen }) => (
            <button
              onClick={onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--color-border)',
                background: isOpen ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)' : 'transparent',
                color: 'var(--color-accent)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Quick Add
            </button>
          )}
          placeholder="Category name..."
          onSubmit={handleAddCategoryInline}
          placement="bottom-end"
          width='auto'
          validate={v => categories.some(c => c.category_name.toLowerCase() === v.toLowerCase()) ? 'Category already exists' : null}
        />
      </div>

      {/* Active skill filter chips */}
      {skillFilter.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 'var(--space-4)' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Skills:</span>
          {skillFilter.map(sid => {
            const skill = skills.find(s => s.id === Number(sid));
            return (
              <span
                key={sid}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '2px 8px 2px 10px', borderRadius: '999px',
                  background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
                  fontSize: '12px', fontWeight: 500, color: 'var(--color-accent)',
                }}
              >
                {skill?.skill_name ?? sid}
                <button
                  onClick={() => setSkillFilter(prev => prev.filter(id => id !== sid))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: 'inherit', opacity: 0.7 }}
                >
                  ×
                </button>
              </span>
            );
          })}
          <button
            onClick={() => setSkillFilter([])}
            style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Result count */}
      {!isLoading && (
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
          {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
          {skillFilter.length > 0 && ` matching ${skillFilter.length} skill filter${skillFilter.length > 1 ? 's' : ''}`}
        </p>
      )}

      {/* Category cards grid */}
      {isLoading ? (
        <ResponsiveGrid columns={3}>
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </ResponsiveGrid>
      ) : filteredCategories.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', flexDirection: 'column',
          justifyContent: 'center', padding: 'var(--space-12) var(--space-8)',
          background: 'var(--color-bg)', border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)',
        }}>
          <Layers size={36} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
          <p style={{ fontSize: '14px', fontWeight: 500 }}>No categories found</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>
            {searchTerm ? 'Try a different search term.' : 'Add your first skill category to get started.'}
          </p>
        </div>
      ) : (
        <ResponsiveGrid columns={2} gap="var(--space-4)">
          {filteredCategories.map((cat, idx) => {
            const mappedIds      = getMappedSkillIds(cat.id);
            const mappedSkills   = mappedIds.map(id => skills.find(s => s.id === id)).filter(Boolean) as Skill[];
            const accentColor    = ACCENTS[idx % ACCENTS.length];
            const rootSkills     = mappedSkills.filter(s => !s.parent_skill);
            const subSkills      = mappedSkills.filter(s => !!s.parent_skill);
            const isEditing      = expandedMappingId === cat.id;

            return (
              <GridCard
                key={cat.id}
                title={cat.category_name}
                subtitle={cat.category_code}
                accentColor={cat.is_active ? accentColor : 'var(--color-text-muted)'}
                style={{ 
                  opacity: cat.is_active ? 1 : 0.75,
                  position: 'relative',
                }}
                badge={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-lg)',
                      background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)',
                    }}>
                      {mappedIds.length} skill{mappedIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                }
                headerAction={
                  <div className="card-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Edit category name / code / description */}
                    <button
                      onClick={() => setCategoryDialog({ open: true, editing: cat })}
                      title="Edit Category"
                      style={{
                        background: 'none', color: 'var(--color-text-muted)',
                        border: 'none', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '4px',
                      }}
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Toggle skill mapping editor */}
                    <button
                      onClick={() => setExpandedMappingId(isEditing ? null : cat.id)}
                      title={isEditing ? 'Close Skill Mapping' : 'Edit Skill Mapping'}
                      style={{
                        background: isEditing ? 'var(--color-accent)' : 'none',
                        color: isEditing ? 'white' : 'var(--color-text-muted)',
                        border: 'none', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '4px',
                      }}
                    >
                      <Tags size={14} />
                    </button>

                    {cat.is_active ? (
                      <button
                        onClick={() => setConfirmAction({ open: true, type: 'soft-delete', category: cat })}
                        title="Deactivate Category"
                        style={{ background: 'none', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setConfirmAction({ open: true, type: 'restore', category: cat })}
                          title="Restore Category"
                          style={{ background: 'none', color: 'var(--color-accent)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmAction({ open: true, type: 'hard-delete', category: cat })}
                          title="Delete Permanently"
                          style={{ background: 'none', color: 'var(--color-danger)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                }
                minContentHeight={100}
                footer={
                  isEditing && (
                    <SkillMappingFooter 
                      catId={cat.id} 
                      mappedIds={mappedIds} 
                      skillOptions={skillOptions} 
                      onSkillCreate={handleAddSkillInline} 
                    />
                  )
                }
              >
                {/* CSS to handle hover actions */}
                <style>{`
                  .card-actions { visibility: hidden; opacity: 0; transition: all 150ms ease; }
                  .grid-card:hover .card-actions { visibility: visible; opacity: 1; }
                `}</style>

                {/* Skill chips */}
                {mappedSkills.length === 0 ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: '100%', minHeight: '60px',
                    color: 'var(--color-text-muted)', fontSize: '13px', fontStyle: 'italic',
                  }}>
                    <Puzzle size={14} style={{ marginRight: '6px', opacity: 0.5 }} />
                    No skill mapping
                  </div>
                ) : (
                  <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: 0, padding: 0 }}>
                    {rootSkills.map(s => (
                      <SkillTag 
                        key={s.id} 
                        name={s.skill_name} 
                        onRemove={isEditing ? () => handleRemoveMapping(cat.id, s.id) : undefined} 
                      />
                    ))}
                    {subSkills.map(s => (
                      <SkillTag 
                        key={s.id} 
                        name={s.skill_name} 
                        isSubSkill 
                        onRemove={isEditing ? () => handleRemoveMapping(cat.id, s.id) : undefined} 
                      />
                    ))}
                  </ul>
                )}
              </GridCard>
            );
          })}
        </ResponsiveGrid>
      )}
    </>
  );

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="content-inner" style={{ paddingBottom: 'var(--space-12)' }}>
      {/* Page Header */}
      <AdminPageHeader
        title="Competency & Skills"
        description="Manage skill categories, individual skills, and proficiency levels across the organization."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Skill Management' },
          { label: 'Competency' },
        ]}
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={() => setSkillDialog({ open: true, editing: null })}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              Add Skill
            </button>
            <button
              onClick={() => setCategoryDialog({ open: true, editing: null })}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent)', color: '#fff',
                border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              Add Category
            </button>
          </div>
        }
      />

      {/* Split layout: main + sticky sidebar */}
      <SplitLayout main={mainContent} sidebar={sidebarContent} sidebarWidth="300px" />

      {/* ── Dialogs ── */}
      <CategoryDialog
        open={categoryDialog.open}
        onClose={() => setCategoryDialog({ open: false, editing: null })}
        editing={categoryDialog.editing}
        onSave={(data) => categoryMutation.mutate(data)}
        isLoading={categoryMutation.isPending}
      />

      <SkillDialog
        open={skillDialog.open}
        onClose={() => setSkillDialog({ open: false, editing: null })}
        editing={skillDialog.editing}
        skills={skills}
        onSave={(data) => skillMutation.mutate(data)}
        isLoading={skillMutation.isPending}
      />

      <ConfirmationDialog
        open={confirmAction.open}
        onClose={() => setConfirmAction({ ...confirmAction, open: false })}
        onConfirm={handleConfirmAction}
        title={
          confirmAction.type === 'soft-delete' ? 'Deactivate Category' :
          confirmAction.type === 'restore' ? 'Restore Category' : 'Delete Permanently'
        }
        confirmLabel={
          confirmAction.type === 'soft-delete' ? 'Deactivate' :
          confirmAction.type === 'restore' ? 'Restore' : 'Delete'
        }
        variant={confirmAction.type === 'hard-delete' ? 'danger' : confirmAction.type === 'soft-delete' ? 'warning' : 'primary'}
        description={
          confirmAction.type === 'soft-delete' ? `Are you sure you want to deactivate "${confirmAction.category?.category_name}"? It will no longer appear in reports but will be kept for historical records.` :
          confirmAction.type === 'restore' ? `Do you want to restore "${confirmAction.category?.category_name}" to active status?` :
          `Are you sure you want to PERMANENTLY delete "${confirmAction.category?.category_name}"? This action cannot be undone and will remove all mappings.`
        }
        isLoading={categoryMutation.isPending || deleteCategoryMutation.isPending}
      />
    </div>
  );
};

export default CompetencyMasterPage;
