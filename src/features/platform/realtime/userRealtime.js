import { supabase } from '../../../supabaseClient.js';

const EVENTS = [
  'platform_notification_insert',
  'platform_notification_update',
  'messaging_message',
  'messaging_read',
  'direct_conversation_change',
  'booking_change',
];

const entries = new Map();

const createEntry = (userId) => {
  const listeners = new Map(EVENTS.map((event) => [event, new Set()]));
  const statusListeners = new Set();

  let channel = supabase.channel(`user:${userId}`, {
    config: { private: false },
  });

  for (const event of EVENTS) {
    channel = channel.on('broadcast', { event }, ({ payload }) => {
      for (const listener of listeners.get(event) || []) {
        try {
          listener(payload);
        } catch (error) {
          console.warn(`User realtime listener failed for ${event}:`, error);
        }
      }
    });
  }

  channel.subscribe((status, error) => {
    for (const listener of statusListeners) {
      try {
        listener(status, error || null);
      } catch (listenerError) {
        console.warn('User realtime status listener failed:', listenerError);
      }
    }
  });

  const entry = {
    userId,
    channel,
    listeners,
    statusListeners,
    refCount: 0,
    removeTimer: null,
  };
  entries.set(userId, entry);
  return entry;
};

const getEntry = (userId) => entries.get(userId) || createEntry(userId);

const scheduleRemoval = (entry) => {
  if (entry.removeTimer) window.clearTimeout(entry.removeTimer);
  entry.removeTimer = window.setTimeout(() => {
    if (entry.refCount > 0) return;
    entries.delete(entry.userId);
    void supabase.removeChannel(entry.channel);
  }, 1000);
};

export function subscribeToUserRealtime({
  userId,
  event,
  onEvent,
  onStatus,
}) {
  if (!userId || !EVENTS.includes(event) || typeof onEvent !== 'function') {
    return () => {};
  }

  const entry = getEntry(userId);
  if (entry.removeTimer) {
    window.clearTimeout(entry.removeTimer);
    entry.removeTimer = null;
  }

  entry.refCount += 1;
  entry.listeners.get(event)?.add(onEvent);
  if (typeof onStatus === 'function') entry.statusListeners.add(onStatus);

  return () => {
    entry.listeners.get(event)?.delete(onEvent);
    if (typeof onStatus === 'function') entry.statusListeners.delete(onStatus);
    entry.refCount = Math.max(0, entry.refCount - 1);
    if (entry.refCount === 0) scheduleRemoval(entry);
  };
}
