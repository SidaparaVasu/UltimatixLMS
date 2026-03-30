import { WelcomeBanner } from '@/modules/dashboard/components/WelcomeBanner';
import { StatsGrid } from '@/modules/dashboard/components/StatsGrid';
import { CourseStrip } from '@/modules/dashboard/components/CourseStrip';

const DashboardPage: React.FC = () => {
  return (
    <>
      <WelcomeBanner />
      <StatsGrid />
      <CourseStrip />
    </>
  );
};

export default DashboardPage;
