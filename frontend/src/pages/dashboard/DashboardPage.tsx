import { WelcomeBanner } from '@/modules/dashboard/components/WelcomeBanner';
import { StatsGrid } from '@/modules/dashboard/components/StatsGrid';
import { CourseStrip } from '@/modules/dashboard/components/CourseStrip';
import { SkillGapPanel } from '@/modules/dashboard/components/SkillGapPanel';
import { CalendarPanel } from '@/modules/dashboard/components/CalendarPanel';
import { ComplianceTracker } from '@/modules/dashboard/components/ComplianceTracker';
import { ActivityFeed, NotificationPanel } from '@/modules/dashboard/components/BottomPanels';
import { RecommendedCourses } from '@/modules/dashboard/components/RecommendedCourses';
import { GamificationStrip } from '@/modules/dashboard/components/GamificationStrip';

const DashboardPage: React.FC = () => {
  return (
    <>
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
    </>
  );
};

export default DashboardPage;
