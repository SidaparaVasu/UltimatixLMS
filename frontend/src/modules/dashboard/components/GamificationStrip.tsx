import React from 'react';
import { Trophy, Zap, Cloud, Shield, Users, ChevronRight } from 'lucide-react';

export const GamificationStrip: React.FC = () => {
  const badges = [
    { icon: Zap, color: '#E8833A', bg: '#FDF1E8', tip: 'Fast Learner' },
    { icon: Cloud, color: '#2870B8', bg: '#EBF5FF', tip: 'Cloud Explorer' },
    { icon: Shield, color: '#2E8B5E', bg: '#E8F5EE', tip: 'Compliance Hero' },
    { icon: Users, color: '#7C3AED', bg: '#F3EDFF', tip: 'Team Player' },
  ];

  return (
    <div className="gamification-panel anim delay-1">
      <div className="gami-stat">
        <span className="gami-stat-label">Learning Points</span>
        <span className="gami-stat-value">1,250</span>
      </div>
      
      <div className="gami-divider" />
      
      <div className="gami-stat">
        <span className="gami-stat-label">Department Rank</span>
        <span className="gami-rank-value">#9</span>
        <span className="gami-rank-sub">of 48 in IT Ops</span>
      </div>
      
      <div className="gami-divider" />
      
      <div className="gami-stat">
        <span className="gami-stat-label">Earned Badges</span>
      </div>
      
      <div className="gami-badges-wrap">
        {badges.map((badge, i) => (
          <div 
            key={i} 
            className="gami-badge-item" 
            style={{ background: badge.bg }}
            data-tip={badge.tip}
          >
            <badge.icon size={18} color={badge.color} strokeWidth={1.5} />
          </div>
        ))}
      </div>
      
      <div className="gami-divider" />
      
      <a href="#" className="gami-link">
        View Leaderboard
        <ChevronRight size={13} strokeWidth={2.5} />
      </a>
    </div>
  );
};
