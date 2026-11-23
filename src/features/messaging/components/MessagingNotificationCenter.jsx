import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getMessagingUnreadSummary } from '../api/notifications.js';
import { getNotificationPreferences } from '../../platform/api/notifications.js';
import { subscribeToUserRealtime } from '../../platform/realtime/userRealtime.js';

import './MessagingNotificationCenter.css';

const MAX_VISIBLE_NOTICES = 3;
const NOTICE_TTL_MS = 10000;

const stripMessageMarkup = (value) =>
  String(value || '')
    .replace(/```[\s\S]*?```/g, 'Code snippet')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_+~`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const previewMessage = (message) => {
  const content = stripMessageMarkup(message?.content);
  if (!content) return 'Sent an attachment';
  return content.length > 110 ? `${content.slice(0, 107)}…` : content;
};

const buildQuery = (message) => {
  const params = new URLSearchParams();
  if (message?.id) params.set('message', message.id);
  if (message?.reply_to_id) params.set('thread', message.reply_to_id);
  const query = params.toString();
  return query ? `?${query}` : '';
};

const isCurrentConversation = ({ mode, contextId }) => {
  const hash = window.location.hash || '';

  if (mode === 'direct') {
    return hash.startsWith(`#messages/direct/${encodeURIComponent(contextId)}`);
  }

  return hash.startsWith('#messages/') && hash.includes(`/${encodeURIComponent(contextId)}`);
};

