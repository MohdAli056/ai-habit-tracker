import { BarChart3, BrainCircuit, CalendarDays, HeartHandshake, Lightbulb, Route, Sparkles, TimerReset } from 'lucide-react';
import { PageContainer } from '../layout/PageContainer.jsx';
import { Grid } from '../layout/Grid.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Card } from '../ui/Card.jsx';

const features = [
  { icon: CalendarDays, title: 'Smart habit tracking', text: 'Keep daily commitments visible without making them feel heavy.' },
  { icon: Route, title: 'Streak awareness', text: 'Celebrate the rhythm you are building, not just a number.' },
  { icon: BarChart3, title: 'Weekly progress', text: 'Zoom out to see how your energy and follow-through shift over time.' },
  { icon: Lightbulb, title: 'AI suggestions', text: 'Explore practical habit ideas shaped around the routines you want.' },
  { icon: BrainCircuit, title: 'Weekly insights', text: 'Turn your check-ins into a simple story about what is working.' },
  { icon: TimerReset, title: 'Recovery guidance', text: 'Find a gentle re-entry plan after life interrupts a streak.' },
  { icon: Sparkles, title: 'Personal motivation', text: 'Start the day with a thoughtful nudge that meets you where you are.' },
  { icon: HeartHandshake, title: 'Data with context', text: 'Use clear, human-scale statistics to make your next choice easier.' },
];

export function FeatureGrid() {
  return (
    <section id="features" className="landing-section features-section">
      <PageContainer>
        <div className="section-intro">
          <Badge tone="accent">Designed for follow-through</Badge>
          <h2>Every signal should make the next step clearer.</h2>
          <p>Cadence is planned as a small collection of tools that support consistency without turning your day into a dashboard.</p>
        </div>
        <Grid columns="four" className="feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="landing-feature-card" variant="soft">
              <span className="landing-feature-icon"><Icon size={20} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Card>
          ))}
        </Grid>
      </PageContainer>
    </section>
  );
}
