/**
 * Threads are top-level comments. Replies are indented below each thread.
 */

import { useState, useRef, useEffect } from 'react';
import { ThumbsUp, Trash2, CornerDownRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { CourseDiscussionThread } from '@/types/courses.types';
import {
  useDiscussionThreads,
  useCreateThread,
  useCreateReply,
  useDeleteThread,
  useDeleteReply,
} from '@/queries/learner/useDiscussionQueries';

interface DiscussionPanelProps {
  courseId: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function avatarColor(name: string): string {
  const colors = [
    '#1a73e8', '#e8710a', '#1e8e3e', '#d93025',
    '#7b1fa2', '#0097a7', '#f57c00', '#455a64',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Avatar ────────────────────────────────────────────────────────────────────

const Avatar = ({ name, size = 36 }: { name: string; size?: number }) => (
  <div
    className="flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white select-none"
    style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.38 }}
  >
    {initials(name)}
  </div>
);

// ── Auto-grow textarea ────────────────────────────────────────────────────────

interface ComposBoxProps {
  placeholder: string;
  onSubmit: (text: string) => void;
  isPending?: boolean;
  submitLabel?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  compact?: boolean;
}

const ComposeBox = ({
  placeholder, onSubmit, isPending, submitLabel = 'Post',
  autoFocus, onCancel, compact,
}: ComposBoxProps) => {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(autoFocus ?? false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  // Auto-grow
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleSubmit = () => {
    const t = text.trim();
    if (!t || isPending) return;
    onSubmit(t);
    setText('');
    if (ref.current) ref.current.style.height = 'auto';
    setFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
  };

  return (
    <div className="flex gap-3 w-full">
      <div className="flex-1 flex flex-col">
        <textarea
          ref={ref}
          value={text}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          style={{ resize: 'none', overflow: 'hidden', minHeight: compact ? 36 : 40 }}
          className="w-full bg-transparent border-0 border-b border-gray-300 focus:border-gray-800 outline-none text-sm text-gray-900 placeholder-gray-400 py-1.5 transition-colors leading-relaxed"
        />
        {focused && (
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => { setText(''); setFocused(false); onCancel?.(); }}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isPending}
              className="px-4 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Single reply row ──────────────────────────────────────────────────────────

interface ReplyRowProps {
  reply: CourseDiscussionThread['replies'][number];
  isOwn: boolean;
  onDelete: () => void;
  isDeleting: boolean;
}

const ReplyRow = ({ reply, isOwn, onDelete, isDeleting }: ReplyRowProps) => (
  <div className="flex gap-3 group">
    <Avatar name={reply.author_name} size={28} />
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-900">{reply.author_name}</span>
        <span className="text-xs text-gray-400">{relativeTime(reply.created_at)}</span>
      </div>
      <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{reply.reply_text}</p>
    </div>
    {isOwn && (
      <button
        onClick={onDelete}
        disabled={isDeleting}
        title="Delete"
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 flex-shrink-0 self-start mt-0.5"
      >
        <Trash2 size={13} />
      </button>
    )}
  </div>
);

// ── Thread (top-level comment) ────────────────────────────────────────────────

interface ThreadRowProps {
  thread: CourseDiscussionThread;
  currentUserAuthId: number | null;
  courseId: number;
}

const ThreadRow = ({ thread, currentUserAuthId, courseId }: ThreadRowProps) => {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);

  const createReply = useCreateReply(courseId);
  const deleteThread = useDeleteThread(courseId);
  const deleteReply = useDeleteReply(courseId);

  const isOwn = currentUserAuthId === thread.created_by;
  const replyCount = thread.reply_count ?? thread.replies.length;

  const handleReply = (text: string) => {
    createReply.mutate(
      { thread: thread.id, reply_text: text },
      { onSuccess: () => { setShowReplies(true); setShowReplyBox(false); } }
    );
  };

  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <Avatar name={thread.author_name} size={36} />

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Author + time */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{thread.author_name}</span>
          <span className="text-xs text-gray-400">{relativeTime(thread.created_at)}</span>
        </div>

        {/* Thread title */}
        <p className="text-sm font-medium text-gray-900 mt-0.5">{thread.thread_title}</p>

        {/* Thread body */}
        {thread.thread_body && (
          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{thread.thread_body}</p>
        )}

        {/* Action row */}
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => { setShowReplyBox(v => !v); if (!showReplyBox) setShowReplies(true); }}
            className="px-3 py-1 rounded-full text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
          >
            <CornerDownRight size={12} />
            Reply
          </button>

          {replyCount > 0 && (
            <button
              onClick={() => setShowReplies(v => !v)}
              className="px-3 py-1 rounded-full text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {/* Replies */}
        {showReplies && (
          <div className="mt-3 flex flex-col gap-4 pl-1 border-l-2 border-gray-100 ml-1">
            {thread.replies.map(reply => (
              <ReplyRow
                key={reply.id}
                reply={reply}
                isOwn={currentUserAuthId === reply.created_by}
                onDelete={() => deleteReply.mutate(reply.id)}
                isDeleting={deleteReply.isPending}
              />
            ))}

            {showReplyBox && (
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <ComposeBox
                    placeholder="Add a reply…"
                    onSubmit={handleReply}
                    isPending={createReply.isPending}
                    submitLabel="Reply"
                    autoFocus
                    onCancel={() => setShowReplyBox(false)}
                    compact
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reply box when replies not shown yet */}
        {showReplyBox && !showReplies && (
          <div className="mt-3 pl-1">
            <ComposeBox
              placeholder="Add a reply…"
              onSubmit={handleReply}
              isPending={createReply.isPending}
              submitLabel="Reply"
              autoFocus
              onCancel={() => setShowReplyBox(false)}
              compact
            />
          </div>
        )}
      </div>

      {/* Delete own thread */}
      {isOwn && (
        <button
          onClick={() => deleteThread.mutate(thread.id)}
          disabled={deleteThread.isPending}
          title="Delete"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 flex-shrink-0 self-start mt-0.5"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────

export const DiscussionPanel = ({ courseId }: DiscussionPanelProps) => {
  const { user } = useAuthStore();
  const { data, isLoading } = useDiscussionThreads(courseId);
  const createThread = useCreateThread(courseId);
  const threads = data?.results ?? [];
  const currentUserAuthId = user?.id ?? null;

  const handlePost = (text: string) => {
    // Use the first line as title, rest as body — or just title if single line
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0];
    const body = lines.slice(1).join('\n').trim();
    createThread.mutate({ thread_title: title, thread_body: body });
  };

  return (
    <div className="w-full mx-auto px-6 py-6">

      {/* Header */}
      <div className="flex items-baseline gap-3 mb-6">
        <h2 className="text-base font-semibold text-gray-900">
          {isLoading ? 'Discussion' : `${threads.length} Comment${threads.length !== 1 ? 's' : ''}`}
        </h2>
      </div>

      {/* Compose box */}
      <div className="flex gap-3 mb-8">
        <Avatar name={user?.profile?.first_name ? `${user.profile.first_name} ${user.profile.last_name ?? ''}` : (user?.username ?? '?')} size={36} />
        <div className="flex-1">
          <ComposeBox
            placeholder="Ask a question or share your thoughts…"
            onSubmit={handlePost}
            isPending={createThread.isPending}
            submitLabel="Post"
          />
        </div>
      </div>

      {/* Thread list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-gray-400" />
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-sm font-medium">No comments yet</p>
          <p className="text-xs mt-1">Be the first to start the discussion.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {threads.map(thread => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              currentUserAuthId={currentUserAuthId}
              courseId={courseId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
