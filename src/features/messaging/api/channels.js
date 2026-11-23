import { supabase } from '../../../supabaseClient.js';
import { toUserFacingErrorMessage } from '../../../utils/userFacingError.js';
import { ensureClassroomGroupChat } from '../utils/messagingAuth.js';

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

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (val) => typeof val === 'string' && UUID_REGEX.test(val);

const DEFAULT_COMMUNITY_CHANNELS = {
  '00000000-0000-0000-0000-000000000001': '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000002': '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000003': '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000004': '00000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000007': '00000000-0000-0000-0000-000000000071',
  'comm-general-001': '00000000-0000-0000-0000-000000000011',
  'comm-ptsy1-002': '00000000-0000-0000-0000-000000000021',
  'comm-ptpy1-003': '00000000-0000-0000-0000-000000000031',
  'comm-wdy1-004': '00000000-0000-0000-0000-000000000041',
  'comm-ugd-007': '00000000-0000-0000-0000-000000000071',
};

export const getDefaultChannelForCommunity = (communityId) => {
  const channelId = DEFAULT_COMMUNITY_CHANNELS[communityId] || '00000000-0000-0000-0000-000000000011';
  const validCommId = isUuid(communityId) ? communityId : '00000000-0000-0000-0000-000000000001';
  return {
    id: channelId,
    community_id: validCommId,
    name: 'general',
    channel_type: 'community',
    description: 'General discussion channel',
    status: 'active',
  };
};

const sortChannels = (channels) =>
  [...channels].sort((left, right) => {
    if (left.channel_type !== right.channel_type) {
      return left.channel_type === 'community' ? -1 : 1;
    }

    return String(left.name || '').localeCompare(
      String(right.name || ''),
    );
  });

export async function getCommunityChannels(communityId) {
  if (!communityId) {
    return [];
  }

  const validCommunityId = isUuid(communityId) ? communityId : null;

  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserEmail = authData?.user?.email;

    // Automatically ensure enrolled courses for the logged-in user have class channels
    if (currentUserEmail) {
      try {
        const { data: enrollments } = await supabase
          .from('classroom_course_members')
          .select('course_id, course_display_name, course_code')
          .ilike('email', currentUserEmail.trim().toLowerCase());

        for (const en of (enrollments || [])) {
          const courseTitle = en.course_display_name || en.course_code || en.course_id;
          if (courseTitle) {
            await ensureClassroomGroupChat(en.course_id, courseTitle);
          }
        }
      } catch (syncErr) {
        // non-blocking
      }
    }

    if (!validCommunityId) {
      return [getDefaultChannelForCommunity(communityId)];
    }

    const { data, error } = await supabase
      .from('messaging_channels')
      .select(
        'id, community_id, name, channel_type, description, status, created_by, created_at, updated_at, archived_at',
      )
      .eq('community_id', validCommunityId)
      .neq('status', 'archived');

    if (error) {
      console.warn('Could not load community channels, returning default channel:', error.message);
      return [getDefaultChannelForCommunity(communityId)];
    }

    if (!data || data.length === 0) {
      return [getDefaultChannelForCommunity(communityId)];
    }

    return sortChannels(data);
  } catch (err) {
    console.warn('Exception loading channels:', err);
    return [getDefaultChannelForCommunity(communityId)];
  }
}

export async function getChannelMemberRows(channelId) {
  if (!channelId || !isUuid(channelId)) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('messaging_channel_members')
      .select(
        'channel_id, user_id, status, added_by, created_at, removed_at',
      )
      .eq('channel_id', channelId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Channel members load error:', error.message);
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

export async function createClassChannel({
  communityId,
  name,
  memberIds,
  description = '',
}) {
  try {
    const { data, error } = await supabase.rpc(
      'messaging_create_class_channel',
      {
        p_community_id: communityId,
        p_name: name,
        p_member_ids: memberIds,
        p_description: description || null,
      },
    );

    if (!error && data) {
      return data;
    }
  } catch (rpcErr) {
    console.warn('RPC create class channel error, trying fallback:', rpcErr);
  }

  // Fallback to direct database insert
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;

  const { data: newChannel, error: channelError } = await supabase
    .from('messaging_channels')
    .insert({
      community_id: communityId,
      name,
      channel_type: 'class',
      description: description || null,
      status: 'active',
      created_by: currentUserId,
    })
    .select('id')
    .single();

  if (channelError) {
    throwSupabaseError(
      channelError,
      'The class channel could not be created.',
    );
  }

  if (newChannel?.id && Array.isArray(memberIds) && memberIds.length > 0) {
    const membersToInsert = Array.from(new Set([...memberIds, currentUserId].filter(Boolean))).map((uid) => ({
      channel_id: newChannel.id,
      user_id: uid,
      status: 'active',
      added_by: currentUserId,
    }));
    await supabase.from('messaging_channel_members').insert(membersToInsert);
  }

  return newChannel?.id;
}

export async function addChannelMember({
  channelId,
  userId,
}) {
  const { data, error } = await supabase.rpc(
    'messaging_add_channel_member',
    {
      p_channel_id: channelId,
      p_user_id: userId,
    },
  );

  throwSupabaseError(
    error,
    'The channel member could not be added.',
  );

  return data;
}

export async function removeChannelMember({
  channelId,
  userId,
}) {
  const { data, error } = await supabase.rpc(
    'messaging_remove_channel_member',
    {
      p_channel_id: channelId,
      p_user_id: userId,
    },
  );

  throwSupabaseError(
    error,
    'The channel member could not be removed.',
  );

  return data;
}
