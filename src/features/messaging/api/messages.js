import { supabase } from '../../../supabaseClient.js';
import { toUserFacingErrorMessage } from '../../../utils/userFacingError.js';
import { isUuid } from './channels.js';
import { toDeterministicUuid } from '../utils/messagingAuth.js';

import {
  getAttachmentsForMessages,
  hydrateAttachmentUrls,
  toAttachmentRpcPayload,
  uploadPendingMessageAttachments,
} from './attachments.js';

const MESSAGE_FIELDS = [
  'id',
  'channel_id',
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

export async function getChannelMessages(
  channelId,
  { limit = 100 } = {},
) {
  if (!channelId || !isUuid(channelId)) {
    return [];
  }

  try {
    const { data: messageRows, error: messageError } = await supabase
      .from('messaging_messages')
      .select(MESSAGE_FIELDS)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (messageError) {
      console.warn('Could not load channel messages:', messageError.message);
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
        .from('messaging_message_reactions')
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
        conversationMode: 'channel',
      });
    } catch {
      // non-blocking
    }

    return attachReactions(messages, reactionRows || []).map((message) => ({
      ...message,
      attachments: attachmentsByMessage?.get(message.id) || [],
    }));
  } catch (err) {
    console.warn('Exception in getChannelMessages:', err);
    return [];
  }
}

export async function sendChannelMessage({
  channelId,
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

  if (!channelId) {
    throw new Error('No channel is selected.');
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
      'messaging_send_message',
      {
        p_channel_id: channelId,
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
    console.warn('RPC send message failed, trying fallback insert:', rpcErr);
  }

  if (!message?.id) {
    try {
      const { data: inserted, error: insertError } = await supabase
        .from('messaging_messages')
        .insert({
          channel_id: channelId,
          author_id: currentUserId,
          author_name: resolvedAuthorName,
          author_role: resolvedAuthorRole,
          reply_to_id: replyToId || null,
          content: normalizedContent,
        })
        .select(MESSAGE_FIELDS)
        .single();

      if (insertError) {
        throwSupabaseError(insertError, 'The message could not be sent.');
      }
      message = inserted;
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

export async function editChannelMessage({
  messageId,
  content,
}) {
  const normalizedContent = String(content || '').trim();

  if (!normalizedContent) {
    throw new Error('A message cannot be empty.');
  }

  const { data, error } = await supabase.rpc(
    'messaging_edit_message',
    {
      p_message_id: messageId,
      p_content: normalizedContent,
    },
  );

  throwSupabaseError(
    error,
    'The message could not be edited.',
  );

  return data;
}

export async function deleteChannelMessage(messageId) {
  const { data, error } = await supabase.rpc(
    'messaging_delete_message',
    {
      p_message_id: messageId,
    },
  );

  throwSupabaseError(
    error,
    'The message could not be deleted.',
  );

  return data;
}

export async function addMessageReaction({
  messageId,
  userId,
  emoji,
}) {
  const { data, error } = await supabase
    .from('messaging_message_reactions')
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

  throwSupabaseError(
    error,
    'The reaction could not be added.',
  );

  return data;
}

export async function removeMessageReaction({
  messageId,
  userId,
  emoji,
}) {
  const { error } = await supabase
    .from('messaging_message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  throwSupabaseError(
    error,
    'The reaction could not be removed.',
  );
}
