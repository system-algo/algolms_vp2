import React, { useEffect, useState } from 'react';

import EmptyState from '../../../components/ui/EmptyState.jsx';
import { SkeletonLine } from '../../../components/ui/Skeleton.jsx';
import { searchAccessibleMessages } from '../api/enhancements.js';

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date);
};

export default function MessagingSearchModal({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return undefined;
    const normalized = query.trim();
    if (normalized.length < 3) {
      setResults([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await searchAccessibleMessages(normalized, { limit: 40 });
        if (!cancelled) setResults(rows);
      } catch (nextError) {
        if (!cancelled) setError(nextError?.message || 'Message search is unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  if (!open) return null;

  const openResult = (row) => {
    const params = new URLSearchParams({ message: row.message_id });
    if (row.reply_to_id) params.set('thread', row.reply_to_id);
    if (row.context_type === 'direct') {
      window.location.hash = `#messages/direct/${encodeURIComponent(row.context_id)}?${params.toString()}`;
    } else {
      window.location.hash = `#messages/${encodeURIComponent(row.community_code || '')}/${encodeURIComponent(row.context_id)}?${params.toString()}`;
    }
    onClose?.();
  };

  return (
    <div className="messaging-search-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section className="messaging-search-modal" role="dialog" aria-modal="true" aria-label="Search messages">
        <header>
          <div>
            <span>MESSAGE SEARCH</span>
            <h3>Find a conversation</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close message search">×</button>
        </header>

        <label className="messaging-search-input">
          <span aria-hidden="true">⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search messages or sender…"
          />
        </label>

        <div className="messaging-search-results">
          {loading ? (
            <div className="messaging-search-skeleton">
              {[0, 1, 2, 3].map((item) => <div key={item}><SkeletonLine width="32%" /><SkeletonLine width="78%" /></div>)}
            </div>
          ) : error ? (
            <EmptyState compact icon="!" title="Search unavailable" description={error} />
          ) : query.trim().length < 3 ? (
            <EmptyState compact icon="⌕" title="Search across your messages" description="Type at least three characters. Only conversations you can access are searched." />
          ) : results.length === 0 ? (
            <EmptyState compact icon="✓" title="No matching messages" description={`Nothing matched “${query.trim()}”. Try a sender name or another phrase.`} />
          ) : results.map((row) => (
            <button key={`${row.context_type}-${row.message_id}`} type="button" className="messaging-search-result" onClick={() => openResult(row)}>
              <div className="messaging-search-result__meta">
                <strong>{row.author_name}</strong>
                <span>{row.context_label || (row.context_type === 'direct' ? 'Direct message' : 'Channel')}</span>
                <time>{formatTime(row.created_at)}</time>
              </div>
              {row.attachment_file_name ? (
                <span className="messaging-search-result__attachment">📎 {row.attachment_file_name}</span>
              ) : null}
              <p>{row.content || (row.attachment_file_name ? 'Attachment message' : 'Attachment')}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
