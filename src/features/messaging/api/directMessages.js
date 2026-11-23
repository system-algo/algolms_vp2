import { supabase } from '../../../supabaseClient.js';
import { toUserFacingErrorMessage } from '../../../utils/userFacingError.js';

import {
  getAttachmentsForMessages,
  hydrateAttachmentUrls,
  toAttachmentRpcPayload,
  uploadPendingMessageAttachments,
} from './attachments.js';
import { getStudentTeachers, toDeterministicUuid } from '../utils/messagingAuth.js';
import { isUuid } from './channels.js';

const DIRECT_MESSAGE_FIELDS = [
  'id',
  'conversation_id',
  'author_id',
  'author_name',
  'author_role',
  'reply_to_id',
  'content',
  'created_at',
  'edited_at',
  'deleted_at',
  'deleted_by',
].join(', ');

const throwSupabaseError = (error, fallbackMessage) => {
  if (!error) {
    return;
  }

  const nextError = new Error(
    toUserFacingErrorMessage(error, fallbackMessage),
  );
  nextError.code = error.code;
  nextError.details = error.details;
  nextError.hint = error.hint;
  throw nextError;
};

const attachReactions = (messages, reactions) => {
  const reactionsByMessage = new Map();

  for (const reaction of reactions || []) {
    const current = reactionsByMessage.get(reaction.message_id) || [];
    current.push(reaction);
    reactionsByMessage.set(reaction.message_id, current);
  }

  return (messages || []).map((message) => ({
    ...message,
    reactions: reactionsByMessage.get(message.id) || [],
  }));
};

