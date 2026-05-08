import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle2, Download, X } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { useBulkUploadQuestions } from '@/queries/admin/useQuestionBankQueries';
import { questionBankApi } from '@/api/question-bank-api';
import { useNotificationStore } from '@/stores/notificationStore';
import { BulkUploadError } from '@/types/question-bank.types';

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ open, onClose }) => {
  const showNotification = useNotificationStore(s => s.showNotification);
  const bulkUpload = useBulkUploadQuestions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<BulkUploadError[]>([]);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleClose = () => {
    setSelectedFile(null);
    setErrors([]);
    setImportedCount(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setErrors([]);
    setImportedCount(null);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setErrors([]);
    setImportedCount(null);

    bulkUpload.mutate(selectedFile, {
      onSuccess: (result) => {
        if (!result) return;
        if (result.errors && result.errors.length > 0) {
          setErrors(result.errors);
        } else {
          setImportedCount(result.imported);
          showNotification(`${result.imported} question(s) imported successfully.`, 'success');
        }
      },
      onError: () => {
        showNotification('Upload failed. Please try again.', 'error');
      },
    });
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      await questionBankApi.downloadTemplate();
    } finally {
      setIsDownloading(false);
    }
  };

  const hasErrors = errors.length > 0;
  const isSuccess = importedCount !== null && importedCount > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="Bulk Upload Questions"
      description="Upload a CSV or Excel file to import multiple questions at once. All rows are validated before importing."
      maxWidth="640px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {/* Template download */}
          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: '1px solid var(--color-border)',
              padding: '8px 14px', borderRadius: 'var(--radius-md)',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Download size={14} />
            {isDownloading ? 'Downloading...' : 'Download Template'}
          </button>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={handleClose}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'transparent',
                color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              {isSuccess ? 'Close' : 'Cancel'}
            </button>
            {!isSuccess && (
              <button
                onClick={handleUpload}
                disabled={!selectedFile || bulkUpload.isPending}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--color-accent)', color: '#fff',
                  fontSize: '13px', fontWeight: 600,
                  cursor: !selectedFile ? 'not-allowed' : 'pointer',
                  opacity: !selectedFile ? 0.5 : 1,
                }}
              >
                {bulkUpload.isPending ? 'Uploading...' : 'Upload & Validate'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        {/* Success state */}
        {isSuccess && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: 'var(--space-4)',
            background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.25)',
            borderRadius: 'var(--radius-md)',
          }}>
            <CheckCircle2 size={20} style={{ color: '#15803d', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#15803d' }}>
                Import successful
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#15803d' }}>
                {importedCount} question{importedCount !== 1 ? 's' : ''} imported successfully.
              </p>
            </div>
          </div>
        )}

        {/* File picker */}
        {!isSuccess && (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${selectedFile ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              textAlign: 'center',
              cursor: 'pointer',
              background: selectedFile ? 'color-mix(in srgb, var(--color-accent) 4%, transparent)' : 'var(--color-surface)',
              transition: 'all 150ms',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {selectedFile ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <FileText size={20} style={{ color: 'var(--color-accent)' }} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {selectedFile.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setSelectedFile(null); setErrors([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <UploadCloud size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }} />
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Click to select a file
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Supports CSV, XLSX, XLS
                </p>
              </>
            )}
          </div>
        )}

        {/* Error report */}
        {hasErrors && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
              borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)',
            }}>
              <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>
                Validation failed — {errors.length} error{errors.length !== 1 ? 's' : ''} found. No questions were imported.
              </p>
            </div>

            <div style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              maxHeight: '240px',
              overflowY: 'auto',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)' }}>
                    {['Row', 'Field', 'Error'].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: 'left',
                        fontWeight: 700, color: 'var(--color-text-muted)',
                        borderBottom: '1px solid var(--color-border)',
                        textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '10px',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {errors.map((err, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                        {err.row}
                      </td>
                      <td style={{ padding: '7px 12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        {err.field}
                      </td>
                      <td style={{ padding: '7px 12px', color: '#dc2626' }}>
                        {err.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
              Fix the errors in your file and re-upload.
            </p>
          </div>
        )}

      </div>
    </Dialog>
  );
};
