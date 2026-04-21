import React, { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle, FileText, UploadCloud, Type, Clock, Percent, RefreshCw, Shuffle, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { AssessmentConfig } from '@/api/assessment-api';

export type QuestionType = 'MCQ' | 'MULTIPLE_SELECT' | 'TRUE_FALSE' | 'DESCRIPTIVE' | 'SCENARIO' | 'FILE_UPLOAD';

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
  const [config, setConfig] = useState<AssessmentConfig>(initialConfig ?? DEFAULT_ASSESSMENT_CONFIG);
  const [passingPctError, setPassingPctError] = useState<string | null>(null);

  // Sync from parent when initialQuestions/initialConfig change (e.g. on load from backend)
  useEffect(() => {
    if (initialQuestions) setQuestions(initialQuestions);
  }, [initialQuestions]);

  useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
  }, [initialConfig]);

  const updateQuestions = (next: QuizQuestion[]) => {
    setQuestions(next);
    onQuestionsChange?.(next);
  };

  const updateConfig = (patch: Partial<AssessmentConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    onConfigChange?.(next);
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addQuestion = (type: QuestionType) => {
    let initialOptions: QuizOption[] | undefined;
    if (type === 'MCQ' || type === 'MULTIPLE_SELECT') {
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
      case 'MULTIPLE_SELECT': return <CheckCircle size={16} className="text-purple-400" />;
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
                q.type === 'MULTIPLE_SELECT' && "rounded-sm"
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

      {/* ── Assessment Configuration Panel ── */}
      <div className="bg-[#0f111a] border border-slate-700/60 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Clock size={12} /> Assessment Settings
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Clock size={10} /> Duration (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={config.duration_minutes}
              onChange={e => updateConfig({ duration_minutes: Math.max(1, parseInt(e.target.value) || 1) })}
              className="bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Passing % */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Percent size={10} /> Passing % (0–100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={config.passing_percentage}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (v < 0 || v > 100) {
                  setPassingPctError('Must be between 0 and 100');
                } else {
                  setPassingPctError(null);
                }
                updateConfig({ passing_percentage: v });
              }}
              className={cn(
                "bg-slate-800/50 border rounded px-3 py-2 text-sm text-white focus:outline-none",
                passingPctError ? "border-red-500 focus:border-red-500" : "border-slate-700 focus:border-blue-500"
              )}
            />
            {passingPctError && (
              <p className="text-[10px] text-red-400 flex items-center gap-1">
                <AlertCircle size={10} /> {passingPctError}
              </p>
            )}
          </div>

          {/* Retake Limit */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <RefreshCw size={10} /> Retake Limit (0 = unlimited)
            </label>
            <input
              type="number"
              min={0}
              value={config.retake_limit}
              onChange={e => updateConfig({ retake_limit: Math.max(0, parseInt(e.target.value) || 0) })}
              className="bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Randomize */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Shuffle size={10} /> Randomize Questions
            </label>
            <button
              onClick={() => updateConfig({ is_randomized: !config.is_randomized })}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded border text-xs font-semibold transition-colors",
                config.is_randomized
                  ? "bg-blue-500/10 border-blue-500 text-blue-400"
                  : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >
              <div className={cn("w-3 h-3 rounded-full", config.is_randomized ? "bg-blue-400" : "bg-slate-600")} />
              {config.is_randomized ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Negative Marking */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Negative Marking
            </label>
            <button
              onClick={() => updateConfig({ negative_marking_enabled: !config.negative_marking_enabled })}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-semibold transition-colors",
                config.negative_marking_enabled
                  ? "bg-red-500/10 border-red-500/50 text-red-400"
                  : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >
              <div className={cn("w-2.5 h-2.5 rounded-full", config.negative_marking_enabled ? "bg-red-400" : "bg-slate-600")} />
              {config.negative_marking_enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {config.negative_marking_enabled && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Deduction % per wrong answer
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.negative_marking_percentage}
                onChange={e => updateConfig({ negative_marking_percentage: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                className="bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none w-40"
              />
            </div>
          )}
        </div>
      </div>

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
            ['MULTIPLE_SELECT', 'Multiple Select'],
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
