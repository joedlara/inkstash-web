import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSectionOne from '../components/landing/HeroSectionOne';
import HeroSectionTwo from '../components/landing/HeroSectionTwo';
import HeroSectionThree from '../components/landing/HeroSectionThree';
import LandingFooter from '../components/landing/LandingFooter';
import CategoryNav from '../components/home/CategoryNav';
import LiveAuctionsGrid from '../components/home/LiveAuctionsGrid';
import FeaturedCreators from '../components/home/FeaturedCreators';
import CTASection from '../components/home/CTASection';
import type { CategoryType } from '../components/home/CategoryNav';

export default function Home() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');

  // Show landing page for non-authenticated users
  if (!user) {
    return (
      <div className="home landing">
        <LandingNavbar />
        <HeroSectionOne />
        <HeroSectionTwo />
        <HeroSectionThree />
        <LandingFooter />
      </div>
    );
  }

  // Show dashboard/marketplace for authenticated users
  return (
    <div className="home authenticated">
      <CategoryNav
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <LiveAuctionsGrid category={activeCategory} />
      <FeaturedCreators />
      <CTASection />
    </div>
  );
}
