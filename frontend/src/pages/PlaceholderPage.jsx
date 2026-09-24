import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function PlaceholderPage({ title, description }) {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <PageContainer className="placeholder-page">
      <Card className="placeholder-card">
        <p className="eyebrow">Route placeholder</p>
        <h1>{title}</h1>
        <p className="muted-copy">{description}</p>
        {isAuthenticated && (
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              Signed in as <strong style={{ color: 'var(--foreground)' }}>{user?.name}</strong>
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut size={15} aria-hidden="true" /> Log out
            </Button>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
