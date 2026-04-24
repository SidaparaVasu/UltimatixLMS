import React from 'react';
import { Play, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CourseCardProps {
  enrollmentId: number;
  title: string;
  category: string;
  progress: number;
  thumbClass: string;
  accentColor: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  enrollmentId, title, category, progress, thumbClass, accentColor,
}) => {
  const navigate = useNavigate();

  return (
    <div className="course-card">
      <div className={`course-thumb ${thumbClass}`}>
        <BookOpen className="course-thumb-icon" size={48} strokeWidth={1} />
        <div className="course-cat-stripe" style={{ background: accentColor }} />
      </div>
      <div className="course-body">
        <div className="course-tag" style={{ color: accentColor }}>
          {category}
        </div>
        <div className="course-title" title={title}>{title}</div>
        <div className="course-progress-track">
          <div
            className="course-progress-fill"
            style={{ width: `${progress}%`, background: accentColor }}
          />
        </div>
        <div className="course-progress-row">
          <span className="course-pct">{progress}%</span>
          <button
            className="course-resume-btn"
            style={{ color: accentColor }}
            onClick={() => navigate(`/learn/${enrollmentId}`)}
          >
            {progress >= 100 ? 'Review' : 'Resume'}
            <Play size={11} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};
