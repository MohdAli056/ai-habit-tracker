import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button.jsx';
import { IconButton } from '../ui/IconButton.jsx';
import { ThemeToggle } from '../ui/ThemeToggle.jsx';
import { BrandMark } from './BrandMark.jsx';

const navigation = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#preview', label: 'Preview' },
];

export function LandingNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleResize() {
      if (window.innerWidth >= 768) setIsMenuOpen(false);
    }
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen]);

  return (
    <header className="landing-header">
      <nav className="landing-nav page-container" aria-label="Main navigation">
        <BrandMark />
        <div className="desktop-nav-links">
          {navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </div>
        <div className="nav-actions">
          <ThemeToggle />
          <Link className="nav-login" to="/login">Log in</Link>
          <Button as={Link} to="/register" size="sm">Get started</Button>
          <IconButton
            className="mobile-menu-button"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            {isMenuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </IconButton>
        </div>
      </nav>
      <div id="mobile-navigation" className={`mobile-nav-panel ${isMenuOpen ? 'mobile-nav-open' : ''}`}>
        <div className="page-container mobile-nav-content">
          {navigation.map((item) => <a key={item.href} href={item.href} onClick={closeMenu}>{item.label}</a>)}
          <Link to="/login" onClick={closeMenu}>Log in</Link>
          <Button as={Link} to="/register" fullWidth onClick={closeMenu}>Get started</Button>
        </div>
      </div>
    </header>
  );
}
