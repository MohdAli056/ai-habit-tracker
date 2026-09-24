/**
 * AppLayout — wrapper layout for authenticated application pages.
 *
 * Provides the persistent sidebar on desktop, mobile top-bar on mobile,
 * and a scrollable content area.
 */

import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar.jsx';

export function AppLayout() {
  return (
    <div className="app-layout">
      <AppSidebar />
      <main className="app-main" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
