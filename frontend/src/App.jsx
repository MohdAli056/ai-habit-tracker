import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { HabitsPage } from './pages/HabitsPage.jsx';
import { InsightsPage } from './pages/InsightsPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { PlaceholderPage } from './pages/PlaceholderPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { StatisticsPage } from './pages/StatisticsPage.jsx';
import { WeeklyPage } from './pages/WeeklyPage.jsx';

function App() {
  return (
    <AppShell>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes wrapped in AppLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/weekly" element={<WeeklyPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={<PlaceholderPage title="Page not found" description="The page you are looking for does not exist." />}
        />
      </Routes>
    </AppShell>
  );
}

export default App;
