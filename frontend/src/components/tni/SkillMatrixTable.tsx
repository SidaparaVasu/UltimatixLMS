import React from 'react';
import { SkillMatrixRow } from '@/types/tni.types';
import { SkillGapBadge } from './SkillGapBadge';
import { ProficiencyBadge } from '@/components/ui/proficiency-badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface SkillMatrixTableProps {
  rows: SkillMatrixRow[];
  /** Show category column — useful when not already grouped by category */
  showCategory?: boolean;
}

const identifiedByLabel: Record<string, string> = {
  SELF:       'Self',
  MANAGER:    'Manager',
  SYSTEM:     'System',
  ASSESSMENT: 'Assessment',
};

/**
 * SkillMatrixTable
 *
 * Read-only table view of an employee's skill matrix.
 * Columns: Skill | Category | Required | Current | Identified By | Gap
 *
 * Used in MySkillMatrixPage.
 */
export const SkillMatrixTable: React.FC<SkillMatrixTableProps> = ({
  rows,
  showCategory = true,
}) => {
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-12) var(--space-8)',
          textAlign: 'center',
          background: 'var(--color-surface)',
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-text-muted)',
          fontSize: '14px',
        }}
      >
        No skills mapped to your job role yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Skill</TableHead>
          {showCategory && <TableHead>Category</TableHead>}
          <TableHead>Required Level</TableHead>
          <TableHead>Current Level</TableHead>
          <TableHead>Identified By</TableHead>
          <TableHead>Gap</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.skill_id}>
            {/* Skill name */}
            <TableCell>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                }}
              >
                {row.skill_name}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px',
                }}
              >
                {row.skill_code}
              </span>
            </TableCell>

            {/* Category */}
            {showCategory && (
              <TableCell>
                {row.category_name ? (
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {row.category_name}
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
                )}
              </TableCell>
            )}

            {/* Required level */}
            <TableCell>
              {row.required_level ? (
                <ProficiencyBadge
                  level={row.required_level.level_name}
                  rank={row.required_level.level_rank}
                />
              ) : (
                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
              )}
            </TableCell>

            {/* Current level */}
            <TableCell>
              {row.current_level ? (
                <ProficiencyBadge
                  level={row.current_level.level_name}
                  rank={row.current_level.level_rank}
                />
              ) : (
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  Not rated
                </span>
              )}
            </TableCell>

            {/* Identified by */}
            <TableCell>
              {row.identified_by ? (
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {identifiedByLabel[row.identified_by] ?? row.identified_by}
                </span>
              ) : (
                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
              )}
            </TableCell>

            {/* Gap badge */}
            <TableCell>
              <SkillGapBadge
                severity={row.gap_severity}
                gapValue={row.gap_value}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
