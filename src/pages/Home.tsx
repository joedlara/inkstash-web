import { useState, useEffect } from 'react';
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
import PopularShows from '../components/home/PopularShows';
import Categories from '../components/home/Categories';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import MobileBottomNav from '../components/home/MobileBottomNav';

export default function Home() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user needs onboarding
  useEffect(() => {
    if (!loading && user && !user.onboarding_completed) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user, loading]);

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
    <>
      <div className="home authenticated">
        <DashboardHeader />
        <DashboardSidebar />
        <div className="dashboard-content">
          <div className="categories-mobile-only">
            <Categories />
          </div>
          <FeaturedCollectibles />
          <LiveStreams />
          <PopularShows />
          <div className="categories-desktop-only">
            <Categories />
          </div>
        </div>
        <MobileBottomNav />
      </div>

      {/* Onboarding Modal - shows if user hasn't completed onboarding */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => {
          // Onboarding can only be closed after username step
          // This is handled in the modal itself
          setShowOnboarding(false);
        }}
      />
    </>
  );
}