export async function getDirectMessageCandidates() {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  const currentUserEmail = authData?.user?.email;

  // 1. Resolve current user's profile and role
  let role = 'student';
  if (currentUserId) {
    const { data: p } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', currentUserId)
      .maybeSingle();
    if (p?.role) role = p.role;
  }

  // 2. Student rule: Can ONLY direct message the teachers in their class
  if (role === 'student') {
    return await getStudentTeachers(currentUserEmail, currentUserId);
  }

  // 3. Admin & Teacher: Can chat with candidates
  try {
    const { data, error } = await supabase.rpc(
      'messaging_get_dm_candidates',
    );
    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (rpcErr) {
    console.warn('RPC messaging_get_dm_candidates unavailable, using fallback:', rpcErr);
  }

  // Fallback: load contacts from user_profiles
  try {
    const { data: profiles, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id, email, name, username, role')
      .order('role', { ascending: true })
      .limit(100);

    if (!profileErr && profiles) {
      return profiles
        .filter((p) => p.id !== currentUserId)
        .map((p) => ({
          user_id: p.id,
          email: p.email || '',
          display_name: p.name || p.username || p.email || 'User',
          role: p.role || 'student',
          shared_channel_count: 1,
        }));
    }
  } catch (fallbackErr) {
    console.warn('Contacts fallback failed:', fallbackErr);
  }

  return [];
}

export async function getDirectConversations() {
  try {
    const { data, error } = await supabase.rpc(
      'messaging_get_direct_conversations',
    );
    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (rpcErr) {
    console.warn('RPC messaging_get_direct_conversations unavailable:', rpcErr);
  }

  // Fallback direct table query
  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;
    if (!currentUserId) return [];

    const { data, error } = await supabase
      .from('messaging_direct_conversations')
      .select('id, participant_one_id, participant_two_id, last_message_at')
      .or(`participant_one_id.eq.${currentUserId},participant_two_id.eq.${currentUserId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error || !data) return [];

    const otherIds = data.map((c) =>
      c.participant_one_id === currentUserId ? c.participant_two_id : c.participant_one_id
    );

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email, name, username, role')
      .in('id', otherIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    return data.map((conv) => {
      const otherId = conv.participant_one_id === currentUserId ? conv.participant_two_id : conv.participant_one_id;
      const other = profileMap.get(otherId);
      return {
        conversation_id: conv.id,
        other_user_id: otherId,
        other_email: other?.email || '',
        other_display_name: other?.name || other?.username || other?.email || 'User',
        other_role: other?.role || 'student',
        last_message_content: '',
        last_message_at: conv.last_message_at || null,
      };
    });
  } catch {
    return [];
  }
}

export async function startDirectConversation(otherUserId) {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  const currentUserEmail = authData?.user?.email;
  if (!currentUserId) throw new Error('Not authenticated.');

  // Check role: student can ONLY chat direct with their teachers
  let role = 'student';
  const { data: p } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', currentUserId)
    .maybeSingle();
  if (p?.role) role = p.role;

  if (role === 'student') {
    const allowedTeachers = await getStudentTeachers(currentUserEmail, currentUserId);
    const isTeacherOfStudent = allowedTeachers.some(
      (t) => t.user_id === otherUserId || t.email === otherUserId || otherUserId.includes(t.email)
    );
    if (!isTeacherOfStudent) {
      throw new Error('Students can only direct message teachers in their enrolled classes.');
    }
  }

  try {
    const { data, error } = await supabase.rpc(
      'messaging_start_direct_conversation',
      {
        p_other_user_id: otherUserId,
      },
    );
    if (!error && data) {
      return data;
    }
  } catch (rpcErr) {
    console.warn('RPC startDirectConversation unavailable, using fallback:', rpcErr);
  }

  // Fallback: direct table lookup or insert
  const [p1, p2] = [currentUserId, otherUserId].sort();

  const { data: existing } = await supabase
    .from('messaging_direct_conversations')
    .select('id')
    .eq('participant_one_id', p1)
    .eq('participant_two_id', p2)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: createErr } = await supabase
    .from('messaging_direct_conversations')
    .insert({
      participant_one_id: p1,
      participant_two_id: p2,
      created_by: currentUserId,
    })
    .select('id')
    .single();

  if (createErr) {
    throwSupabaseError(createErr, 'The direct conversation could not be started.');
  }

  return created?.id;
}

export async function getDirectMessages(
  conversationId,
  { limit = 100 } = {},
) {
  if (!conversationId || !isUuid(conversationId)) {
    return [];
  }

  try {
    const { data: messageRows, error: messageError } = await supabase
      .from('messaging_direct_messages')
      .select(DIRECT_MESSAGE_FIELDS)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (messageError) {
      console.warn('Could not load direct messages:', messageError.message);
      return [];
    }

    const messages = [...(messageRows || [])].reverse();
    const messageIds = messages.map((message) => message.id);

    if (messageIds.length === 0) {
      return [];
    }

    let reactionRows = [];
    try {
      const { data, error: reactionError } = await supabase
        .from('messaging_direct_message_reactions')
        .select('message_id, user_id, emoji, created_at')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true });
      if (!reactionError && data) {
        reactionRows = data;
      }
    } catch {
      // non-blocking
    }

    let attachmentsByMessage = new Map();
    try {
      attachmentsByMessage = await getAttachmentsForMessages({
        messageIds,
        conversationMode: 'direct',
      });
    } catch {
      // non-blocking
    }

    return attachReactions(messages, reactionRows || []).map((message) => ({
      ...message,
      attachments: attachmentsByMessage?.get(message.id) || [],
    }));
  } catch (err) {
    console.warn('Exception in getDirectMessages:', err);
    return [];
  }
}

export async function sendDirectMessage({
  conversationId,
  content,
  replyToId = null,
  attachmentFiles = [],
  preparedAttachments = {},
  onUploadProgress,
  authorId = null,
  authorName = null,
  authorRole = null,
}) {
  const normalizedContent = String(content || '').trim();

  if (!conversationId) {
    throw new Error('No direct conversation is selected.');
  }

  if (!normalizedContent && attachmentFiles.length === 0) {
    throw new Error('Write a message or attach a file before sending.');
  }

  const uploadedAttachments = await uploadPendingMessageAttachments(
    attachmentFiles,
    { preparedAttachments, onProgress: onUploadProgress },
  );

  let currentUserId = authorId;
  let resolvedAuthorName = authorName;
  let resolvedAuthorRole = authorRole;

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userEmail = String(authData?.user?.email || '').trim().toLowerCase();
    const rawUserId = authData?.user?.id;

    if (!currentUserId) {
      if (rawUserId && isUuid(rawUserId)) {
        currentUserId = rawUserId;
      } else if (userEmail) {
        currentUserId = toDeterministicUuid(userEmail);
      } else if (rawUserId) {
        currentUserId = toDeterministicUuid(rawUserId);
      } else {
        currentUserId = '10000000-0000-0000-0000-000000000001';
      }
    } else if (!isUuid(currentUserId)) {
      currentUserId = toDeterministicUuid(currentUserId);
    }

    if (!resolvedAuthorName) {
      resolvedAuthorName =
        authData?.user?.user_metadata?.full_name ||
        authData?.user?.user_metadata?.display_name ||
        authData?.user?.user_metadata?.name ||
        (userEmail ? userEmail.replace(/@algo\.edu\.vn$/i, '') : 'User');
    }

    if (!resolvedAuthorRole) {
      if (userEmail.includes('.tch') || userEmail.includes('teacher')) {
        resolvedAuthorRole = 'teacher';
      } else if (authData?.user?.user_metadata?.role) {
        resolvedAuthorRole = authData.user.user_metadata.role;
      } else {
        resolvedAuthorRole = 'student';
      }
    }
  } catch {
    if (!currentUserId || !isUuid(currentUserId)) {
      currentUserId = toDeterministicUuid(currentUserId || 'user');
    }
    if (!resolvedAuthorName) resolvedAuthorName = 'User';
    if (!resolvedAuthorRole) resolvedAuthorRole = 'student';
  }

  let message = null;
  try {
    const { data, error } = await supabase.rpc(
      'messaging_send_direct_message',
      {
        p_conversation_id: conversationId,
        p_content: normalizedContent,
        p_reply_to_id: replyToId || null,
        p_attachments: toAttachmentRpcPayload(uploadedAttachments),
        p_author_id: currentUserId,
        p_author_name: resolvedAuthorName,
        p_author_role: resolvedAuthorRole,
      },
    );

    if (!error && data) {
      message = Array.isArray(data) ? data[0] : data;
    }
  } catch (rpcErr) {
    console.warn('RPC messaging_send_direct_message unavailable, using fallback insert:', rpcErr);
  }

  if (!message?.id) {
    try {
      const { data: inserted, error: insertError } = await supabase
        .from('messaging_direct_messages')
        .insert({
          conversation_id: conversationId,
          author_id: currentUserId,
          author_name: resolvedAuthorName,
          author_role: resolvedAuthorRole,
          reply_to_id: replyToId || null,
          content: normalizedContent,
        })
        .select(DIRECT_MESSAGE_FIELDS)
        .single();

      if (insertError) {
        throwSupabaseError(insertError, 'The direct message could not be sent.');
      }
      message = inserted;

      // Update last_message_at on conversation
      await supabase
        .from('messaging_direct_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (insertErr) {
      insertErr.uploadedAttachments = uploadedAttachments;
      throw insertErr;
    }
  }

  const attachments = await hydrateAttachmentUrls(
    message.attachments || uploadedAttachments,
  );

  return {
    ...message,
    attachments,
    reactions: [],
  };
}

export async function editDirectMessage({ messageId, content }) {
  const normalizedContent = String(content || '').trim();

  if (!normalizedContent) {
    throw new Error('A message cannot be empty.');
  }

  const { data, error } = await supabase.rpc(
    'messaging_edit_direct_message',
    {
      p_message_id: messageId,
      p_content: normalizedContent,
    },
  );

  throwSupabaseError(error, 'The direct message could not be edited.');
  return data;
}

export async function deleteDirectMessage(messageId) {
  const { data, error } = await supabase.rpc(
    'messaging_delete_direct_message',
    {
      p_message_id: messageId,
    },
  );

  throwSupabaseError(error, 'The direct message could not be deleted.');
  return data;
}

export async function addDirectMessageReaction({
  messageId,
  userId,
  emoji,
}) {
  const { data, error } = await supabase
    .from('messaging_direct_message_reactions')
    .insert({
      message_id: messageId,
      user_id: userId,
      emoji,
    })
    .select('message_id, user_id, emoji, created_at')
    .single();

  if (error?.code === '23505') {
    return null;
  }

  throwSupabaseError(error, 'The reaction could not be added.');
  return data;
}

export async function removeDirectMessageReaction({
  messageId,
  userId,
  emoji,
}) {
  const { error } = await supabase
    .from('messaging_direct_message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  throwSupabaseError(error, 'The reaction could not be removed.');
}
