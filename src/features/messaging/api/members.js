import { supabase } from '../../../supabaseClient.js';
import { getEdgeFunctionErrorMessage, toUserFacingErrorMessage } from '../../../utils/userFacingError.js';

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

export async function getMessagingDirectory() {
  try {
    const { data: profiles, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id, email, name, username, role')
      .order('role', { ascending: true })
      .limit(200);

    if (!profileErr && Array.isArray(profiles) && profiles.length > 0) {
      return profiles.map((p) => ({
        id: p.id,
        email: p.email || '',
        display_name: p.name || p.username || p.email || 'User',
        role: p.role || 'student',
      }));
    }
  } catch (err) {
    console.warn('user_profiles directory query failed:', err);
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      'manage-mentees',
      {
        body: {
          action: 'list',
        },
      },
    );

    if (!error && data?.ok && Array.isArray(data.accounts)) {
      return data.accounts.map((account) => ({
        id: account.id,
        email: account.email || '',
        display_name: account.display_name || account.email || 'User',
        role: account.role || 'student',
      }));
    }
  } catch {
    // ignore
  }

  return [];
}

export async function getCommunityMemberRows(
  communityId,
) {
  if (!communityId) {
    return [];
  }

  const { data, error } = await supabase
    .from('messaging_community_members')
    .select(
      'community_id, user_id, status, added_by, created_at, removed_at',
    )
    .eq('community_id', communityId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  throwSupabaseError(
    error,
    'Community members could not be loaded.',
  );

  return data || [];
}

export async function addCommunityMember({
  communityId,
  userId,
}) {
  const { data, error } = await supabase.rpc(
    'messaging_add_community_member',
    {
      p_community_id: communityId,
      p_user_id: userId,
    },
  );

  throwSupabaseError(
    error,
    'The member could not be added.',
  );

  return data;
}

export async function removeCommunityMember({
  communityId,
  userId,
}) {
  const { data, error } = await supabase.rpc(
    'messaging_remove_community_member',
    {
      p_community_id: communityId,
      p_user_id: userId,
    },
  );

  throwSupabaseError(
    error,
    'The member could not be removed.',
  );

  return data;
}
