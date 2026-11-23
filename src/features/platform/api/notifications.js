import { supabase } from '../../../supabaseClient.js';
import { toUserFacingErrorMessage } from '../../../utils/userFacingError.js';
import { subscribeToUserRealtime } from '../realtime/userRealtime.js';


const preferenceCache = {
  userId: '',
  value: null,
  expiresAt: 0,
  promise: null,
};

const getSessionUser = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
};

const throwError = (error, fallback) => {
  if (!error) return;
  throw new Error(toUserFacingErrorMessage(error, fallback));
};

export async function getPlatformNotifications({ limit = 80 } = {}) {
  const { data, error } = await supabase
    .from('platform_notifications')
    .select('id, user_id, category, notification_type, title, body, href, source_type, source_id, actor_id, metadata, created_at, read_at, dismissed_at')
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  throwError(error, 'Notifications could not be loaded.');
  return data || [];
}

export async function markPlatformNotificationRead(id, read = true) {
  if (!id) return;
  const { error } = await supabase
    .from('platform_notifications')
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq('id', id);
  throwError(error, 'Notification could not be updated.');
}

export async function markAllPlatformNotificationsRead() {
  const { error } = await supabase
    .from('platform_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
    .is('dismissed_at', null);
  throwError(error, 'Notifications could not be updated.');
}

export async function dismissPlatformNotification(id) {
  if (!id) return;
  const { error } = await supabase
    .from('platform_notifications')
    .update({ dismissed_at: new Date().toISOString(), read_at: new Date().toISOString() })
    .eq('id', id);
  throwError(error, 'Notification could not be dismissed.');
}

export async function getNotificationPreferences({ force = false } = {}) {
  const user = await getSessionUser();
  if (!user?.id) return null;

  if (
    !force &&
    preferenceCache.userId === user.id &&
    preferenceCache.value &&
    preferenceCache.expiresAt > Date.now()
  ) {
    return preferenceCache.value;
  }

  if (!force && preferenceCache.userId === user.id && preferenceCache.promise) {
    return preferenceCache.promise;
  }

  preferenceCache.userId = user.id;
  preferenceCache.promise = (async () => {
    const { data, error } = await supabase
      .from('platform_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    throwError(error, 'Notification preferences could not be loaded.');

    const value = data || {
      user_id: user.id,
      in_app_enabled: true,
      sound_enabled: false,
      browser_enabled: false,
      message_scope: 'direct_and_class',
      notify_messages: true,
      notify_bookings: true,
      notify_courses: true,
      notify_system: true,
    };

    preferenceCache.value = value;
    preferenceCache.expiresAt = Date.now() + 60_000;
    return value;
  })();

  try {
    return await preferenceCache.promise;
  } finally {
    preferenceCache.promise = null;
  }
}

export async function saveNotificationPreferences(preferences) {
  const user = await getSessionUser();
  if (!user?.id) throw new Error('Please sign in again.');

  const row = {
    user_id: user.id,
    in_app_enabled: preferences.in_app_enabled !== false,
    sound_enabled: Boolean(preferences.sound_enabled),
    browser_enabled: Boolean(preferences.browser_enabled),
    message_scope: ['direct_only', 'direct_and_class', 'all'].includes(preferences.message_scope)
      ? preferences.message_scope
      : 'direct_and_class',
    notify_messages: preferences.notify_messages !== false,
    notify_bookings: preferences.notify_bookings !== false,
    notify_courses: preferences.notify_courses !== false,
    notify_system: preferences.notify_system !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('platform_notification_preferences')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  throwError(error, 'Notification preferences could not be saved.');
  preferenceCache.userId = user.id;
  preferenceCache.value = data;
  preferenceCache.expiresAt = Date.now() + 60_000;
  preferenceCache.promise = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('coderschool:notification-preferences', { detail: data }));
  }
  return data;
}

export function subscribeToPlatformNotifications({ userId, onInsert, onUpdate, onStatus }) {
  if (!userId) return () => {};

  const unsubscribers = [
    subscribeToUserRealtime({
      userId,
      event: 'platform_notification_insert',
      onEvent: (row) => onInsert?.(row),
      onStatus,
    }),
    subscribeToUserRealtime({
      userId,
      event: 'platform_notification_update',
      onEvent: (row) => onUpdate?.(row),
    }),
  ];

  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe?.();
  };
}
