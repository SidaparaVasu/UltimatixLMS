import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { CurriculumNode } from './CurriculumTree';

interface SectionEditorProps {
  node: CurriculumNode;
  onSave: (id: string, updates: Partial<CurriculumNode>) => void;
}

export const SectionEditor: React.FC<SectionEditorProps> = ({ node, onSave }) => {
  const [title, setTitle] = useState(node.title);
  const [description, setDescription] = useState(node.description || '');

  useEffect(() => {
    setTitle(node.title);
    setDescription(node.description || '');
  }, [node]);

  const handleSave = () => {
    onSave(node.id, { title, description });
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#12141c] text-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-slate-800/80 bg-[#0a0c10] shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Section Details</h2>
            <p className="text-xs text-slate-400">Manage grouping for your lessons</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-md shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all flex items-center gap-2"
        >
          <Save size={16} />
          Save Section
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Section Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="px-4 py-3 bg-[#0a0c10] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
              placeholder="e.g. Introduction to the Course"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Section Description</label>
            <textarea
              rows={5}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="px-4 py-3 bg-[#0a0c10] border border-slate-700 rounded-md text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
              placeholder="Describe what learners will cover in this section..."
            />
          </div>
          
          <div className="mt-2 pt-6 border-t border-slate-800">
            <h3 className="text-sm font-semibold mb-2">Section Settings</h3>
             <p className="text-xs text-slate-500">
               Additional section configuration like sequencing constraints or prerequisites can be managed here in the future.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
