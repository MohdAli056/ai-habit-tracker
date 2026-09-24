import { CheckCircle2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../layout/PageContainer.jsx';
import { Badge } from '../ui/Badge.jsx';
import { ThemeToggle } from '../ui/ThemeToggle.jsx';
import { BrandMark } from '../landing/BrandMark.jsx';

const notes = ['A calm daily check-in', 'Patterns that stay human', 'Optional AI guidance, on your terms'];

export function AuthLayout({ children, description, eyebrow, footer, title }) {
  return (
    <main className="auth-page">
      <PageContainer className="auth-container">
        <header className="auth-header">
          <BrandMark />
          <div className="auth-header-actions">
            <Link to="/" className="auth-back-link">Back to home</Link>
            <ThemeToggle />
          </div>
        </header>
        <div className="auth-grid">
          <section className="auth-card" aria-labelledby="auth-title">
            <Badge tone="accent">{eyebrow}</Badge>
            <h1 id="auth-title">{title}</h1>
            <p className="auth-description">{description}</p>
            {children}
            {footer}
          </section>
          <aside className="auth-aside">
            <div className="auth-aside-glow" aria-hidden="true" />
            <div className="auth-aside-content">
              <span className="auth-aside-icon"><Sparkles size={22} aria-hidden="true" /></span>
              <p className="eyebrow">A steadier rhythm</p>
              <h2>Small choices deserve a thoughtful home.</h2>
              <p>Cadence will bring habits, gentle reflection, and useful signals together in one uncluttered space.</p>
              <ul>
                {notes.map((note) => <li key={note}><CheckCircle2 size={17} aria-hidden="true" /> {note}</li>)}
              </ul>
            </div>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
