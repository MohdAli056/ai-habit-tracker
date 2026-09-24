import { BrainCircuit, Check, Flame, Sparkles } from 'lucide-react';
import { PageContainer } from '../layout/PageContainer.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Card } from '../ui/Card.jsx';

const mockHabits = [
  { label: 'Morning walk', detail: '20 minutes', complete: true, color: 'preview-lime' },
  { label: 'Read fiction', detail: '10 pages', complete: true, color: 'preview-violet' },
  { label: 'Water break', detail: '2 glasses left', complete: false, color: 'preview-sky' },
];

const heatmap = [1, 2, 0, 3, 2, 1, 3, 0, 2, 3, 1, 2, 0, 3, 1, 2, 3, 1, 0, 2, 3, 2, 1, 3, 0, 2, 1, 3];

export function ProductPreview() {
  return (
    <section id="preview" className="landing-section preview-section">
      <PageContainer>
        <div className="section-intro centered-intro">
          <Badge tone="neutral">A glance, not a spreadsheet</Badge>
          <h2>See the shape of your consistency.</h2>
          <p>Future Cadence screens will bring today’s actions, weekly momentum, and useful patterns into one calming workspace.</p>
        </div>
        <div className="product-window" aria-label="Static preview of the future Cadence workspace">
          <aside className="preview-sidebar" aria-hidden="true">
            <span className="preview-logo"><Sparkles size={15} /></span>
            <span className="preview-sidebar-item active" />
            <span className="preview-sidebar-item" />
            <span className="preview-sidebar-item" />
          </aside>
          <div className="preview-main">
            <div className="preview-window-header">
              <div><p>Tuesday, May 14</p><h3>Good afternoon, Sam</h3></div>
              <Badge tone="success"><Flame size={13} aria-hidden="true" /> 7 day rhythm</Badge>
            </div>
            <div className="preview-content-grid">
              <Card className="preview-habits-card" variant="soft">
                <div className="preview-card-heading"><span>Today’s promises</span><strong>2 of 3</strong></div>
                {mockHabits.map((habit) => (
                  <div className="preview-habit-row" key={habit.label}>
                    <span className={`preview-check ${habit.complete ? 'is-complete' : ''}`}>{habit.complete && <Check size={12} aria-hidden="true" />}</span>
                    <span className={`preview-habit-dot ${habit.color}`} />
                    <span><strong>{habit.label}</strong><small>{habit.detail}</small></span>
                  </div>
                ))}
              </Card>
              <Card className="preview-week-card" variant="soft">
                <div className="preview-card-heading"><span>This week</span><strong>76%</strong></div>
                <div className="preview-bars" aria-hidden="true">
                  <span style={{ height: '42%' }} /><span style={{ height: '70%' }} /><span style={{ height: '54%' }} />
                  <span style={{ height: '88%' }} /><span style={{ height: '67%' }} /><span style={{ height: '78%' }} /><span style={{ height: '35%' }} />
                </div>
                <div className="preview-day-row"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
              </Card>
              <Card className="preview-insight-card" variant="elevated">
                <span className="preview-insight-icon"><BrainCircuit size={17} aria-hidden="true" /></span>
                <div><p>Pattern cue</p><strong>Short walks are easiest right after your last meeting.</strong></div>
              </Card>
              <Card className="preview-heatmap-card" variant="soft">
                <div className="preview-card-heading"><span>Recent cadence</span><strong>28 days</strong></div>
                <div className="preview-heatmap" aria-hidden="true">
                  {heatmap.map((level, index) => <span key={index} className={`heat-level-${level}`} />)}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
