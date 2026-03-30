import { WelcomeBanner } from '@/modules/dashboard/components/WelcomeBanner';
import { StatsGrid } from '@/modules/dashboard/components/StatsGrid';
import { CourseStrip } from '@/modules/dashboard/components/CourseStrip';
import { SkillGapPanel } from '@/modules/dashboard/components/SkillGapPanel';
import { CalendarPanel } from '@/modules/dashboard/components/CalendarPanel';

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
    </>
  );
};

export default DashboardPage;
