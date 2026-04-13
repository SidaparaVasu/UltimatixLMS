import React, { useState, useMemo } from 'react';
import { Target, X, Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { DialogFooterActions } from '@/components/admin/form';
import { ProficiencyBadge } from '@/components/ui/proficiency-badge';
import { Skill, SkillLevel } from '@/api/admin-mock-api';

export interface SkillMappingEntry {
  skillId: string;
  levelId: string;
  status?: 'SELF_ASSESSED' | 'VERIFIED' | 'PENDING';
}

interface UnifiedSkillMappingModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  type: 'ROLE' | 'EMPLOYEE';
  allSkills: Skill[];
  allLevels: SkillLevel[];
  initialMappings?: SkillMappingEntry[];
  onSave: (mappings: SkillMappingEntry[]) => void;
}

/**
 * A shared modal for mapping skills to entities (Job Roles or Employees).
 * Features a staged selection workflow via Combobox and per-skill level assignment.
 */
export const UnifiedSkillMappingModal: React.FC<UnifiedSkillMappingModalProps> = ({
  open,
  onClose,
  title,
  description,
  type,
  allSkills,
  allLevels,
  initialMappings = [],
  onSave
}) => {
  const [stagedMappings, setStagedMappings] = useState<SkillMappingEntry[]>([]);

  // Initialize staged mappings from initialMappings when modal opens
  React.useEffect(() => {
    if (open) {
      setStagedMappings(initialMappings);
    }
  }, [open, initialMappings]);

  const skillsById = useMemo(() => new Map(allSkills.map(s => [s.id, s])), [allSkills]);
  const levelsById = useMemo(() => new Map(allLevels.map(l => [l.id, l])), [allLevels]);

  const skillOptions = useMemo(() => 
    allSkills
      .filter(s => s.isActive)
      .map(s => ({ value: s.id, label: s.name })), 
  [allSkills]);

  const handleAddSkill = (skillIds: string[]) => {
    // stagedMappings already contains entries. We just need to add new ones with default level.
    const currentIds = stagedMappings.map(m => m.skillId);
    const newIds = skillIds.filter(id => !currentIds.includes(id));
    
    if (newIds.length === 0) return;

    const newEntries: SkillMappingEntry[] = newIds.map(id => ({
      skillId: id,
      levelId: allLevels[0]?.id || '', // Default to first level
      status: type === 'EMPLOYEE' ? 'PENDING' : undefined
    }));

    setStagedMappings(prev => [...prev, ...newEntries]);
  };

  const handleLevelChange = (skillId: string, levelId: string) => {
    setStagedMappings(prev => prev.map(m => 
      m.skillId === skillId ? { ...m, levelId } : m
    ));
  };

  const handleRemove = (skillId: string) => {
    setStagedMappings(prev => prev.filter(m => m.skillId !== skillId));
  };

  const handleSave = () => {
    onSave(stagedMappings);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title={title}
      description={description || "Map required skills and set proficiency levels."}
      maxWidth="600px"
      footer={
        <DialogFooterActions
          onCancel={onClose}
          onSave={handleSave}
          isEditing={initialMappings.length > 0}
          label="Mappings"
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Search & Add Section */}
        <div style={{ background: 'white', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Search and Add Skills
          </label>
          <Combobox
            options={skillOptions.filter(opt => !stagedMappings.some(m => m.skillId === opt.value))}
            value={[]} // Keep it empty for search-and-add behavior
            onChange={handleAddSkill}
            placeholder="+ Search skills to map..."
          />
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
            Pick skills from the directory. You can set proficiency levels in the list below.
          </p>
        </div>

        {/* Staged List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Effected Skills ({stagedMappings.length})</h4>
            {stagedMappings.length > 0 && (
              <button 
                onClick={() => setStagedMappings([])}
                style={{ fontSize: '12px', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear all
              </button>
            )}
          </div>

          {stagedMappings.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexDirection: 'column',
              padding: 'var(--space-8)', 
              border: '1px dashed var(--color-border)', 
              borderRadius: 'var(--radius-md)', 
              color: 'var(--color-text-muted)' 
            }}>
              <Target size={24} style={{ opacity: 0.3, marginBottom: 'var(--space-2)' }} />
              <p style={{ fontSize: '13px' }}>No skills selected yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {stagedMappings.map((entry) => {
                const skill = skillsById.get(entry.skillId);
                const level = levelsById.get(entry.levelId);
                if (!skill) return null;

                return (
                  <div 
                    key={entry.skillId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 150ms'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{skill.name}</div>
                      <ProficiencyBadge level={level?.name || 'Set Level'} rank={level?.rank || 0} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                      <select
                        className="form-input"
                        value={entry.levelId}
                        onChange={(e) => handleLevelChange(entry.skillId, e.target.value)}
                        style={{ padding: '2px 8px', fontSize: '12px', width: 'auto', height: '28px' }}
                      >
                        {allLevels.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                      
                      <button
                        onClick={() => handleRemove(entry.skillId)}
                        style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
