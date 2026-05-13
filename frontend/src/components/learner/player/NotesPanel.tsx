/**
 * NotesPanel — private learner notes for a course.
 *
 * Notes are scoped to the enrollment. Each note can optionally be tied to a
 * specific lesson. The panel groups notes by lesson (course-level notes appear
 * at the top under "General"), and allows inline create / edit / delete.
 */

import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Plus, Check, X, Loader2, StickyNote } from 'lucide-react';
import { CourseNote } from '@/types/courses.types';
import { CourseLesson, CourseSection } from '@/types/courses.types';
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from '@/queries/learner/useNotesQueries';

// ── helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Auto-grow textarea ────────────────────────────────────────────────────────

interface NoteTextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  minRows?: number;
}

const NoteTextarea = ({
  value, onChange, placeholder = 'Write a note…', autoFocus, minRows = 2,
}: NoteTextareaProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      rows={minRows}
      style={{ overflow: 'hidden' }}
      className="w-full text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 leading-relaxed"
    />
  );
};

// ── Single note card ──────────────────────────────────────────────────────────

interface NoteCardProps {
  note: CourseNote;
  enrollmentId: number;
}

const NoteCard = ({ note, enrollmentId }: NoteCardProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.note_text);

  const updateNote = useUpdateNote(enrollmentId);
  const deleteNote = useDeleteNote(enrollmentId);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === note.note_text) { setEditing(false); return; }
    updateNote.mutate(
      { id: note.id, data: { note_text: trimmed } },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleCancel = () => {
    setDraft(note.note_text);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className="group relative bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
      {editing ? (
        <div className="flex flex-col gap-2">
          <NoteTextarea
            value={draft}
            onChange={setDraft}
            autoFocus
            minRows={3}
          />
          <div onKeyDown={handleKeyDown} className="flex items-center justify-end gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={12} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!draft.trim() || updateNote.isPending}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {updateNote.isPending
                ? <Loader2 size={12} className="animate-spin" />
                : <Check size={12} />}
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap pr-14">
            {note.note_text}
          </p>

          {/* Action buttons — visible on hover */}
          <div className="absolute top-3 right-2 flex items-center gap-1 bg-white rounded-sm opacity-0.2 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              title="Edit note"
              className="p-1 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => deleteNote.mutate(note.id)}
              disabled={deleteNote.isPending}
              title="Delete note"
              className="p-1 rounded text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              {deleteNote.isPending
                ? <Loader2 size={13} className="animate-spin" />
                : <Trash2 size={13} />}
            </button>
            <span className="text-[11px] text-gray-500 block">
              {relativeTime(note.updated_at)}
              {note.updated_at !== note.created_at && ' · edited'}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

// ── Compose box for a new note ────────────────────────────────────────────────

interface ComposeNoteProps {
  enrollmentId: number;
  lessonId?: number | null;
  onDone?: () => void;
}

const ComposeNote = ({ enrollmentId, lessonId, onDone }: ComposeNoteProps) => {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const createNote = useCreateNote(enrollmentId);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || createNote.isPending) return;
    createNote.mutate(
      { lesson_id: lessonId ?? null, note_text: trimmed },
      {
        onSuccess: () => {
          setText('');
          setOpen(false);
          onDone?.();
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
    if (e.key === 'Escape') { setText(''); setOpen(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors py-1"
      >
        <Plus size={13} />
        Add note
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2" onKeyDown={handleKeyDown}>
      <NoteTextarea
        value={text}
        onChange={setText}
        placeholder="Write a note… (Ctrl+Enter to save)"
        autoFocus
        minRows={3}
      />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => { setText(''); setOpen(false); }}
          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={12} /> Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || createNote.isPending}
          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {createNote.isPending
            ? <Loader2 size={12} className="animate-spin" />
            : <Plus size={12} />}
          Save note
        </button>
      </div>
    </div>
  );
};

// ── Lesson group ──────────────────────────────────────────────────────────────

interface LessonGroupProps {
  label: string;
  notes: CourseNote[];
  enrollmentId: number;
  lessonId?: number | null;
}

const LessonGroup = ({ label, notes, enrollmentId, lessonId }: LessonGroupProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {/* Label spans full width */}
    <div className="flex items-center gap-2 col-span-full">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
        {label}
      </span>
    </div>

    {/* Note cards populate the grid columns */}
    {notes.map(note => (
      <NoteCard key={note.id} note={note} enrollmentId={enrollmentId} />
    ))}

    {/* Compose box spans full width to provide enough typing space */}
    <div className="col-span-full">
      <ComposeNote enrollmentId={enrollmentId} lessonId={lessonId} />
    </div>
  </div>
);

// ── Main panel ────────────────────────────────────────────────────────────────

interface NotesPanelProps {
  enrollmentId: number;
  /** Full section list from the course — used to build lesson groups. */
  sections: CourseSection[];
  /** Currently active lesson — its group is shown first. */
  activeLessonId?: number | null;
}

export const NotesPanel = ({ enrollmentId, sections, activeLessonId }: NotesPanelProps) => {
  const { data: notes, isLoading } = useNotes(enrollmentId);

  // Flatten all lessons in display order
  const allLessons: CourseLesson[] = sections.flatMap(s => s.lessons ?? []);

  // Partition notes
  const generalNotes = (notes ?? []).filter(n => n.lesson === null);
  const notesByLesson = (notes ?? []).reduce<Record<number, CourseNote[]>>((acc, n) => {
    if (n.lesson !== null) {
      acc[n.lesson] = [...(acc[n.lesson] ?? []), n];
    }
    return acc;
  }, {});

  // Build ordered lesson groups — active lesson first, then rest
  const orderedLessons = activeLessonId
    ? [
        ...allLessons.filter(l => l.id === activeLessonId),
        ...allLessons.filter(l => l.id !== activeLessonId),
      ]
    : allLessons;

  // Only show lesson groups that have notes OR are the active lesson
  const visibleLessons = orderedLessons.filter(
    l => l.id === activeLessonId || (notesByLesson[l.id]?.length ?? 0) > 0,
  );

  const totalNotes = (notes ?? []).length;

  return (
    <div className="w-full px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          {isLoading ? 'Notes' : `${totalNotes} Note${totalNotes !== 1 ? 's' : ''}`}
        </h2>
        <span className="text-xs text-gray-400 mt-0.5">(Visible only to you)</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Active lesson group — always shown at top if a lesson is selected */}
          {activeLessonId && (
            <LessonGroup
              key={`active-${activeLessonId}`}
              label={
                allLessons.find(l => l.id === activeLessonId)?.lesson_title ?? 'Current Lesson'
              }
              notes={notesByLesson[activeLessonId] ?? []}
              enrollmentId={enrollmentId}
              lessonId={activeLessonId}
            />
          )}

          {/* Other lesson groups that have notes */}
          {visibleLessons
            .filter(l => l.id !== activeLessonId)
            .map(lesson => (
              <LessonGroup
                key={lesson.id}
                label={lesson.lesson_title}
                notes={notesByLesson[lesson.id] ?? []}
                enrollmentId={enrollmentId}
                lessonId={lesson.id}
              />
            ))}

          {/* General / course-level notes */}
          <LessonGroup
            label="General (course-level)"
            notes={generalNotes}
            enrollmentId={enrollmentId}
            lessonId={null}
          />

          {/* Empty state */}
          {totalNotes === 0 && !activeLessonId && (
            <div className="text-center py-10 text-gray-400">
              <StickyNote size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No notes yet</p>
              <p className="text-xs mt-1">Select a lesson and start taking notes.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
