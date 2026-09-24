import { Link } from 'react-router-dom';
import { PageContainer } from '../layout/PageContainer.jsx';
import { BrandMark } from './BrandMark.jsx';

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <PageContainer className="landing-footer-content">
        <div className="footer-brand">
          <BrandMark />
          <p>AI-assisted habit tracking for a steadier kind of progress.</p>
        </div>
        <div className="footer-links">
          <div><span>Explore</span><a href="#features">Features</a><a href="#how-it-works">How it works</a></div>
          <div><span>Account</span><Link to="/login">Log in</Link><Link to="/register">Create account</Link></div>
        </div>
        <p className="footer-copyright">© {new Date().getFullYear()} Cadence</p>
      </PageContainer>
    </footer>
  );
}
