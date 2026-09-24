import { CircleDashed } from 'lucide-react';
import { Card } from './Card.jsx';

export function EmptyState({ action, description, icon: Icon = CircleDashed, title }) {
  return (
    <Card className="empty-state" variant="soft">
      <span className="empty-state-icon"><Icon size={22} aria-hidden="true" /></span>
      <div>
        <h3>{title}</h3>
        <p className="muted-copy">{description}</p>
      </div>
      {action}
    </Card>
  );
}
