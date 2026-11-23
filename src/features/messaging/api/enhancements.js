import { supabase } from '../../../supabaseClient.js';
import { toUserFacingErrorMessage } from '../../../utils/userFacingError.js';

const throwError = (error, fallback) => {
  if (!error) return;
  throw new Error(toUserFacingErrorMessage(error, fallback));
};

export async function getPinnedMessageIds({ contextType, contextId }) {
  if (!contextId) return [];
  try {
    const { data, error } = await supabase
      .from('messaging_pins')
      .select('message_id, created_at, pinned_by')
      .eq('context_type', contextType)
      .eq('context_id', contextId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function toggleMessagePin({ contextType, contextId, messageId }) {
  try {
    const { data, error } = await supabase.rpc('messaging_toggle_pin', {
      p_context_type: contextType,
      p_context_id: contextId,
      p_message_id: messageId,
    });
    if (!error) return Boolean(data);
  } catch {
    // fallback
  }

  // Fallback to table insert/delete
  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;
    const { data: existing } = await supabase
      .from('messaging_pins')
      .select('id')
      .eq('context_type', contextType)
      .eq('context_id', contextId)
      .eq('message_id', messageId)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from('messaging_pins').delete().eq('id', existing.id);
      return false;
    } else {
      await supabase.from('messaging_pins').insert({
        context_type: contextType,
        context_id: contextId,
        message_id: messageId,
        pinned_by: currentUserId,
      });
      return true;
    }
  } catch {
    return false;
  }
}

export async function searchAccessibleMessages(query, { limit = 40 } = {}) {
  const normalized = String(query || '').trim();
  if (normalized.length < 3) return [];
  try {
    const { data, error } = await supabase.rpc('messaging_search_accessible_messages', {
      p_query: normalized,
      p_limit: limit,
    });
    if (!error && data) return data;
  } catch {
    // fallback
  }

  // Fallback search across channel and direct messages
  try {
    const { data: channelMsgs } = await supabase
      .from('messaging_messages')
      .select('id, channel_id, author_id, author_name, author_role, content, created_at')
      .ilike('content', `%${normalized}%`)
      .limit(limit);

    return (channelMsgs || []).map((m) => ({
      message_id: m.id,
      context_type: 'channel',
      context_id: m.channel_id,
      author_id: m.author_id,
      author_name: m.author_name,
      author_role: m.author_role,
      content: m.content,
      created_at: m.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getMentionCandidates({ contextType, contextId }) {
  if (!contextId) return [];
  try {
    const { data, error } = await supabase.rpc('messaging_get_mention_candidates', {
      p_context_type: contextType,
      p_context_id: contextId,
    });
    if (!error && Array.isArray(data) && data.length > 0) return data;
  } catch {
    // fallback
  }

  // Fallback mention candidates from user_profiles
  try {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email, name, username')
      .limit(50);

    return (profiles || []).map((p) => {
      const emailPrefix = String(p.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const token = p.username || emailPrefix || 'user';
      return {
        user_id: p.id,
        display_name: p.name || p.username || p.email || 'User',
        mention_token: token,
      };
    });
  } catch {
    return [];
  }
}