export default function MessagingNotificationCenter({
  user,
  onUnreadSummaryChange,
}) {
  const [notices, setNotices] = useState([]);
  const [messageNotificationsEnabled, setMessageNotificationsEnabled] = useState(true);
  const [messageNotificationScope, setMessageNotificationScope] = useState('direct_and_class');
  const timersRef = useRef(new Map());
  const noticesRef = useRef([]);
  const unreadSummaryRef = useRef({ total: 0, contexts: {} });
  const lastUnreadReconcileRef = useRef(0);

  const userId = user?.id || '';
  const mentionToken = useMemo(
    () => String(user?.email || '')
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_'),
    [user?.email],
  );

  const publishUnread = useCallback((summary) => {
    unreadSummaryRef.current = summary;
    onUnreadSummaryChange?.(summary);
  }, [onUnreadSummaryChange]);

  const refreshUnread = useCallback(async () => {
    if (!userId) {
      publishUnread({ total: 0, contexts: {} });
      return;
    }

    try {
      const summary = await getMessagingUnreadSummary();
      lastUnreadReconcileRef.current = Date.now();
      publishUnread(summary);
    } catch (error) {
      console.warn('Failed to reconcile messaging unread summary:', error);
    }
  }, [publishUnread, userId]);

  const clearUnreadContext = useCallback(({ contextType, contextId }) => {
    if (!contextType || !contextId) return;
    const key = `${contextType}:${contextId}`;
    const current = unreadSummaryRef.current;
    const previousCount = Number(current.contexts?.[key]?.unreadCount || 0);
    if (!previousCount && !current.contexts?.[key]) return;

    const contexts = { ...current.contexts };
    contexts[key] = {
      ...(contexts[key] || { contextType, contextId }),
      unreadCount: 0,
      firstUnreadAt: null,
    };
    publishUnread({
      total: Math.max(0, Number(current.total || 0) - previousCount),
      contexts,
    });
  }, [publishUnread]);

  const incrementUnreadContext = useCallback(({ mode, contextId, message }) => {
    if (!contextId || !message?.created_at) return;
    const contextType = mode === 'direct' ? 'direct' : 'channel';
    const key = `${contextType}:${contextId}`;
    const current = unreadSummaryRef.current;
    const previous = current.contexts?.[key];
    const previousCount = Number(previous?.unreadCount || 0);
    const contexts = { ...current.contexts };
    contexts[key] = {
      contextType,
      contextId,
      unreadCount: previousCount + 1,
      firstUnreadAt: previous?.firstUnreadAt || message.created_at,
    };
    publishUnread({
      total: Number(current.total || 0) + 1,
      contexts,
    });
  }, [publishUnread]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    const handleRead = (event) => clearUnreadContext(event.detail || {});
    window.addEventListener('coderschool:messaging-read', handleRead);
    return () => window.removeEventListener('coderschool:messaging-read', handleRead);
  }, [clearUnreadContext]);

  useEffect(() => {
    if (!userId) return undefined;

    const reconcileIfStale = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastUnreadReconcileRef.current > 2 * 60 * 1000) {
        void refreshUnread();
      }
    };

    const reconcileOnMessagingEntry = () => {
      if (!(window.location.hash || '').startsWith('#messages')) return;
      if (Date.now() - lastUnreadReconcileRef.current > 30 * 1000) {
        void refreshUnread();
      }
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshUnread();
    }, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', reconcileIfStale);
    window.addEventListener('hashchange', reconcileOnMessagingEntry);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', reconcileIfStale);
      window.removeEventListener('hashchange', reconcileOnMessagingEntry);
    };
  }, [refreshUnread, userId]);

  const dismissNotice = useCallback((noticeId) => {
    setNotices((current) => current.filter((notice) => notice.id !== noticeId));
    const timer = timersRef.current.get(noticeId);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(noticeId);
  }, []);

  const scheduleDismiss = useCallback(
    (noticeId) => {
      const oldTimer = timersRef.current.get(noticeId);
      if (oldTimer) window.clearTimeout(oldTimer);

      if (document.visibilityState !== 'visible') {
        timersRef.current.delete(noticeId);
        return;
      }

      timersRef.current.set(
        noticeId,
        window.setTimeout(() => dismissNotice(noticeId), NOTICE_TTL_MS),
      );
    },
    [dismissNotice],
  );

  const pushNotice = useCallback(
    (notice) => {
      const id = `${notice.mode}:${notice.contextId}:${notice.message.id}`;

      setNotices((current) => {
        const deduped = current.filter((item) => item.id !== id);
        return [{ ...notice, id }, ...deduped].slice(0, MAX_VISIBLE_NOTICES);
      });

      scheduleDismiss(id);
    },
    [scheduleDismiss],
  );

  useEffect(() => {
    noticesRef.current = notices;
  }, [notices]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      for (const notice of noticesRef.current) {
        if (!timersRef.current.has(notice.id)) scheduleDismiss(notice.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [scheduleDismiss]);

  useEffect(() => {
    if (!userId) return undefined;
    let mounted = true;
    const apply = (preferences) => {
      if (!mounted || !preferences) return;
      setMessageNotificationsEnabled(preferences.in_app_enabled !== false && preferences.notify_messages !== false);
      setMessageNotificationScope(preferences.message_scope || 'direct_and_class');
    };
    void getNotificationPreferences().then(apply).catch(() => {});
    const handlePreferences = (event) => apply(event.detail);
    window.addEventListener('coderschool:notification-preferences', handlePreferences);
    return () => {
      mounted = false;
      window.removeEventListener('coderschool:notification-preferences', handlePreferences);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;

    const handleIncoming = (event) => {
      const mode = event?.mode === 'direct' ? 'direct' : 'channel';
      const message = event?.message;
      const contextId = event?.contextId || (mode === 'direct' ? message?.conversation_id : message?.channel_id);
      if (!message?.id || message.author_id === userId || !contextId) return;

      const alreadyViewing =
        document.visibilityState === 'visible' &&
        isCurrentConversation({ mode, contextId });

      if (!alreadyViewing) {
        incrementUnreadContext({ mode, contextId, message });
      }

      if (!messageNotificationsEnabled || alreadyViewing) return;

      if (mode === 'direct') {
        pushNotice({
          mode,
          contextId,
          message,
          title: message.author_name || 'New direct message',
          contextLabel: 'Direct message',
          href: event?.href || `#messages/direct/${encodeURIComponent(contextId)}${buildQuery(message)}`,
        });
        return;
      }

      const isMentioned = Boolean(event?.isMentioned) || (Boolean(mentionToken) &&
        new RegExp(`(^|[^a-z0-9_])@${mentionToken}($|[^a-z0-9_])`, 'i')
          .test(String(message.content || '')));
      const isClassChannel = event?.channelType === 'class';

      if (messageNotificationScope === 'direct_only') return;
      if (!isClassChannel && messageNotificationScope !== 'all' && !isMentioned) return;

      pushNotice({
        mode,
        contextId,
        message,
        title: isMentioned
          ? `${message.author_name || 'Someone'} mentioned you`
          : message.author_name || 'New message',
        contextLabel: `# ${event?.channelName || 'Community'}`,
        href: event?.href || `#messages/${encodeURIComponent(event?.communityCode || '')}/${encodeURIComponent(contextId)}${buildQuery(message)}`,
      });
    };

    const unsubscribers = [
      subscribeToUserRealtime({
        userId,
        event: 'messaging_message',
        onEvent: handleIncoming,
        onStatus: (_status, error) => {
          if (error) console.warn('Messaging notification realtime error:', error);
        },
      }),
      subscribeToUserRealtime({
        userId,
        event: 'messaging_read',
        onEvent: (payload) => clearUnreadContext(payload || {}),
      }),
    ];

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe?.();
    };
  }, [
    clearUnreadContext,
    incrementUnreadContext,
    mentionToken,
    messageNotificationScope,
    messageNotificationsEnabled,
    pushNotice,
    userId,
  ]);

  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
    },
    [],
  );

  const visibleNotices = useMemo(() => notices.slice(0, MAX_VISIBLE_NOTICES), [notices]);

  if (!userId || visibleNotices.length === 0) return null;

  return (
    <div className="messaging-notification-stack" aria-live="polite" aria-label="New messages">
      {visibleNotices.map((notice) => (
        <article key={notice.id} className="messaging-incoming-notification">
          <button
            type="button"
            className="messaging-incoming-notification__body"
            onClick={() => {
              dismissNotice(notice.id);
              window.location.hash = notice.href.slice(1);
            }}
            aria-label={`Open message from ${notice.title}`}
          >
            <span className="messaging-incoming-notification__avatar" aria-hidden="true">
              {String(notice.title || 'M')
                .split(/\s+/)
                .filter(Boolean)
                .slice(-2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </span>
            <span className="messaging-incoming-notification__copy">
              <span className="messaging-incoming-notification__topline">
                <strong>{notice.title}</strong>
                <small>{notice.contextLabel}</small>
              </span>
              <span className="messaging-incoming-notification__preview">
                {previewMessage(notice.message)}
              </span>
              <span className="messaging-incoming-notification__action">Open message →</span>
            </span>
          </button>
          <button
            type="button"
            className="messaging-incoming-notification__close"
            onClick={() => dismissNotice(notice.id)}
            aria-label="Dismiss message notification"
            title="Dismiss"
          >
            ×
          </button>
        </article>
      ))}
    </div>
  );
}
