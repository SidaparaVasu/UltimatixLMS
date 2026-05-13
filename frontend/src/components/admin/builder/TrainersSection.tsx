/**
 * TrainersSection — manages course trainers inside CourseMapSettings.
 *
 * Supports both internal employees (selected via combobox) and external
 * trainers (free-form fields revealed when "External trainer?" is toggled).
 * Matches the dark studio theme of CourseMapSettings.
 */

import React, { useState } from 'react';
import {
  UserCheck, Plus, X, Loader2, AlertCircle, Pencil, Check,
  Star, StarOff, Phone, Mail, Info,
} from 'lucide-react';
import { CourseTrainer, CourseTrainerWritePayload } from '@/types/courses.types';
import { EmployeeDirectoryRow } from '@/types/org.types';
import { useTrainers, useAddTrainer, useUpdateTrainer, useRemoveTrainer } from '@/queries/admin/useTrainerQueries';
import { useEmployees } from '@/queries/admin/useAdminMasters';
import { cn } from '@/utils/cn';

// ── helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Trainer card (read mode) ──────────────────────────────────────────────────

interface TrainerCardProps {
  trainer: CourseTrainer;
  courseId: number;
  onEdit: () => void;
}

const TrainerCard: React.FC<TrainerCardProps> = ({ trainer, courseId, onEdit }) => {
  const remove = useRemoveTrainer(courseId);
  const update = useUpdateTrainer(courseId);

  const togglePrimary = () => {
    update.mutate({ id: trainer.id, data: { is_primary: !trainer.is_primary } });
  };

  return (
    <div className="group flex items-start gap-2 px-2 py-2 bg-slate-800/40 border border-slate-700/50 rounded text-[11px]">

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-200 truncate">{trainer.display_name}</span>
          {trainer.is_primary && (
            <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold uppercase tracking-wide">
              Primary
            </span>
          )}
          {trainer.is_external && (
            <span className="px-1 py-0.5 rounded bg-slate-700 text-slate-400 text-[9px] font-bold uppercase tracking-wide">
              External
            </span>
          )}
        </div>
        {trainer.display_email && (
          <div className="flex items-center gap-1 text-slate-500 mt-0.5">
            <Mail size={9} />
            <span className="truncate">{trainer.display_email}</span>
          </div>
        )}
        {trainer.trainer_contact && (
          <div className="flex items-center gap-1 text-slate-500">
            <Phone size={9} />
            <span>{trainer.trainer_contact}</span>
          </div>
        )}
        {trainer.trainer_info && (
          <div className="flex items-start gap-1 text-slate-500 mt-0.5">
            <Info size={9} className="mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{trainer.trainer_info}</span>
          </div>
        )}
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={togglePrimary}
          disabled={update.isPending}
          title={trainer.is_primary ? 'Remove primary' : 'Set as primary'}
          className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors"
        >
          {update.isPending
            ? <Loader2 size={11} className="animate-spin" />
            : trainer.is_primary
              ? <StarOff size={11} />
              : <Star size={11} />}
        </button>
        <button
          onClick={onEdit}
          title="Edit trainer"
          className="p-1 rounded text-slate-500 hover:text-blue-400 transition-colors"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={() => remove.mutate(trainer.id)}
          disabled={remove.isPending}
          title="Remove trainer"
          className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
        >
          {remove.isPending
            ? <Loader2 size={11} className="animate-spin" />
            : <X size={11} />}
        </button>
      </div>
    </div>
  );
};

// ── Trainer form (add / edit) ─────────────────────────────────────────────────

interface TrainerFormProps {
  courseId: number;
  allEmployees: EmployeeDirectoryRow[];
  initial?: CourseTrainer;
  onDone: () => void;
}

const EMPTY_FORM: CourseTrainerWritePayload = {
  is_external: false,
  employee: null,
  trainer_name: '',
  trainer_email: '',
  trainer_contact: '',
  trainer_info: '',
  is_primary: false,
};

