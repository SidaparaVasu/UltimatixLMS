import React from 'react';

interface DialogFooterActionsProps {
  onCancel: () => void;
  onSave: () => void;
  isEditing?: boolean;
  /**
   * Entity label used to auto-generate button text.
   * e.g. label="Business Unit" → "Create Business Unit" / "Update Business Unit"
   */
  label?: string;
  /** Override the save button text entirely */
  saveLabel?: string;
  cancelLabel?: string;
  isSaveDisabled?: boolean;
  isLoading?: boolean;
}

/**
 * DialogFooterActions — standardized Cancel + Save button pair for all master dialogs.
 * Automatically generates "Create X" / "Update X" button text based on edit state.
 *
 * Usage:
 *   <DialogFooterActions
 *     onCancel={() => closeDialog()}
 *     onSave={handleSave}
 *     isEditing={!!editingItem}
 *     label="Business Unit"
 *   />
 */
export const DialogFooterActions: React.FC<DialogFooterActionsProps> = ({
  onCancel,
  onSave,
  isEditing = false,
  label,
  saveLabel,
  cancelLabel = 'Cancel',
  isSaveDisabled = false,
  isLoading = false,
}) => {
  const computedSaveLabel =
    saveLabel ?? (label ? (isEditing ? `Update ${label}` : `Create ${label}`) : 'Save');

  return (
    <>
      <button
        onClick={onCancel}
        disabled={isLoading}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          color: 'var(--color-text-primary)',
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {cancelLabel}
      </button>
      <button
        onClick={onSave}
        disabled={isSaveDisabled || isLoading}
        style={{
          background: isSaveDisabled || isLoading ? 'var(--color-text-muted)' : 'var(--color-accent)',
          opacity: isSaveDisabled || isLoading ? 0.6 : 1,
          border: 'none',
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          cursor: isSaveDisabled || isLoading ? 'not-allowed' : 'pointer',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '120px',
          justifyContent: 'center',
        }}
      >
        {isLoading ? (
          <>
            <span
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff',
                animation: 'spin 0.6s linear infinite',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            Saving...
          </>
        ) : (
          computedSaveLabel
        )}
      </button>
    </>
  );
};
