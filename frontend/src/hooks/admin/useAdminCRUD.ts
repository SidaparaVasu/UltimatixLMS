import { useState, useCallback } from 'react';

interface UseAdminCRUDOptions<TForm> {
  /** The empty/reset state for the form */
  emptyForm: TForm;
  /**
   * Optional mapping fn to populate formData when opening in edit mode.
   * Defaults to spreading the item directly — only needed when field names differ.
   */
  mapToForm?: (item: any) => TForm;
}

interface UseAdminCRUDReturn<TItem, TForm> {
  // Dialog state
  isDialogOpen: boolean;
  editingItem: TItem | null;

  // Form state
  formData: TForm;

  // Actions
  openDialog: (item?: TItem) => void;
  closeDialog: () => void;
  setField: <K extends keyof TForm>(key: K, value: TForm[K]) => void;
  setFormData: (data: TForm) => void;
  resetForm: () => void;
}

/**
 * useAdminCRUD — centralizes the shared state pattern every master page uses.
 * Handles dialog open/close, editing item tracking, and form field updates.
 *
 * Usage:
 *   const crud = useAdminCRUD<BusinessUnit, FormType>({
 *     emptyForm: { name: '', code: '', isActive: true },
 *   });
 *   // Open for create:
 *   crud.openDialog()
 *   // Open for edit:
 *   crud.openDialog(existingItem)
 *   // In the form:
 *   <AdminInput value={crud.formData.name} onChange={v => crud.setField('name', v)} />
 */
export function useAdminCRUD<TItem extends Record<string, any>, TForm extends Record<string, any>>({
  emptyForm,
  mapToForm,
}: UseAdminCRUDOptions<TForm>): UseAdminCRUDReturn<TItem, TForm> {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TItem | null>(null);
  const [formData, setFormData] = useState<TForm>({ ...emptyForm });

  const openDialog = useCallback((item?: TItem) => {
    if (item) {
      setEditingItem(item);
      // Use custom mapper if provided; otherwise spread the item directly
      setFormData(mapToForm ? mapToForm(item) : ({ ...emptyForm, ...item } as TForm));
    } else {
      setEditingItem(null);
      setFormData({ ...emptyForm });
    }
    setIsDialogOpen(true);
  }, [emptyForm, mapToForm]);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    // Slight delay so closing animation can play before data is cleared
    setTimeout(() => {
      setEditingItem(null);
      setFormData({ ...emptyForm });
    }, 200);
  }, [emptyForm]);

  const setField = useCallback(<K extends keyof TForm>(key: K, value: TForm[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({ ...emptyForm });
  }, [emptyForm]);

  return {
    isDialogOpen,
    editingItem,
    formData,
    openDialog,
    closeDialog,
    setField,
    setFormData,
    resetForm,
  };
}