const TrainerForm: React.FC<TrainerFormProps> = ({
  courseId, allEmployees, initial, onDone,
}) => {
  const isEdit = !!initial;

  const [form, setForm] = useState<CourseTrainerWritePayload>(
    initial
      ? {
          is_external: initial.is_external,
          employee: initial.employee,
          trainer_name: initial.trainer_name,
          trainer_email: initial.trainer_email,
          trainer_contact: initial.trainer_contact,
          trainer_info: initial.trainer_info,
          is_primary: initial.is_primary,
        }
      : { ...EMPTY_FORM },
  );

  const [error, setError] = useState<string | null>(null);
  const [empSearch, setEmpSearch] = useState('');

  const addTrainer = useAddTrainer(courseId);
  const updateTrainer = useUpdateTrainer(courseId);
  const isPending = addTrainer.isPending || updateTrainer.isPending;

  const set = <K extends keyof CourseTrainerWritePayload>(
    key: K,
    value: CourseTrainerWritePayload[K],
  ) => setForm(prev => ({ ...prev, [key]: value }));

  // Filter employees by search
  const filteredEmployees = allEmployees.filter(e => {
    const q = empSearch.toLowerCase();
    const name = (e.full_name || `${e.first_name} ${e.last_name}`).toLowerCase();
    return name.includes(q) || e.employee_code.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
  });

  const handleSubmit = async () => {
    setError(null);

    // Client-side validation mirrors service rules
    if (!form.is_external && !form.employee) {
      setError('Please select an employee.');
      return;
    }
    if (form.is_external && !form.trainer_name?.trim()) {
      setError('Trainer name is required for external trainers.');
      return;
    }
    if (form.is_external && !form.trainer_email?.trim()) {
      setError('Trainer email is required for external trainers.');
      return;
    }

    const payload: CourseTrainerWritePayload = form.is_external
      ? { ...form, employee: null }
      : { ...form, trainer_name: '', trainer_email: '', trainer_contact: '', trainer_info: '' };

    if (isEdit && initial) {
      updateTrainer.mutate(
        { id: initial.id, data: payload },
        { onSuccess: onDone, onError: () => setError('Failed to update trainer.') },
      );
    } else {
      addTrainer.mutate(payload, {
        onSuccess: onDone,
        onError: () => setError('Failed to add trainer.'),
      });
    }
  };

  return (
    <div className="space-y-3 p-3 bg-slate-800/30 border border-slate-700/50 rounded">

      {/* External toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          onClick={() => set('is_external', !form.is_external)}
          className={cn(
            'w-8 h-4 rounded-full transition-colors relative flex-shrink-0',
            form.is_external ? 'bg-blue-500' : 'bg-slate-600',
          )}
        >
          <div className={cn(
            'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
            form.is_external ? 'translate-x-4' : 'translate-x-0.5',
          )} />
        </div>
        <span className="text-[11px] text-slate-400">External trainer?</span>
      </label>

      {/* Internal — employee combobox */}
      {!form.is_external && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Employee
          </label>
          <input
            type="text"
            value={empSearch}
            onChange={e => setEmpSearch(e.target.value)}
            placeholder="Search by name, code or email…"
            className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 transition"
          />
          {empSearch && (
            <div className="max-h-36 overflow-y-auto space-y-0.5 border border-slate-700 rounded bg-slate-900">
              {filteredEmployees.length === 0 ? (
                <p className="text-[10px] text-slate-500 px-2 py-2">No employees found.</p>
              ) : (
                filteredEmployees.slice(0, 8).map(e => {
                  const name = e.full_name || `${e.first_name} ${e.last_name}`.trim();
                  const selected = form.employee === e.id;
                  return (
                    <button
                      key={e.id}
                      onClick={() => { set('employee', e.id); setEmpSearch(''); }}
                      className={cn(
                        'w-full text-left px-2.5 py-1.5 text-[11px] transition-colors',
                        selected
                          ? 'bg-blue-600/20 text-blue-300'
                          : 'text-slate-300 hover:bg-slate-800',
                      )}
                    >
                      <span className="font-medium">{name}</span>
                      <span className="text-slate-500 ml-1.5">({e.employee_code})</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
          {/* Selected employee chip */}
          {form.employee && !empSearch && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-[11px] text-blue-300">
              <UserCheck size={11} />
              <span className="flex-1 truncate">
                {allEmployees.find(e => e.id === form.employee)?.full_name
                  || allEmployees.find(e => e.id === form.employee)?.employee_code
                  || `Employee #${form.employee}`}
              </span>
              <button onClick={() => set('employee', null)} className="text-blue-400 hover:text-red-400">
                <X size={10} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* External — free-form fields */}
      {form.is_external && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.trainer_name}
              onChange={e => set('trainer_name', e.target.value)}
              placeholder="Full name"
              className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.trainer_email}
              onChange={e => set('trainer_email', e.target.value)}
              placeholder="trainer@example.com"
              className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Contact No.
            </label>
            <input
              type="text"
              value={form.trainer_contact}
              onChange={e => set('trainer_contact', e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Bio / Info
            </label>
            <textarea
              rows={2}
              value={form.trainer_info}
              onChange={e => set('trainer_info', e.target.value)}
              placeholder="Short bio or expertise…"
              className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>
        </div>
      )}

      {/* Primary toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.is_primary}
          onChange={e => set('is_primary', e.target.checked)}
          className="accent-amber-400 w-3 h-3"
        />
        <span className="text-[11px] text-slate-400">Set as primary trainer</span>
      </label>

      {/* Error */}
      {error && (
        <p className="text-[10px] text-red-400 flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onDone}
          className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-bold rounded transition-colors"
        >
          {isPending
            ? <Loader2 size={10} className="animate-spin" />
            : <Check size={10} />}
          {isEdit ? 'Update' : 'Add Trainer'}
        </button>
      </div>
    </div>
  );
};

// ── Main section ──────────────────────────────────────────────────────────────

interface TrainersSectionProps {
  courseId: number;
}

export const TrainersSection: React.FC<TrainersSectionProps> = ({ courseId }) => {
  const { data: trainers, isLoading } = useTrainers(courseId);
  // Fetch all employees for the internal trainer combobox
  const { data: employeesRes } = useEmployees({ page_size: 100000 });
  const allEmployees: EmployeeDirectoryRow[] = employeesRes?.results ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<CourseTrainer | null>(null);

  const list = trainers ?? [];

  const handleEditDone = () => setEditingTrainer(null);
  const handleAddDone = () => setShowForm(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <UserCheck size={12} /> Trainers
        </h4>
        {!showForm && !editingTrainer && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus size={10} /> Add
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <TrainerForm
          courseId={courseId}
          allEmployees={allEmployees}
          onDone={handleAddDone}
        />
      )}

      {/* Trainer list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-[10px] text-slate-500 py-2">
          <Loader2 size={12} className="animate-spin" /> Loading trainers…
        </div>
      ) : list.length === 0 && !showForm ? (
        <p className="text-xs text-slate-500 italic">No trainers assigned yet.</p>
      ) : (
        <div className="space-y-1.5">
          {list.map(trainer =>
            editingTrainer?.id === trainer.id ? (
              <TrainerForm
                key={trainer.id}
                courseId={courseId}
                allEmployees={allEmployees}
                initial={trainer}
                onDone={handleEditDone}
              />
            ) : (
              <TrainerCard
                key={trainer.id}
                trainer={trainer}
                courseId={courseId}
                onEdit={() => { setEditingTrainer(trainer); setShowForm(false); }}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
};
