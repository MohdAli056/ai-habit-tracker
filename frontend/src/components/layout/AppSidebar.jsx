/**
 * AppSidebar — navigation sidebar for authenticated users.
 *
 * Desktop: Sticky/fixed left sidebar.
 * Mobile: Responsive top bar with collapsible navigation panel.
 */

import {
  BarChart3,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { BrandMark } from '../landing/BrandMark.jsx';
import { IconButton } from '../ui/IconButton.jsx';
import { ThemeToggle } from '../ui/ThemeToggle.jsx';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/habits',    label: 'Habits',    icon: CheckSquare },
  { path: '/weekly',    label: 'Weekly',    icon: Calendar },
  { path: '/insights',  label: 'Insights',  icon: Sparkles },
  { path: '/statistics',label: 'Statistics',icon: BarChart3 },
  { path: '/settings',  label: 'Settings',  icon: Settings },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer on screen resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 900) {
        setIsMobileOpen(false);
      }
    }
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const closeMobile = () => setIsMobileOpen(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <>
      {/* Mobile Top Header */}
      <header className="app-mobile-header" aria-label="Mobile application navigation">
        <BrandMark />
        <div className="app-mobile-header-actions">
          <ThemeToggle />
          <IconButton
            onClick={() => setIsMobileOpen((prev) => !prev)}
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          </IconButton>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="app-sidebar-backdrop"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`app-sidebar ${isMobileOpen ? 'app-sidebar-open' : ''}`}
        aria-label="Application sidebar"
      >
        <div className="app-sidebar-top">
          <div className="app-sidebar-brand">
            <BrandMark />
          </div>

          <nav className="app-sidebar-nav" aria-label="Main links">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `app-sidebar-link ${isActive ? 'app-sidebar-link-active' : ''}`
                }
              >
                <Icon size={18} className="app-sidebar-link-icon" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="app-sidebar-bottom">
          <div className="app-sidebar-user">
            <div className="app-sidebar-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="app-sidebar-user-info">
              <span className="app-sidebar-user-name">{user?.name || 'User'}</span>
              <span className="app-sidebar-user-email">{user?.email || ''}</span>
            </div>
          </div>

          <div className="app-sidebar-footer-actions">
            <ThemeToggle />
            <button
              type="button"
              className="app-sidebar-logout-btn"
              onClick={handleLogout}
              aria-label="Log out"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default AppSidebar;
