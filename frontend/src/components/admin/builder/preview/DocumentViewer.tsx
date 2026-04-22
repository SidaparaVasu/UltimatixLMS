import React from 'react';
import { FileText, Presentation, UploadCloud, ExternalLink, Eye } from 'lucide-react';

interface DocumentViewerProps {
  contentType: 'PDF' | 'PPT' | 'DOCUMENT';
  docMetadata?: { name: string; size: string } | null;
  fileUrl?: string | null;
}

/**
 * DocumentViewer — Learner-facing document content renderer.
 * For the preview mode, shows a styled document card with file metadata.
 * Backend integration: replace the card preview with an <iframe> pointing to
 * the backend-served document URL (e.g., Google Docs Viewer or direct PDF embed).
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({ contentType, docMetadata, fileUrl }) => {
  const isPDF = contentType === 'PDF';
  const isPresentation = contentType === 'PPT';

  // ── Empty State: No document uploaded yet ──────────────────────────
  if (!docMetadata) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-900/50 border border-dashed border-slate-700 text-slate-500 gap-3">
        <UploadCloud size={36} className="opacity-30" />
        <p className="text-sm font-medium">No document uploaded for this lesson.</p>
      </div>
    );
  }

  const Icon = isPresentation ? Presentation : FileText;
  const accentColor = isPresentation ? 'orange' : 'red';

  const accentClasses = {
    red: {
      icon: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/0',
      badge: 'bg-red-500/10 text-red-400 border-red-500/20',
      glow: 'shadow-red-900/0',
    },
    orange: {
      icon: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/0',
      badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      glow: 'shadow-orange-900/0',
    },
  }[accentColor];

  return (
    <div className="space-y-4">
      {/* Document Card — preview stub */}
      <div className={`
        relative border p-8 flex flex-col items-center justify-center gap-5 text-center
        bg-gradient-to-br from-slate-900 to-slate-900/50 ${accentClasses.border}
        shadow-xl ${accentClasses.glow}
        min-h-[280px]
      `}>
        {/* File type icon */}
        <div className={`w-20 h-20 rounded-2xl ${accentClasses.bg} ${accentClasses.border} border flex items-center justify-center shadow-inner`}>
          <Icon size={40} className={accentClasses.icon} />
        </div>

        {/* File metadata */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white tracking-tight break-all">
            {docMetadata.name}
          </h3>
        </div>

        {/* Format badge */}
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${accentClasses.badge}`}>
          {contentType} Document
        </span>

        {/* Integration note */}
        <p className="text-[10px] text-slate-600 max-w-xs">
          In-browser document viewer will be available once the backend is connected and file URL is served.
        </p>
      </div>

    </div>
  );
};
