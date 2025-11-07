import { useAuth } from '../hooks/useAuth';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSectionOne from '../components/landing/HeroSectionOne';
import HeroSectionTwo from '../components/landing/HeroSectionTwo';
import HeroSectionThree from '../components/landing/HeroSectionThree';
import LandingFooter from '../components/landing/LandingFooter';
import DashboardHeader from '../components/home/DashboardHeader';
import DashboardSidebar from '../components/home/DashboardSidebar';
import LiveStreams from '../components/home/LiveStreams';
import FeaturedCollectibles from '../components/home/FeaturedCollectibles';

export default function Home() {
  const { user } = useAuth();

  // Show landing page for non-authenticated users
  if (!user) {
    return (
      <div className="home landing scroll-container">
        <LandingNavbar />
        <div className="scroll-section">
          <HeroSectionOne />
        </div>
        <div className="scroll-section">
          <HeroSectionTwo />
        </div>
        <div className="scroll-section section-with-footer">
          <HeroSectionThree />
          <LandingFooter />
        </div>
      </div>
    );
  }

  // Show dashboard/marketplace for authenticated users
  return (
    <div className="home authenticated">
      <DashboardHeader />
      <DashboardSidebar />
      <div className="dashboard-content">
        <FeaturedCollectibles />
        <LiveStreams />
      </div>
    </div>
  );
}
