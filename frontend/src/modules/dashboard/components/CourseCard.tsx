import React from 'react';
import { Play, Code, Users, Shield, Globe } from 'lucide-react';

interface CourseCardProps {
  title: string;
  category: string;
  progress: number;
  thumbClass: string;
  accentColor: string;
  icon: React.ElementType;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  title, category, progress, thumbClass, accentColor, icon: Icon
}) => {
  return (
    <div className="course-card">
      <div className={`course-thumb ${thumbClass}`}>
        <Icon className="course-thumb-icon" size={48} color="#fff" strokeWidth={1} />
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
          <button className="course-resume-btn" style={{ color: accentColor }}>
            {progress >= 100 ? 'Review' : 'Resume'}
            <Play size={11} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};
