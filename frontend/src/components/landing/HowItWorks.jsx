import { ArrowRight } from 'lucide-react';
import { PageContainer } from '../layout/PageContainer.jsx';
import { Badge } from '../ui/Badge.jsx';

const steps = [
  { title: 'Choose a few promises', text: 'Start with the routines you want to make easier to repeat.' },
  { title: 'Mark the moments', text: 'Keep daily check-ins quick, clear, and satisfying.' },
  { title: 'Notice your rhythm', text: 'Review small patterns across a week or a season.' },
  { title: 'Adjust with support', text: 'Use optional AI guidance to shape a kinder next step.' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-section flow-section">
      <PageContainer>
        <div className="flow-layout">
          <div className="section-intro flow-intro">
            <Badge tone="success">A simple loop</Badge>
            <h2>Progress is a practice, not a perfect run.</h2>
            <p>Cadence is being built around a repeatable cycle: choose, check in, understand, and begin again.</p>
          </div>
          <ol className="flow-steps">
            {steps.map((step, index) => (
              <li key={step.title} className="flow-step">
                <span className="flow-number">0{index + 1}</span>
                <div><h3>{step.title}</h3><p>{step.text}</p></div>
                {index < steps.length - 1 && <ArrowRight className="flow-arrow" size={18} aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </div>
      </PageContainer>
    </section>
  );
}
