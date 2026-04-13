import React, { useState, useMemo } from 'react';
import { Layers, Puzzle, BarChart3, Plus } from 'lucide-react';
import {
  useSkillCategories,
  useSkills,
  useSkillLevels,
  useSkillMappings,
} from '@/queries/admin/useAdminMasters';
import {
  SkillCategory,
  Skill,
  SkillLevel,
  SkillCategoryMapping,
} from '@/api/admin-mock-api';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { SplitLayout, SidebarCard } from '@/components/ui/split-layout';
import { GridCard, ResponsiveGrid } from '@/components/ui/grid-card';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { SkillTag } from '@/components/ui/skill-tag';
import { InlineAdd } from '@/components/ui/inline-add';
import { CheckboxFilterList } from '@/components/ui/checkbox-filter-list';
import { QuickActionsList, OrderedItemList } from '@/components/ui/quick-actions';
import { Dialog } from '@/components/ui/dialog';
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
}
const CategoryDialog: React.FC<CategoryDialogProps> = ({ open, onClose, editing }) => {
  const [form, setForm] = useState({ name: '', code: '', description: '', isActive: true });

  React.useEffect(() => {
    if (open) {
      setForm(editing
        ? { name: editing.name, code: editing.code, description: editing.description, isActive: editing.isActive }
        : { name: '', code: '', description: '', isActive: true }
      );
    }
  }, [open, editing]);

  const handleSave = () => {
    console.log(editing ? 'Update Category:' : 'Create Category:', form);
    onClose();
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
          isSaveDisabled={!form.name.trim() || !form.code.trim()}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--space-4)' }}>
          <AdminInput label="Category Name" required value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Technical Skills" />
          <AdminInput label="Category Code" required value={form.code} onChange={v => setForm(p => ({ ...p, code: v.toUpperCase() }))} placeholder="e.g. TECH" />
        </div>
        <AdminInput label="Description" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} placeholder="Brief description of this category" />
        <AdminToggle label="Active Status" hint="Inactive categories are hidden from skill-gap reports." checked={form.isActive} onChange={v => setForm(p => ({ ...p, isActive: v }))} />
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
}
const SkillDialog: React.FC<SkillDialogProps> = ({ open, onClose, editing, skills }) => {
  const [form, setForm] = useState({ name: '', code: '', description: '', parentId: '', isActive: true });

  React.useEffect(() => {
    if (open) {
      setForm(editing
        ? { name: editing.name, code: editing.code, description: editing.description, parentId: editing.parentId ?? '', isActive: editing.isActive }
        : { name: '', code: '', description: '', parentId: '', isActive: true }
      );
    }
  }, [open, editing]);

  const handleSave = () => {
    console.log(editing ? 'Update Skill:' : 'Create Skill:', form);
    onClose();
  };

  const parentOptions = skills
    .filter(s => s.id !== editing?.id && !s.parentId) // only root skills as parents (no deep nesting)
    .map(s => ({ label: s.name, value: s.id }));

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
          isSaveDisabled={!form.name.trim() || !form.code.trim()}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--space-4)' }}>
          <AdminInput label="Skill Name" required value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Python" />
          <AdminInput label="Skill Code" required value={form.code} onChange={v => setForm(p => ({ ...p, code: v.toUpperCase() }))} placeholder="e.g. PY" />
        </div>
        <AdminInput label="Description" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} placeholder="Brief description" />
        <div className="form-group">
          <label className="form-label">Parent Skill <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional – for sub-skills)</span></label>
          <select
            className="form-input"
            value={form.parentId}
            onChange={e => setForm(p => ({ ...p, parentId: e.target.value }))}
            style={{ cursor: 'pointer' }}
          >
            <option value="">None (Root Skill)</option>
            {parentOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <AdminToggle label="Active Status" checked={form.isActive} onChange={v => setForm(p => ({ ...p, isActive: v }))} />
      </div>
    </Dialog>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
const CompetencyMasterPage: React.FC = () => {
  const { data: categories = [], isLoading: catsLoading } = useSkillCategories();
  const { data: skills = [],     isLoading: skillsLoading } = useSkills();
  const { data: levels = [] }                               = useSkillLevels();
  const { data: mappings = [] }                             = useSkillMappings();

  const isLoading = catsLoading || skillsLoading;

  /* ── Local state ── */
  const [searchTerm, setSearchTerm]               = useState('');
  const [skillFilter, setSkillFilter]             = useState<string[]>([]);
  const [categoryDialog, setCategoryDialog]       = useState<{ open: boolean; editing: SkillCategory | null }>({ open: false, editing: null });
  const [skillDialog, setSkillDialog]             = useState<{ open: boolean; editing: Skill | null }>({ open: false, editing: null });

  /* ── Mapping state (local simulation of server-side mapping updates) ── */
  const [localMappings, setLocalMappings]         = useState<SkillCategoryMapping[]>([]);
  const allMappings = useMemo(() => [...mappings, ...localMappings], [mappings, localMappings]);

  /* ── Derived data ── */
  const skillsById = useMemo(() => new Map(skills.map(s => [s.id, s])), [skills]);

  const getMappedSkillIds = (catId: string) =>
    allMappings.filter(m => m.categoryId === catId).map(m => m.skillId);

  const handleMappingChange = (catId: string, newSkillIds: string[]) => {
    const currentIds = getMappedSkillIds(catId);
    // add new
    const toAdd = newSkillIds.filter(id => !currentIds.includes(id));
    // remove deselected
    const toRemove = currentIds.filter(id => !newSkillIds.includes(id));

    setLocalMappings(prev => {
      const filtered = prev.filter(m => !(m.categoryId === catId && toRemove.includes(m.skillId)));
      const newEntries: SkillCategoryMapping[] = toAdd.map(skillId => ({
        id: `local-${Date.now()}-${skillId}`,
        categoryId: catId,
        skillId,
      }));
      return [...filtered, ...newEntries];
    });
    console.log(`Mapping update for category ${catId}:`, newSkillIds);
  };

  /* ─────────────────────────────────────────────────────────────
     SKILL MAPPING FOOTER — staged selection logic
  ───────────────────────────────────────────────────────────── */
  const SkillMappingFooter: React.FC<{ 
    catId: string; 
    mappedIds: string[]; 
    skillOptions: ComboboxOption[];
    onSkillCreate: (name: string) => void;
  }> = ({ catId, mappedIds, skillOptions, onSkillCreate }) => {
    const [pendingIds, setPendingIds] = useState<string[]>([]);

    const handleCommit = () => {
      if (pendingIds.length === 0) return;
      handleMappingChange(catId, [...mappedIds, ...pendingIds]);
      setPendingIds([]);
    };

    // Filter out skills that are already mapped to this category
    const availableOptions = useMemo(() => 
      skillOptions.filter(opt => !mappedIds.includes(opt.value)),
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
  const [localLevels, setLocalLevels] = useState<SkillLevel[]>([]);
  const allLevels = useMemo(
    () => [...levels, ...localLevels].sort((a, b) => a.rank - b.rank),
    [levels, localLevels]
  );

  const handleAddLevel = (name: string) => {
    const next = allLevels.length + 1;
    setLocalLevels(prev => [...prev, { id: `local-lv-${Date.now()}`, name, rank: next, description: '' }]);
    console.log('Create Skill Level:', name);
  };

  /* ── Inline category create via InlineAdd ── */
  const [localCategories, setLocalCategories] = useState<SkillCategory[]>([]);
  const allCategories = useMemo(() => [...categories, ...localCategories], [categories, localCategories]);

  const handleAddCategoryInline = (name: string) => {
    const newCat: SkillCategory = {
      id: `local-cat-${Date.now()}`,
      name,
      code: name.substring(0, 4).toUpperCase(),
      description: '',
      isActive: true,
    };
    setLocalCategories(prev => [...prev, newCat]);
    console.log('Quick-create Category:', name);
  };

  /* ── Inline skill create via Combobox onCreate ── */
  const [localSkills, setLocalSkills] = useState<Skill[]>([]);
  const allSkills = useMemo(() => [...skills, ...localSkills], [skills, localSkills]);

  const handleAddSkillInline = (name: string) => {
    const newSkill: Skill = {
      id: `local-sk-${Date.now()}`,
      name,
      code: name.substring(0, 4).toUpperCase(),
      parentId: null,
      description: '',
      isActive: true,
    };
    setLocalSkills(prev => [...prev, newSkill]);
    console.log('Quick-create Skill:', name);
  };

  /* ── Filtering logic ── */
  const filteredCategories = allCategories.filter(cat => {
    // Search by name
    const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());

    // Skill filter: only show categories that contain ALL selected skills
    const matchesSkills = skillFilter.length === 0 ||
      skillFilter.every(sid => getMappedSkillIds(cat.id).includes(sid));

    return matchesSearch && matchesSkills;
  });

  /* ── Combobox options per category (all active skills) ── */
  const skillOptions: ComboboxOption[] = allSkills
    .filter(s => s.isActive)
    .map(s => ({
      value: s.id,
      label: s.name,
      sub: s.parentId ? `Sub-skill of ${skillsById.get(s.parentId)?.name ?? s.parentId}` : s.code,
    }));

  /* ── Skill filter options (with mapping count) ── */
  const skillFilterOptions = allSkills.filter(s => s.isActive).map(s => ({
    value: s.id,
    label: s.name,
    count: allMappings.filter(m => m.skillId === s.id).length,
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
            validate={v => allLevels.some(l => l.name.toLowerCase() === v.toLowerCase()) ? 'Level already exists' : null}
          />
        }
      >
        <OrderedItemList
          items={allLevels.map(l => ({ id: l.id, label: l.name, rank: l.rank, sub: l.description || undefined }))}
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
          validate={v => allCategories.some(c => c.name.toLowerCase() === v.toLowerCase()) ? 'Category already exists' : null}
        />
      </div>

      {/* Active skill filter chips */}
      {skillFilter.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 'var(--space-4)' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Skills:</span>
          {skillFilter.map(sid => {
            const skill = allSkills.find(s => s.id === sid);
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
                {skill?.name ?? sid}
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
            const mappedSkills   = mappedIds.map(id => allSkills.find(s => s.id === id)).filter(Boolean) as Skill[];
            const accentColor    = ACCENTS[idx % ACCENTS.length];
            const rootSkills     = mappedSkills.filter(s => !s.parentId);
            const subSkills      = mappedSkills.filter(s => !!s.parentId);

            return (
              <GridCard
                key={cat.id}
                title={cat.name}
                subtitle={cat.code}
                accentColor={cat.isActive ? accentColor : 'var(--color-text-muted)'}
                badge={
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)',
                  }}>
                    {mappedIds.length} skill{mappedIds.length !== 1 ? 's' : ''}
                  </span>
                }
                headerAction={
                  !cat.isActive ? (
                    <span style={{ fontSize: '11px', color: 'var(--color-danger)', fontStyle: 'italic' }}>Inactive</span>
                  ) : undefined
                }
                minContentHeight={100}
                footer={
                  <SkillMappingFooter 
                    catId={cat.id} 
                    mappedIds={mappedIds} 
                    skillOptions={skillOptions} 
                    onSkillCreate={handleAddSkillInline} 
                  />
                }
              >
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
                        name={s.name} 
                        onRemove={() => handleMappingChange(cat.id, mappedIds.filter(id => id !== s.id))} 
                      />
                    ))}
                    {subSkills.map(s => (
                      <SkillTag 
                        key={s.id} 
                        name={s.name} 
                        isSubSkill 
                        onRemove={() => handleMappingChange(cat.id, mappedIds.filter(id => id !== s.id))} 
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
      />

      <SkillDialog
        open={skillDialog.open}
        onClose={() => setSkillDialog({ open: false, editing: null })}
        editing={skillDialog.editing}
        skills={allSkills}
      />
    </div>
  );
};

export default CompetencyMasterPage;
