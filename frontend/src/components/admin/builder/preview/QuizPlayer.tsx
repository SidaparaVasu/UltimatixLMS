import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, UploadCloud, Type, FileText, Clock, RotateCcw, Award } from 'lucide-react';
import { cn } from '@/utils/cn';

// ─── Types (mirrors CurriculumTree/QuizBuilder definitions) ─────────────────
interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id: string;
  type: string;
  prompt: string;
  scenarioText?: string;
  options?: QuizOption[];
}

interface QuizSettings {
  passingScore: number;
  timeLimit: number;
  shuffleQuestions: boolean;
  attemptLimit: number;
}

interface QuizData {
  questions: QuizQuestion[];
  settings: QuizSettings;
}

interface QuizPlayerProps {
  quizData?: QuizData;
  lessonTitle?: string;
}

// ─── Learner answer map: questionId → selected option id(s) or text ──────────
type AnswerMap = Record<string, string | string[]>;

// ─── Quiz Phases ─────────────────────────────────────────────────────────────
type Phase = 'intro' | 'playing' | 'results';

/**
 * QuizPlayer — Learner-facing interactive quiz player.
 * Paginated one-question-at-a-time flow: Intro → Playing → Results.
 * Preview mode: shows correct answers in the results phase so authors can validate their quiz.
 * API-ready: scoring logic is isolated and can be POSTed to the backend when integrated.
 */
