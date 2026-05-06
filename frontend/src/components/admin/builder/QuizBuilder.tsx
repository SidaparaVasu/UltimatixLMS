import React, { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle, FileText, UploadCloud, Type, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { AssessmentConfig } from '@/api/assessment-api';

export type QuestionType = 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'DESCRIPTIVE' | 'SCENARIO' | 'FILE_UPLOAD';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  scenarioText?: string;
  options?: QuizOption[];
}

export const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = {
  duration_minutes: 30,
  passing_percentage: 50,
  retake_limit: 1,
  is_randomized: false,
  negative_marking_enabled: false,
  negative_marking_percentage: 0,
};

interface QuizBuilderProps {
  initialQuestions?: QuizQuestion[];
  initialConfig?: AssessmentConfig;
  onQuestionsChange?: (questions: QuizQuestion[]) => void;
  onConfigChange?: (config: AssessmentConfig) => void;
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({
  initialQuestions,
  initialConfig,
  onQuestionsChange,
  onConfigChange,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions ?? []);

  // Sync from parent when initialQuestions change (e.g. on load from backend)
  useEffect(() => {
    if (initialQuestions) setQuestions(initialQuestions);
  }, [initialQuestions]);

  const updateQuestions = (next: QuizQuestion[]) => {
    setQuestions(next);
    onQuestionsChange?.(next);
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addQuestion = (type: QuestionType) => {
    let initialOptions: QuizOption[] | undefined;
    if (type === 'MCQ' || type === 'MSQ') {
      initialOptions = [
        { id: generateId(), text: 'Option 1', isCorrect: false },
        { id: generateId(), text: 'Option 2', isCorrect: false },
      ];
    } else if (type === 'TRUE_FALSE') {
      initialOptions = [
        { id: generateId(), text: 'True', isCorrect: true },
        { id: generateId(), text: 'False', isCorrect: false },
      ];
    }
    updateQuestions([...questions, { id: generateId(), type, prompt: '', scenarioText: '', options: initialOptions }]);
  };

  const removeQuestion = (id: string) => updateQuestions(questions.filter(q => q.id !== id));

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) =>
    updateQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));

  const addOption = (qId: string) =>
    updateQuestions(questions.map(q => {
      if (q.id === qId && q.options) {
        return { ...q, options: [...q.options, { id: generateId(), text: `Option ${q.options.length + 1}`, isCorrect: false }] };
      }
      return q;
    }));

  const updateOption = (qId: string, oId: string, text: string) =>
    updateQuestions(questions.map(q => {
      if (q.id === qId && q.options) {
        return { ...q, options: q.options.map(o => o.id === oId ? { ...o, text } : o) };
      }
      return q;
    }));

  const toggleCorrectOption = (qId: string, oId: string) =>
    updateQuestions(questions.map(q => {
      if (q.id === qId && q.options) {
        return {
          ...q,
          options: q.options.map(o => {
            if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') return { ...o, isCorrect: o.id === oId };
            return o.id === oId ? { ...o, isCorrect: !o.isCorrect } : o;
          }),
        };
      }
      return q;
    }));

  const removeOption = (qId: string, oId: string) =>
    updateQuestions(questions.map(q => {
      if (q.id === qId && q.options) return { ...q, options: q.options.filter(o => o.id !== oId) };
      return q;
    }));

  const renderQuestionIcon = (type: QuestionType) => {
    switch (type) {
      case 'MCQ': return <CheckCircle size={16} />;
      case 'MSQ': return <CheckCircle size={16} className="text-purple-400" />;
      case 'TRUE_FALSE': return <CheckCircle size={16} className="text-emerald-400" />;
      case 'DESCRIPTIVE': return <Type size={16} className="text-blue-400" />;
      case 'SCENARIO': return <FileText size={16} className="text-amber-400" />;
      case 'FILE_UPLOAD': return <UploadCloud size={16} className="text-red-400" />;
      default: return <CheckCircle size={16} />;
    }
  };

  const renderOptions = (q: QuizQuestion) => {
    if (!q.options) return null;
    return (
      <div className="mt-4 space-y-2 pl-6">
        {q.options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-3">
            <button
              onClick={() => toggleCorrectOption(q.id, opt.id)}
              className={cn(
                "w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0",
                opt.isCorrect ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-600 bg-slate-900",
                q.type === 'MSQ' && "rounded-sm"
              )}
              title="Mark as correct answer"
            >
              {opt.isCorrect && <CheckCircle size={12} />}
            </button>
            <input
              type="text"
              value={opt.text}
              disabled={q.type === 'TRUE_FALSE'}
              onChange={e => updateOption(q.id, opt.id, e.target.value)}
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
              placeholder={`Option ${idx + 1}`}
            />
            {q.type !== 'TRUE_FALSE' && q.options!.length > 2 && (
              <button onClick={() => removeOption(q.id, opt.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {q.type !== 'TRUE_FALSE' && (
          <button onClick={() => addOption(q.id)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold mt-2 px-8">
            <Plus size={12} /> Add Option
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* ── Question List ── */}
      <div className="space-y-6">
        {questions.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-slate-700/50 rounded-lg bg-slate-900/20">
            <p className="text-slate-400 text-sm">No questions added yet. Add a question below to start building your assessment.</p>
          </div>
        ) : (
          questions.map((q, index) => (
            <div key={q.id} className="bg-[#161a25] border border-slate-700 rounded-xl p-5 shadow-lg group">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-800 text-slate-400 text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-800/50 rounded-full border border-slate-700 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    {renderQuestionIcon(q.type)}
                    {q.type.replace('_', ' ')}
                  </div>
                </div>
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  title="Remove Question"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {q.type === 'SCENARIO' && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 block">Scenario / Reading Passage</label>
                  <textarea
                    rows={3}
                    value={q.scenarioText}
                    onChange={e => updateQuestion(q.id, { scenarioText: e.target.value })}
                    className="w-full bg-[#0a0c10] border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300 focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Provide the context or scenario for this question..."
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 block">Question Prompt</label>
                <input
                  type="text"
                  value={q.prompt}
                  onChange={e => updateQuestion(q.id, { prompt: e.target.value })}
                  className="w-full bg-[#0a0c10] border border-slate-700 rounded-lg px-4 py-3 text-white font-medium focus:border-blue-500 focus:outline-none"
                  placeholder="Enter your question here..."
                />
              </div>

              {renderOptions(q)}

              {q.type === 'FILE_UPLOAD' && (
                <div className="mt-4 p-4 border border-slate-700 border-dashed rounded-lg bg-slate-800/20 text-center">
                  <UploadCloud className="mx-auto text-slate-500 mb-2" size={24} />
                  <p className="text-xs text-slate-400">Learners will be prompted with a file upload dialog for this assignment.</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Add Controls ── */}
      <div className="p-5 border border-slate-700 rounded-xl bg-slate-800/30">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Add New Question</p>
        <div className="flex flex-wrap gap-2">
          {([
            ['MCQ', 'MCQ'],
            ['MSQ', 'Multiple Select'],
            ['TRUE_FALSE', 'True/False'],
            ['DESCRIPTIVE', 'Descriptive'],
            ['SCENARIO', 'Scenario'],
            ['FILE_UPLOAD', 'File Assignment'],
          ] as [QuestionType, string][]).map(([type, label]) => (
            <button
              key={type}
              onClick={() => addQuestion(type)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md border border-slate-700 transition flex items-center gap-1.5"
            >
              <Plus size={14} /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
