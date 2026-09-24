import { ArrowRight, PlayCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../layout/PageContainer.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { HeroVisualization } from './HeroVisualization.jsx';

export function LandingHero() {
  return (
    <section className="landing-hero">
      <PageContainer className="landing-hero-grid">
        <div className="landing-hero-copy">
          <Badge tone="accent"><Sparkles size={13} aria-hidden="true" /> AI-assisted habit tracking</Badge>
          <p className="eyebrow">A quieter way to grow</p>
          <h1>Make your routines feel easier to return to.</h1>
          <p className="landing-lede">
            Cadence helps you notice progress, stay close to your intentions, and find a kinder next step when a routine slips.
          </p>
          <div className="hero-actions">
            <Button as={Link} to="/register" size="lg">Start your rhythm <ArrowRight size={17} aria-hidden="true" /></Button>
            <a className="hero-secondary-link" href="#preview"><PlayCircle size={18} aria-hidden="true" /> See the workspace</a>
          </div>
          <p className="hero-assurance">Built for real life—one day, one small promise at a time.</p>
        </div>
        <HeroVisualization />
      </PageContainer>
    </section>
  );
}