export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quizData, lessonTitle }) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});

  const questions = quizData?.questions || [];
  const settings = quizData?.settings;
  const total = questions.length;

  // ── Empty State ─────────────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-900/50 border border-dashed border-slate-700 text-slate-500 gap-3">
        <FileText size={36} className="opacity-30" />
        <p className="text-sm font-medium">No questions have been added to this quiz yet.</p>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const isAnswered = !!answers[currentQ?.id];
  const isLast = currentIdx === total - 1;

  // ── Answer Handlers ─────────────────────────────────────────────────────────
  const handleMCQ = (qId: string, oId: string) => {
    setAnswers(prev => ({ ...prev, [qId]: oId }));
  };

  const handleMultiSelect = (qId: string, oId: string) => {
    setAnswers(prev => {
      const current = (prev[qId] as string[]) || [];
      const updated = current.includes(oId)
        ? current.filter(id => id !== oId)
        : [...current, oId];
      return { ...prev, [qId]: updated };
    });
  };

  const handleDescriptive = (qId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [qId]: text }));
  };

  // ── Results Calculation ─────────────────────────────────────────────────────
  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (!q.options) return; // descriptive/file — skip scoring
      const answer = answers[q.id];
      if (!answer) return;

      if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
        const correctOpt = q.options.find(o => o.isCorrect);
        if (correctOpt && answer === correctOpt.id) correct++;
      } else if (q.type === 'MULTIPLE_SELECT') {
        const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id).sort();
        const selectedIds = ([...((answer as string[]) || [])]).sort();
        if (JSON.stringify(correctIds) === JSON.stringify(selectedIds)) correct++;
      }
    });
    return correct;
  };

  const handleSubmit = () => {
    setPhase('results');
  };

  const handleReset = () => {
    setPhase('intro');
    setCurrentIdx(0);
    setAnswers({});
  };

  // ── PHASE: INTRO ────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 p-10 text-center gap-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">{lessonTitle || 'Assessment'}</h2>
          <p className="text-sm text-slate-400">Test your knowledge with this assessment.</p>
        </div>

        {/* Quiz stats strip */}
        <div className="flex items-center gap-6 px-6 py-3 bg-slate-800/50 rounded-md border border-slate-700">
          <div className="text-center">
            <p className="text-lg font-black text-white">{total}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Questions</p>
          </div>
          {settings?.timeLimit ? (
            <div className="text-center border-l border-slate-700 pl-6">
              <p className="text-lg font-black text-white">{settings.timeLimit}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Minutes</p>
            </div>
          ) : null}
          {settings?.passingScore ? (
            <div className="text-center border-l border-slate-700 pl-6">
              <p className="text-lg font-black text-white">{settings.passingScore}%</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">To Pass</p>
            </div>
          ) : null}
        </div>

        {/* Preview mode notice */}
        <div className="px-4 py-2.5 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
          Preview Mode — Responses are not scored or saved
        </div>

        <button
          onClick={() => setPhase('playing')}
          className="px-8 py-3 bg-accent rounded-md hover:bg-accent text-white font-bold shadow-lg shadow-accent-900/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          Start Assessment
        </button>
      </div>
    );
  }

  // ── PHASE: RESULTS ──────────────────────────────────────────────────────────
  if (phase === 'results') {
    const score = calculateScore();
    const scorableQuestions = questions.filter(q => q.options && q.options.length > 0).length;
    const pct = scorableQuestions > 0 ? Math.round((score / scorableQuestions) * 100) : 0;
    const passed = pct >= (settings?.passingScore || 70);

    return (
      <div className="space-y-6">
        {/* Score card */}
        <div className={cn(
          'rounded-md border p-8 text-center space-y-4',
          passed
            ? 'bg-emerald-950/30 border-emerald-500/30'
            : 'bg-red-950/20 border-red-500/30'
        )}>
          <div className={cn(
            'mx-auto text-3xl font-black',
            passed ? 'text-emerald-400' : 'text-red-400'
          )}>
            {pct}%
            <h3 className={cn('text-xl font-bold', passed ? 'text-emerald-400' : 'text-red-400')}>
              {passed ? 'Passed' : 'Not Passed'}
            </h3>
          </div>
          <div>
            
            <p className="text-sm text-slate-400 mt-1">
              {score} of {scorableQuestions} scorable questions correct
              {settings?.passingScore && ` · Passing score: ${settings.passingScore}%`}
            </p>
          </div>
          <div className="px-4 py-2 text-amber-400 text-[11px] font-bold uppercase tracking-wider inline-block">
            Preview Mode — Correct answers shown for author review
          </div>
        </div>

        {/* Question-by-question review */}
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const userAnswer = answers[q.id];
            const correctOpt = q.options?.find(o => o.isCorrect);
            let isCorrect = false;

            if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
              isCorrect = !!correctOpt && userAnswer === correctOpt.id;
            } else if (q.type === 'MULTIPLE_SELECT' && q.options) {
              const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id).sort();
              const selectedIds = ([...((userAnswer as string[]) || [])]).sort();
              isCorrect = JSON.stringify(correctIds) === JSON.stringify(selectedIds);
            }

            const hasScore = !!(q.options && q.options.length > 0);

            return (
              <div key={q.id} className={cn(
                'rounded-md border p-5 space-y-3',
                !hasScore
                  ? 'border-slate-800 bg-slate-900/30'
                  : isCorrect
                  ? 'border-emerald-500/30 bg-emerald-950/20'
                  : 'border-red-500/20 bg-red-950/10'
              )}>
                <div className="flex items-start gap-3">
                  <span className={cn(
                    'flex items-center justify-center w-6 h-6 rounded text-[10px] font-black shrink-0 mt-0.5',
                    !hasScore ? 'bg-slate-800 text-slate-400'
                      : isCorrect ? 'bg-emerald-500 text-white'
                      : 'bg-red-500 text-white'
                  )}>
                    {idx + 1}
                  </span>
                  <p className="text-sm text-slate-200 font-medium leading-relaxed">{q.prompt || '(No prompt)'}</p>
                </div>

                {q.options && q.options.map(opt => {
                  const isSelected = q.type === 'MULTIPLE_SELECT'
                    ? (userAnswer as string[] || []).includes(opt.id)
                    : userAnswer === opt.id;

                  return (
                    <div key={opt.id} className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm border transition-colors',
                      opt.isCorrect
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : isSelected
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500'
                    )}>
                      <span className={cn(
                        'shrink-0 w-4 h-4 rounded-full border flex items-center justify-center text-[10px]',
                        opt.isCorrect ? 'border-emerald-500 bg-emerald-500 text-white'
                          : isSelected ? 'border-red-500 bg-red-500/20 text-red-400'
                          : 'border-slate-700'
                      )}>
                        {opt.isCorrect && '✓'}
                        {!opt.isCorrect && isSelected && '✗'}
                      </span>
                      {opt.text}
                      {opt.isCorrect && <span className="ml-auto text-[10px] text-emerald-400 font-bold uppercase">Correct</span>}
                    </div>
                  );
                })}

                {(q.type === 'DESCRIPTIVE' || q.type === 'FILE_UPLOAD') && (
                  <p className="text-[11px] text-slate-600 italic pl-9">
                    {q.type === 'DESCRIPTIVE' ? 'Open-ended — not auto-scored.' : 'File upload — not auto-scored.'}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium transition-colors"
        >
          <RotateCcw size={14} />
          Retake Preview
        </button>
      </div>
    );
  }

  // ── PHASE: PLAYING ──────────────────────────────────────────────────────────
  const progressPct = Math.round(((currentIdx) / total) * 100);

  return (
    <div className="space-y-5">
      {/* Progress bar + meta */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-bold">Question {currentIdx + 1} <span className="text-slate-600">of {total}</span></span>
          <div className="flex items-center gap-3">
            {settings?.timeLimit ? (
              <span className="flex items-center gap-1"><Clock size={11} /> {settings.timeLimit} min limit</span>
            ) : null}
            <span className="font-bold text-slate-400">{progressPct}% complete</span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-md border border-slate-700/80 bg-[#161a25] p-7 space-y-6">
        {/* Question type badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-purple-500/10 border-purple-500/20 text-purple-400">
            {currentQ.type.replace('_', ' ')}
          </span>
          {currentQ.type === 'MULTIPLE_SELECT' && (
            <span className="text-[10px] text-slate-500 italic">Select all that apply</span>
          )}
        </div>

        {/* Scenario block */}
        {currentQ.type === 'SCENARIO' && currentQ.scenarioText && (
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">Reading Passage</p>
            <p className="text-sm text-slate-300 leading-relaxed">{currentQ.scenarioText}</p>
          </div>
        )}

        {/* Question prompt */}
        <p className="text-base font-bold text-white leading-relaxed">
          {currentQ.prompt || <span className="text-slate-600 italic">(No prompt entered)</span>}
        </p>

        {/* Answer area */}
        <div className="space-y-2.5">
          {/* MCQ / True-False */}
          {(currentQ.type === 'MCQ' || currentQ.type === 'TRUE_FALSE') && currentQ.options?.map(opt => {
            const selected = answers[currentQ.id] === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleMCQ(currentQ.id, opt.id)}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-3.5 rounded-md border text-sm font-medium text-left transition-all',
                  selected
                    ? 'bg-purple-500/10 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                    : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition-colors',
                  selected ? 'border-purple-500 bg-purple-500' : 'border-slate-600'
                )}>
                  {selected && <CheckCircle size={12} className="text-white" />}
                </span>
                {opt.text}
              </button>
            );
          })}

          {/* Multiple Select */}
          {currentQ.type === 'MULTIPLE_SELECT' && currentQ.options?.map(opt => {
            const selected = ((answers[currentQ.id] as string[]) || []).includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => handleMultiSelect(currentQ.id, opt.id)}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-3.5 rounded-md border text-sm font-medium text-left transition-all',
                  selected
                    ? 'bg-purple-500/10 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                    : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded border shrink-0 flex items-center justify-center transition-colors',
                  selected ? 'border-purple-500 bg-purple-500' : 'border-slate-600'
                )}>
                  {selected && <CheckCircle size={12} className="text-white" />}
                </span>
                {opt.text}
              </button>
            );
          })}

          {/* Descriptive */}
          {currentQ.type === 'DESCRIPTIVE' && (
            <textarea
              rows={5}
              value={(answers[currentQ.id] as string) || ''}
              onChange={e => handleDescriptive(currentQ.id, e.target.value)}
              placeholder="Write your answer here..."
              className="w-full bg-[#0a0c10] border border-slate-700 rounded-md px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          )}

          {/* File Upload */}
          {currentQ.type === 'FILE_UPLOAD' && (
            <div className="flex flex-col items-center justify-center gap-3 p-8 border border-dashed border-slate-700 rounded-md bg-slate-900/30 text-slate-500">
              <UploadCloud size={28} className="opacity-30" />
              <p className="text-sm font-medium">File upload is disabled in preview mode.</p>
              <p className="text-[11px] text-slate-600">Students will see a file picker here.</p>
            </div>
          )}

          {/* Scenario — same options as MCQ */}
          {currentQ.type === 'SCENARIO' && currentQ.options?.map(opt => {
            const selected = answers[currentQ.id] === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleMCQ(currentQ.id, opt.id)}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-3.5 rounded-md border text-sm font-medium text-left transition-all',
                  selected
                    ? 'bg-purple-500/10 border-purple-500 text-purple-200'
                    : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-full border shrink-0 flex items-center justify-center',
                  selected ? 'border-purple-500 bg-purple-500' : 'border-slate-600'
                )}>
                  {selected && <CheckCircle size={12} className="text-white" />}
                </span>
                {opt.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-7 py-2.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-900/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Submit Quiz <Award size={16} />
          </button>
        ) : (
          <button
            onClick={() => setCurrentIdx(i => Math.min(total - 1, i + 1))}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors"
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
