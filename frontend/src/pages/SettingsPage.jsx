/**
 * SettingsPage — Profile settings and AI preferences.
 *
 * Implements Phase 15 requirements:
 *   - Allows toggling `morningMotivation` preference on/off.
 *   - Wires directly to `updateProfile({ morningMotivation })` in AuthContext.
 *   - Shows saving indicator and instant feedback.
 *   - Respects user data without redesigning existing layouts.
 */

import { Check, Loader2, LogOut, Settings as SettingsIcon, Sparkles, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [error, setError] = useState(null);

  const morningMotivation = user?.morningMotivation ?? true;

  const handleToggleMotivation = async (e) => {
    const newValue = e.target.checked;
    setSaving(true);
    setError(null);
    setSavedFeedback(false);

    try {
      await updateProfile({ morningMotivation: newValue });
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    } catch (err) {
      console.error('Failed to update morning motivation setting:', err);
      setError('Could not update preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <PageContainer className="settings-page">
      <header className="settings-header">
        <div className="settings-header-badge">
          <SettingsIcon size={15} aria-hidden="true" />
          <span>Preferences & Account</span>
        </div>
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">
          Manage your account profile and configure personalized AI habit features.
        </p>
      </header>

      <div className="settings-content-grid">
        {/* Profile Details Card */}
        <Card className="settings-card" variant="soft">
          <div className="settings-card-header">
            <div className="settings-card-icon-wrap bg-primary-soft text-primary">
              <UserIcon size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 className="settings-section-title">Profile Information</h2>
              <p className="muted-copy">Your personal account details</p>
            </div>
          </div>

          <div className="settings-fields-list">
            <div className="settings-field-row">
              <span className="settings-field-label">Name</span>
              <span className="settings-field-value">{user?.name || 'User'}</span>
            </div>
            <div className="settings-field-row">
              <span className="settings-field-label">Email</span>
              <span className="settings-field-value">{user?.email || 'N/A'}</span>
            </div>
          </div>
        </Card>

        {/* AI Preferences Card */}
        <Card className="settings-card" variant="strong">
          <div className="settings-card-header">
            <div className="settings-card-icon-wrap bg-primary-soft text-primary">
              <Sparkles size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 className="settings-section-title">AI Assistance Preferences</h2>
              <p className="muted-copy">Control intelligent coaching and guidance on your dashboard</p>
            </div>
          </div>

          <div className="settings-preference-item">
            <div className="settings-preference-info">
              <label htmlFor="morning-motivation-toggle" className="settings-preference-title">
                AI Morning Motivation
              </label>
              <p className="settings-preference-description">
                Show a daily personalized motivational note on your Dashboard generated from your habit progress.
              </p>
            </div>

            <div className="settings-toggle-wrapper">
              <input
                id="morning-motivation-toggle"
                type="checkbox"
                className="settings-toggle-checkbox"
                checked={morningMotivation}
                onChange={handleToggleMotivation}
                disabled={saving}
                aria-label="Toggle AI Morning Motivation"
              />
              {saving && <Loader2 size={16} className="animate-spin text-primary" />}
              {savedFeedback && (
                <span className="settings-saved-pill">
                  <Check size={12} /> Saved
                </span>
              )}
            </div>
          </div>

          {error && <p className="settings-error-text">{error}</p>}
        </Card>

        {/* Session / Logout Card */}
        <Card className="settings-card" variant="soft">
          <div className="settings-card-header">
            <div className="settings-card-icon-wrap bg-danger-soft text-danger">
              <LogOut size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 className="settings-section-title">Account Session</h2>
              <p className="muted-copy">Sign out of your active browser session</p>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut size={15} aria-hidden="true" /> Log out
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

export default SettingsPage;
