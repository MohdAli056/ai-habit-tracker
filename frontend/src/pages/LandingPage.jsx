import { FeatureGrid } from '../components/landing/FeatureGrid.jsx';
import { HowItWorks } from '../components/landing/HowItWorks.jsx';
import { LandingCta } from '../components/landing/LandingCta.jsx';
import { LandingFooter } from '../components/landing/LandingFooter.jsx';
import { LandingHero } from '../components/landing/LandingHero.jsx';
import { LandingNavbar } from '../components/landing/LandingNavbar.jsx';
import { ProductPreview } from '../components/landing/ProductPreview.jsx';

export function LandingPage() {
  return (
    <>
      <LandingNavbar />
      <main>
        <LandingHero />
        <ProductPreview />
        <FeatureGrid />
        <HowItWorks />
        <LandingCta />
      </main>
      <LandingFooter />
    </>
  );
}
