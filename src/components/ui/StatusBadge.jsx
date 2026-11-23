import React from 'react';

const NORMALIZED_TONES = new Set([
  'success',
  'warning',
  'danger',
  'info',
  'neutral',
  'pending',
]);

const toneForStatus = (status) => {
  const value = String(status || '').toLowerCase();

  if (['completed', 'done', 'synced', 'active', 'registered', 'confirmed'].includes(value)) {
    return 'success';
  }
  if (['pending', 'scheduled', 'processing', 'uploading', 'requested', 'syncing', 'cancelling'].includes(value)) {
    return 'pending';
  }
  if (['failed', 'error', 'cancelled', 'rejected', 'expired', 'no_show_mentor', 'no_show_mentee'].includes(value)) {
    return 'danger';
  }
  if (['warning', 'attention', 'missing', 'inactive'].includes(value)) {
    return 'warning';
  }
  if (['available', 'new', 'unread'].includes(value)) {
    return 'info';
  }
  return 'neutral';
};

export default function StatusBadge({ status, tone, children, className = '' }) {
  const resolvedTone = NORMALIZED_TONES.has(tone) ? tone : toneForStatus(status);
  return (
    <span className={`ux-status-badge ux-status-badge--${resolvedTone} ${className}`.trim()}>
      {children ?? String(status || '').replace(/_/g, ' ')}
    </span>
  );
}
