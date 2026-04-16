import React, { useState, useEffect } from 'react';
import { Save, FileText, Video, Link as LinkIcon, UploadCloud, LayoutList, MonitorPlay, Presentation } from 'lucide-react';
import { CurriculumNode, ContentType } from './CurriculumTree';
import { cn } from '@/utils/cn';
import { QuizBuilder } from './QuizBuilder';
import { getVideoInfo, fetchVideoTitle } from '@/utils/video-utils';

interface LessonEditorProps {
  node: CurriculumNode;
  onSave: (id: string, updates: Partial<CurriculumNode>) => void;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({ node, onSave }) => {
  const [title, setTitle] = useState(node.title);
  const [contentType, setContentType] = useState<ContentType>(node.contentType || 'VIDEO');
  const [videoUrl, setVideoUrl] = useState(node.videoUrl || '');
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const videoInfo = getVideoInfo(videoUrl);

  // Document Upload State
  const [docFile, setDocFile] = useState<{ name: string; size: string } | null>(node.docMetadata || null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'compressing' | 'complete'>(node.docMetadata ? 'complete' : 'idle');

  const simulateUpload = (fileName: string, fileSize: number) => {
    setDocFile({ name: fileName, size: (fileSize / (1024 * 1024)).toFixed(2) + ' MB' });
    setUploadStatus('uploading');
    setUploadProgress(0);

    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 30;
      if (prog >= 100) {
        clearInterval(interval);
        setUploadProgress(100);
        setUploadStatus('compressing');
        
        // Simulate compression delay
        setTimeout(() => {
          setUploadStatus('complete');
        }, 2000);
      } else {
        setUploadProgress(prog);
      }
    }, 400);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateUpload(file.name, file.size);
    }
  };

  const fetchVideoMetadata = async (url: string) => {
    if (!url || !videoInfo) return;
    setIsFetchingMetadata(true);
    const fetchedTitle = await fetchVideoTitle(url);
    if (fetchedTitle && (!title || title === "New Lesson" || title === "Untitled Lesson")) {
      setTitle(fetchedTitle);
    }
    setIsFetchingMetadata(false);
  };

  // Logic: A lesson is "Committed" (Locked) if the parent node already has a contentType saved.
  // We check node.contentType specifically to see if it was persisted in the curriculum tree.
  const isCommitted = !!node.contentType;

  const handleFormatSwitch = (newType: ContentType) => {
    if (isCommitted || newType === contentType) return;

    // Check if any local content exists (unsaved)
    const hasUnsavedContent = !!videoUrl || !!docFile;
    
    if (hasUnsavedContent) {
      const confirmed = window.confirm("Switching the content format will clear all currently entered data for this lesson. Do you want to continue?");
      if (!confirmed) return;
    }

    // Isolate State: Explicitly clear all content-related states
    setVideoUrl('');
    setDocFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setContentType(newType);
  };

  useEffect(() => {
    setTitle(node.title);
    setContentType(node.contentType || 'VIDEO');
    setVideoUrl(node.videoUrl || '');
  }, [node]);

  const handleSave = () => {
    onSave(node.id, { 
      title, 
      contentType, 
      videoUrl, 
      docMetadata: docFile 
    });
  };

  const renderIcon = () => {
    switch (contentType) {
      case 'VIDEO': return <Video size={20} />;
      case 'PDF': return <FileText size={20} />;
      case 'PPT': return <Presentation size={20} />;
      case 'QUIZ': return <LayoutList size={20} />;
      default: return <LinkIcon size={20} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#12141c] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-slate-800/80 bg-[#0a0c10] shrink-0">
        <div className="flex items-center gap-3">
          {/* <div className="w-10 h-10 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center">
            {renderIcon()}
          </div> */}
          <div>
            <h2 className="text-xl font-bold tracking-tight">Lesson Editor</h2>
            <p className="text-xs text-slate-400">Configure learning materials</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-md shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all flex items-center gap-2"
        >
          <Save size={16} />
          Save Lesson Draft
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        
        {/* Metadata Section */}
        <section className="space-y-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Lesson Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="px-4 py-3 bg-[#0a0c10] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
              placeholder="e.g. Setting up the Environment"
            />
          </div>
        </section>

        {/* Content Type Switcher */}
        <section className="space-y-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">Content Format</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            {[
              { type: 'VIDEO', label: 'MP4 (YouTube)', icon: Video, active: true },
              { type: 'PDF', label: 'PDF Document', icon: FileText, active: true },
              { type: 'PPT', label: 'PPT Viewer', icon: Presentation, active: true },
              { type: 'LINK', label: 'External Link', icon: LinkIcon, active: true },
              { type: 'QUIZ', label: 'Assessment', icon: LayoutList, active: true },
              { type: 'SCORM', label: 'SCORM Package', icon: MonitorPlay, active: false },
            ].map(format => (
              <button
                key={format.type}
                disabled={!format.active || (isCommitted && contentType !== format.type)}
                onClick={() => handleFormatSwitch(format.type as ContentType)}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-md border transition-all relative overflow-hidden",
                  contentType === format.type 
                    ? "bg-blue-500/10 border-blue-500 text-blue-400" 
                    : (format.active && !isCommitted)
                      ? "bg-slate-800/30 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                      : "bg-[#0b0d13] border-slate-800 text-slate-600 cursor-not-allowed opacity-50"
                )}
              >
                {isCommitted && contentType === format.type && (
                  <div className="absolute top-0 left-0 bg-blue-500 text-[8px] px-1 text-white rounded-br-sm font-bold">
                    LOCKED
                  </div>
                )}
                {!format.active && !isCommitted && (
                   <div className="absolute top-0 right-0 bg-slate-800 text-[8px] px-1 text-slate-400 rounded-bl-sm">
                     SOON
                   </div>
                )}
                <format.icon size={16} />
                <span className="text-[11px] font-bold tracking-wide">{format.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Sub-Editor Stubs */}
        <section className="pt-6 border-t border-slate-800">
          
          {contentType === 'VIDEO' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Video Source URL</label>
                {videoUrl && videoInfo && (
                  <button 
                    onClick={() => fetchVideoMetadata(videoUrl)}
                    disabled={isFetchingMetadata}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase"
                  >
                    {isFetchingMetadata ? 'Fetching...' : 'Auto-fill Title'}
                  </button>
                )}
              </div>
              <input 
                type="url" 
                value={videoUrl}
                onChange={e => {
                  setVideoUrl(e.target.value);
                  // TODO: trigger auto-fetch if title is empty
                }}
                placeholder="https://www.youtube.com/watch?v=..." 
                className="w-full px-4 py-3 bg-[#0a0c10] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm"
              />
              
              <div className="relative aspect-video rounded-lg bg-[#0a0c10] border border-slate-800 flex items-center justify-center text-slate-500 overflow-hidden group">
                 {videoInfo ? (
                   videoInfo.type === 'youtube' ? (
                     <iframe 
                        src={`https://www.youtube.com/embed/${videoInfo.id}`}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                     />
                   ) : (
                    <iframe 
                      src={`https://player.vimeo.com/video/${videoInfo.id}`}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                   )
                 ) : (
                   <div className="text-center">
                      <Video size={32} className="mx-auto mb-2 opacity-50 transition-transform group-hover:scale-110 duration-500" />
                      <p className="text-xs">
                        {videoUrl ? 'Invalid URL or unsupported provider' : 'Paste a video link to see preview'}
                      </p>
                   </div>
                 )}
              </div>
            </div>
          )}

          {(contentType === 'PDF' || contentType === 'PPT') && (
             <div className="space-y-4">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Document Configuration</label>
               
               {uploadStatus === 'idle' ? (
                 <label className="border-2 border-dashed border-slate-700 rounded-md p-10 flex flex-col items-center justify-center text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group">
                  <input type="file" className="hidden" accept={contentType === 'PDF' ? '.pdf' : '.ppt,.pptx'} onChange={handleFileChange} />
                  <UploadCloud size={40} className="text-slate-500 mb-3 group-hover:text-blue-400 transition-colors" />
                  <h4 className="text-sm font-bold text-slate-300 mb-1">Click to upload {contentType}</h4>
                  <p className="text-[10px] text-slate-500 max-w-xs mb-3 uppercase tracking-tighter">Drag & Drop supported</p>
                  <div className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[9px] font-bold">
                    In-browser viewer enabled
                  </div>
                </label>
               ) : (
                 <div className="bg-[#0a0c10] border border-slate-800 rounded-lg p-5 space-y-4">
                    <div className="flex items-start gap-4">
                       <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center shrink-0">
                          {contentType === 'PDF' ? <FileText className="text-red-400" /> : <Presentation className="text-orange-400" />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-200 truncate">{docFile?.name}</h4>
                          <p className="text-xs text-slate-500">{docFile?.size}</p>
                       </div>
                       {uploadStatus === 'complete' && (
                         <button 
                            onClick={() => setUploadStatus('idle')}
                            className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors"
                         >
                            REPLACE
                         </button>
                       )}
                    </div>

                    {uploadStatus !== 'complete' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                           <span className="text-blue-400">
                             {uploadStatus === 'uploading' ? 'Uploading...' : 'Applying Data Compression...'}
                           </span>
                           <span className="text-slate-500">{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                           <div 
                              className={cn(
                                "h-full transition-all duration-300",
                                uploadStatus === 'uploading' ? 'bg-blue-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                              )}
                              style={{ width: `${uploadStatus === 'uploading' ? uploadProgress : 100}%` }}
                           />
                        </div>
                      </div>
                    )}

                    {uploadStatus === 'complete' && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                         <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                            <span className="text-[10px] text-black">✓</span>
                         </div>
                         <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Ready for course launch</p>
                      </div>
                    )}
                 </div>
               )}
             </div>
          )}

          {contentType === 'LINK' && (
             <div className="space-y-4">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">External Resource Configuration</label>
              
              <div className="flex flex-col gap-4">
                <input 
                  type="url" 
                  placeholder="https://example.com/reference-material" 
                  className="w-full px-4 py-3 bg-[#0a0c10] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm"
                />
                
                <label className="flex items-center gap-3 p-4 border border-slate-700 bg-slate-800/30 rounded-md cursor-pointer hover:bg-slate-800/50 transition">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900" />
                  <div>
                    <p className="text-sm font-semibold text-white">Require "Mark Completed"</p>
                    <p className="text-xs text-slate-400 text-balance">
                      The learner must explicitly click "Mark Completed" after visiting this link for it to register as finished.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {contentType === 'QUIZ' && (
            <div className="pt-2">
               <QuizBuilder />
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
