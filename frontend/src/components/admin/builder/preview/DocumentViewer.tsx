import React from 'react';
import { FileText, Presentation, UploadCloud, ExternalLink, Eye } from 'lucide-react';

interface DocumentViewerProps {
  contentType: 'PDF' | 'PPT';
  docMetadata?: { name: string; size: string } | null;
}

/**
 * DocumentViewer — Learner-facing document content renderer.
 * For the preview mode, shows a styled document card with file metadata.
 * Backend integration: replace the card preview with an <iframe> pointing to
 * the backend-served document URL (e.g., Google Docs Viewer or direct PDF embed).
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({ contentType, docMetadata }) => {
  const isPDF = contentType === 'PDF';

  // ── Empty State: No document uploaded yet ──────────────────────────
  if (!docMetadata) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-xl bg-slate-900/50 border border-dashed border-slate-700 text-slate-500 gap-3">
        <UploadCloud size={36} className="opacity-30" />
        <p className="text-sm font-medium">No document uploaded for this lesson.</p>
      </div>
    );
  }

  const Icon = isPDF ? FileText : Presentation;
  const accentColor = isPDF ? 'red' : 'orange';

  const accentClasses = {
    red: {
      icon: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      badge: 'bg-red-500/10 text-red-400 border-red-500/20',
      glow: 'shadow-red-900/20',
    },
    orange: {
      icon: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      glow: 'shadow-orange-900/20',
    },
  }[accentColor];

  return (
    <div className="space-y-4">
      {/* Document Card — preview stub */}
      <div className={`
        relative rounded-xl border p-8 flex flex-col items-center justify-center gap-5 text-center
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
          <p className="text-xs text-slate-500">{docMetadata.size}</p>
        </div>

        {/* Format badge */}
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${accentClasses.badge}`}>
          {contentType} Document
        </span>

        {/* Preview placeholder button */}
        <button
          disabled
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium cursor-not-allowed opacity-60"
          title="In-browser viewer available after backend integration"
        >
          <Eye size={16} />
          Open Document Viewer
        </button>

        {/* Integration note */}
        <p className="text-[10px] text-slate-600 max-w-xs">
          In-browser document viewer will be available once the backend is connected and file URL is served.
        </p>
      </div>

      {/* Metadata footer bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <Icon size={14} className={accentClasses.icon} />
          <span className="text-xs font-medium text-slate-400 truncate max-w-[220px]">{docMetadata.name}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${accentClasses.badge}`}>
            {docMetadata.size}
          </span>
          <button
            disabled
            className="flex items-center gap-1 text-[10px] text-slate-600 cursor-not-allowed"
            title="Available after backend integration"
          >
            <ExternalLink size={10} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};
