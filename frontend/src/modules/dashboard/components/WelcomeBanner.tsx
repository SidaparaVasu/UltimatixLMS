import React from 'react';
import { Zap, Play } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useMyEnrollments } from '@/queries/learner/useLearnerQueries';
import { useNavigate } from 'react-router-dom';

export const WelcomeBanner: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const firstName = user?.profile?.first_name || user?.username || 'there';

  const { data: enrollmentsData } = useMyEnrollments({ status: 'IN_PROGRESS' });
  const inProgressCourses = enrollmentsData?.results || [];

  // Pick the most recently started course to resume
  const resumeCourse = inProgressCourses.sort((a, b) => {
    const aTime = a.started_at ? new Date(a.started_at).getTime() : 0;
    const bTime = b.started_at ? new Date(b.started_at).getTime() : 0;
    return bTime - aTime;
  })[0];

  const progress = resumeCourse
    ? Math.round(parseFloat(resumeCourse.progress_percentage))
    : 0;

  return (
    <div className="welcome-banner anim">
      <div className="welcome-left">
        <div className="welcome-greeting">Welcome back, {firstName}.</div>
        <div className="welcome-sub">
          {inProgressCourses.length > 0
            ? `You have ${inProgressCourses.length} course${inProgressCourses.length > 1 ? 's' : ''} in progress.`
            : 'Start your learning journey today.'}
        </div>
        <div className="welcome-streak">
          <Zap size={12} fill="currentColor" />
          Keep learning every day
        </div>
      </div>

      {resumeCourse ? (
        <div className="welcome-right">
          <div className="resume-label">Continue where you left off</div>
          <div className="resume-title">{resumeCourse.course_title}</div>
          <div className="resume-meta">{resumeCourse.category_name}</div>
          <div className="resume-progress-track">
            <div className="resume-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="resume-progress-row">
            <span className="resume-pct">{progress}% complete</span>
          </div>
          <button
            className="resume-btn"
            onClick={() => navigate(`/learn/${resumeCourse.id}`)}
          >
            <Play size={14} fill="currentColor" />
            Resume Learning
          </button>
        </div>
      ) : (
        <div className="welcome-right">
          <div className="resume-label">Get started</div>
          <div className="resume-title">Explore the course catalog</div>
          <div className="resume-meta">Find courses that match your goals</div>
          <button className="resume-btn" onClick={() => navigate('/courses')}>
            <Play size={14} fill="currentColor" />
            Browse Courses
          </button>
        </div>
      )}
    </div>
  );
};
