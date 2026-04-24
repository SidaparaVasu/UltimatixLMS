import React from 'react';
import { WelcomeBanner } from '@/modules/dashboard/components/WelcomeBanner';
import { StatsGrid } from '@/modules/dashboard/components/StatsGrid';
import { CourseStrip } from '@/modules/dashboard/components/CourseStrip';
import { SkillGapPanel } from '@/modules/dashboard/components/SkillGapPanel';
import { CalendarPanel } from '@/modules/dashboard/components/CalendarPanel';
import { ComplianceTracker } from '@/modules/dashboard/components/ComplianceTracker';
import { RecommendedCourses } from '@/modules/dashboard/components/RecommendedCourses';
import { GamificationStrip } from '@/modules/dashboard/components/GamificationStrip';
import { ActivityFeed, NotificationPanel } from '@/modules/dashboard/components/BottomPanels';

const EmployeeDashboard: React.FC = () => {
  return (
    <div style={{ padding: 'var(--space-4) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <WelcomeBanner />
      <StatsGrid />
      <CourseStrip />

      <div className="two-col anim delay-3">
        <SkillGapPanel />
        <CalendarPanel />
      </div>

      <ComplianceTracker />
      <RecommendedCourses />
      <GamificationStrip />

      <div className="bottom-row anim delay-5">
        <ActivityFeed />
        <NotificationPanel />
      </div>
    </div>
  );
};

export default EmployeeDashboard;
