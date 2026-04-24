import React from 'react';
import { Check, Play, Award, HelpCircle, Bell, TriangleAlert, BookOpen, Star, Clock } from 'lucide-react';
import { useMyEnrollments } from '@/queries/learner/useLearnerQueries';
import { formatDistanceToNow } from 'date-fns';

// ---------------------------------------------------------------------------
// Activity Feed — wired to real enrollment history
// ---------------------------------------------------------------------------

export const ActivityFeed: React.FC = () => {
  const { data: enrollmentsData, isLoading } = useMyEnrollments();
  const enrollments = enrollmentsData?.results || [];

  // Build activity items from enrollment data
  const activities = enrollments
    .filter((e) => e.started_at || e.completed_at)
    .sort((a, b) => {
      const aTime = new Date(a.completed_at || a.started_at || a.enrolled_at).getTime();
      const bTime = new Date(b.completed_at || b.started_at || b.enrolled_at).getTime();
      return bTime - aTime;
    })
    .slice(0, 5)
    .map((e) => {
      if (e.status === 'COMPLETED' && e.completed_at) {
        return {
          icon: Check,
          type: 'complete',
          title: 'Completed course',
          course: e.course_title,
          time: formatDistanceToNow(new Date(e.completed_at), { addSuffix: true }),
        };
      }
      if (e.status === 'IN_PROGRESS' && e.started_at) {
        return {
          icon: Play,
          type: 'started',
          title: 'Started course',
          course: e.course_title,
          time: formatDistanceToNow(new Date(e.started_at), { addSuffix: true }),
        };
      }
      return {
        icon: BookOpen,
        type: 'enrolled',
        title: 'Enrolled in',
        course: e.course_title,
        time: formatDistanceToNow(new Date(e.enrolled_at), { addSuffix: true }),
      };
    });

  return (
    <div className="activity-panel anim delay-5">
      <div className="panel-head">
        <span className="panel-title">Recent Activity</span>
      </div>

      {isLoading ? (
        <div style={{ padding: 'var(--space-5)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="activity-item">
              <div className="pulse" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-border)', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="pulse" style={{ height: 10, width: '70%', background: 'var(--color-border)', borderRadius: 4 }} />
                <div className="pulse" style={{ height: 10, width: '40%', background: 'var(--color-border)', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          No activity yet. Start a course to see your progress here.
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((act, i) => (
            <div key={i} className="activity-item">
              <div className={`activity-icon act-${act.type}`}>
                <act.icon size={16} />
              </div>
              <div className="activity-text">
                {act.title} <strong>{act.course}</strong>
              </div>
              <div className="activity-time">{act.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Notification Panel
// ---------------------------------------------------------------------------

export const NotificationPanel: React.FC = () => {
  const notifications = [
    {
      title: 'Notifications coming soon',
      body: 'In-app notifications will be available in a future update.',
      unread: false,
      icon: Bell,
      type: 'assign',
    },
  ];

  return (
    <div className="activity-panel anim delay-6">
      <div className="panel-head">
        <span className="panel-title">Notifications</span>
      </div>
      <div className="activity-list">
        {notifications.map((notif, i) => (
          <div key={i} className={`notif-item ${notif.unread ? 'unread' : ''}`}>
            <div className={`notif-icon ni-${notif.type}`}>
              <notif.icon size={16} />
            </div>
            <div className="notif-content">
              <div className="notif-title">{notif.title}</div>
              <div className="notif-body">{notif.body}</div>
            </div>
            {notif.unread && <div className="notif-unread-dot" />}
          </div>
        ))}
      </div>
    </div>
  );
};
