import React from 'react';
import { BookOpen, Star, Clock, User } from 'lucide-react';

interface RecommendedCardProps {
  title: string;
  trainer: string;
  level: 'Basic' | 'Intermediate' | 'Advanced';
  duration: string;
  category: string;
  rating: string;
  accColor: string;
}

const RecommendedCard: React.FC<RecommendedCardProps> = ({
  title, trainer, level, duration, category, rating, accColor
}) => {
  const lvlClass = level === 'Basic' ? 'lvl-basic' : level === 'Intermediate' ? 'lvl-inter' : 'lvl-adv';

  return (
    <div className="rec-card">
      <div className="rec-card-bar" style={{ background: accColor }} />
      <div className="rec-card-body">
        <div className="rec-cat-tag" style={{ color: accColor }}>
          {category}
        </div>
        <div className="rec-title">{title}</div>
        <div className="rec-trainer">Instructor: {trainer}</div>
        
        <div className="rec-footer">
          <div className="rec-meta">
            <div className="rec-meta-item">
              <Clock size={12} /> {duration}
            </div>
            <div className="rec-meta-item">
              <Star size={12} fill="#FFB800" stroke="#FFB800" /> {rating}
            </div>
          </div>
          <span className={`level-badge ${lvlClass}`}>{level}</span>
        </div>
      </div>
    </div>
  );
};

export const RecommendedCourses: React.FC = () => {
  const recs: RecommendedCardProps[] = [
    {
      title: "UI/UX Design Systems with Figma",
      trainer: "Sarah Chen",
      level: "Intermediate",
      duration: "8h 45m",
      category: "Design",
      rating: "4.9",
      accColor: "var(--color-accent)"
    },
    {
      title: "Microservices Architecture with Go",
      trainer: "David Miller",
      level: "Advanced",
      duration: "12h 20m",
      category: "Development",
      rating: "4.8",
      accColor: "var(--color-info)"
    },
    {
      title: "Effective Communication at Workplace",
      trainer: "Emily Watson",
      level: "Basic",
      duration: "3h 15m",
      category: "Soft Skills",
      rating: "4.7",
      accColor: "var(--color-success)"
    }
  ];

  return (
    <div className="anim delay-4">
      <div className="section-header">
        <span className="section-title">Recommended for You</span>
        <a href="#" className="section-link">Browse all</a>
      </div>
      <div className="rec-grid">
        {recs.map((rec) => (
          <RecommendedCard key={rec.title} {...rec} />
        ))}
      </div>
    </div>
  );
};
