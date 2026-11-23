import { supabase } from '../../../supabaseClient.js';
import { toUserFacingErrorMessage } from '../../../utils/userFacingError.js';
import { isUuid } from './channels.js';

const throwSupabaseError = (error, fallbackMessage) => {
  if (!error) return;
  const nextError = new Error(
    toUserFacingErrorMessage(error, fallbackMessage),
  );
  nextError.code = error.code;
  nextError.details = error.details;
  nextError.hint = error.hint;
  throw nextError;
};

export async function getMessagingReadState({ contextType, contextId }) {
  if (!contextId || !isUuid(contextId)) return null;

  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;
    if (!currentUserId) return null;

    const { data, error } = await supabase
      .from('messaging_read_state')
      .select('last_read_at')
      .eq('user_id', currentUserId)
      .eq('context_type', contextType)
      .eq('context_id', contextId)
      .maybeSingle();

    if (error || !data) return null;
    return data.last_read_at || null;
  } catch {
    return null;
  }
}

export async function markMessagingConversationRead({
  contextType,
  contextId,
  readAt = null,
}) {
  if (!contextId) return;

  const validReadAt = readAt || new Date().toISOString();

  if (isUuid(contextId)) {
    try {
      const { error } = await supabase.rpc('messaging_mark_read', {
        p_context_type: contextType,
        p_context_id: contextId,
        p_read_at: validReadAt,
      });

      if (error) {
        // Fallback: direct upsert into messaging_read_state
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData?.user?.id;
        if (currentUserId) {
          await supabase.from('messaging_read_state').upsert(
            {
              user_id: currentUserId,
              context_type: contextType,
              context_id: contextId,
              last_read_at: validReadAt,
            },
            { onConflict: 'user_id, context_type, context_id' },
          );
        }
      }
    } catch {
      // Ignore failure
    }
  }

  window.dispatchEvent(
    new CustomEvent('coderschool:messaging-read', {
      detail: { contextType, contextId },
    }),
  );
}

export async function getMessagingUnreadSummary() {
  try {
    const { data, error } = await supabase.rpc('messaging_get_unread_summary');
    if (error) {
      console.warn('messaging_get_unread_summary RPC unavailable:', error.message);
      return { total: 0, contexts: {} };
    }

    const contexts = {};
    let total = 0;

    for (const row of data || []) {
      const count = Number(row?.unread_count || 0);
      const key = `${row.context_type}:${row.context_id}`;
      contexts[key] = {
        contextType: row.context_type,
        contextId: row.context_id,
        unreadCount: count,
        firstUnreadAt: row.first_unread_at || null,
      };
      total += count;
    }

    return { total, contexts };
  } catch {
    return { total: 0, contexts: {} };
  }
}
