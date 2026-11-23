import React from 'react';

export default function EmptyState({
  icon = '✓',
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}) {
  return (
    <div className={`ux-empty-state ${compact ? 'ux-empty-state--compact' : ''}`}>
      <span className="ux-empty-state__icon" aria-hidden="true">{icon}</span>
      <div className="ux-empty-state__copy">
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <button type="button" className="ux-button ux-button--primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
