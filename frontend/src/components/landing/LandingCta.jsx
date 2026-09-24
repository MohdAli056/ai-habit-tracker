import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../layout/PageContainer.jsx';
import { Button } from '../ui/Button.jsx';

export function LandingCta() {
  return (
    <section className="landing-section landing-cta-section">
      <PageContainer>
        <div className="landing-cta">
          <span className="landing-cta-orb orb-one" aria-hidden="true" />
          <span className="landing-cta-orb orb-two" aria-hidden="true" />
          <div>
            <p className="eyebrow"><Sparkles size={14} aria-hidden="true" /> Your next routine can start small</p>
            <h2>Give your intentions a place to come back to.</h2>
            <p>Create your Cadence account when you are ready to begin.</p>
          </div>
          <Button as={Link} to="/register" variant="secondary" size="lg">Create an account <ArrowRight size={17} aria-hidden="true" /></Button>
        </div>
      </PageContainer>
    </section>
  );
}
