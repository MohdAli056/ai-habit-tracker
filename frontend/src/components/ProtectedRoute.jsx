/**
 * ProtectedRoute — redirect unauthenticated users to /login.
 *
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<PlaceholderPage ... />} />
 *     ...
 *   </Route>
 */

import { Navigate, Outlet } from 'react-router-dom';
import { LoadingSpinner } from './ui/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          minHeight: '100vh',
          placeItems: 'center',
        }}
        role="status"
        aria-label="Checking authentication"
      >
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
