/**
 * ConfirmDialog — lightweight confirmation overlay.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showDelete}
 *     title="Delete habit?"
 *     description="This cannot be undone."
 *     confirmLabel="Delete"
 *     danger
 *     loading={deleting}
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowDelete(false)}
 *   />
 */

import { Button } from '../ui/Button.jsx';

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', danger = false, loading = false, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="confirm-panel">
        <h2 id="confirm-title" className="confirm-title">{title}</h2>
        {description && <p className="confirm-description">{description}</p>}
        <div className="confirm-actions">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
