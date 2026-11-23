import { supabase } from '../../../supabaseClient.js';
import { toUserFacingErrorMessage } from '../../../utils/userFacingError.js';

export const MESSAGING_COMMUNITY_ORDER = [
  'GENERAL',
  'PTSY1',
  'PTPY1',
  'PTPY2',
  'WDY1',
  'CK',
  'GD',
  'DS_DAE',
  'FSW',
  'UGD',
  'CS50',
];

export const DEFAULT_COMMUNITY_IDS = {
  GENERAL: '00000000-0000-0000-0000-000000000001',
  PTSY1: '00000000-0000-0000-0000-000000000002',
  PTPY1: '00000000-0000-0000-0000-000000000003',
  WDY1: '00000000-0000-0000-0000-000000000004',
  UGD: '00000000-0000-0000-0000-000000000007',
};

const DEFAULT_COMMUNITIES = [
  {
    id: DEFAULT_COMMUNITY_IDS.GENERAL,
    code: 'GENERAL',
    name: 'General Platform Hub',
    description: 'General announcements and platform discussion for teachers and learners',
    is_active: true,
  },
  {
    id: DEFAULT_COMMUNITY_IDS.PTSY1,
    code: 'PTSY1',
    name: 'Python Start 1',
    description: 'Python Start Year 1 curriculum, discussions, and projects',
    is_active: true,
  },
  {
    id: DEFAULT_COMMUNITY_IDS.PTPY1,
    code: 'PTPY1',
    name: 'Python Pro 1',
    description: 'Python Pro Year 1 advanced algorithms and projects',
    is_active: true,
  },
  {
    id: DEFAULT_COMMUNITY_IDS.WDY1,
    code: 'WDY1',
    name: 'Web Development',
    description: 'Web development HTML, CSS, JavaScript, and React classroom community',
    is_active: true,
  },
  {
    id: DEFAULT_COMMUNITY_IDS.UGD,
    code: 'UGD',
    name: 'Unity Game Development',
    description: 'Unity Game Development classroom discussions, activities, and questions',
    is_active: true,
  },
];

const getCommunityOrderIndex = (code) => {
  const index = MESSAGING_COMMUNITY_ORDER.indexOf(code);
  return index === -1
    ? MESSAGING_COMMUNITY_ORDER.length
    : index;
};

export async function getMessagingCommunities() {
  try {
    const { data, error } = await supabase
      .from('messaging_communities')
      .select(
        'id, code, name, description, is_active, created_at, updated_at',
      )
      .eq('is_active', true);

    if (error) {
      console.warn('Could not query messaging_communities, using default communities:', error.message);
      return DEFAULT_COMMUNITIES;
    }

    if (!data || data.length === 0) {
      return DEFAULT_COMMUNITIES;
    }

    return [...data].sort((left, right) => {
      const orderDifference =
        getCommunityOrderIndex(left.code) -
        getCommunityOrderIndex(right.code);

      if (orderDifference !== 0) {
        return orderDifference;
      }

      return String(left.name || '').localeCompare(
        String(right.name || ''),
      );
    });
  } catch (err) {
    console.warn('Exception in getMessagingCommunities, using defaults:', err);
    return DEFAULT_COMMUNITIES;
  }
}
