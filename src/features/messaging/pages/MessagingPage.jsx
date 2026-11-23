import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getMessagingCommunities,
  MESSAGING_COMMUNITY_ORDER,
} from '../api/communities.js';
import {
  addCommunityMember,
  getCommunityMemberRows,
  getMessagingDirectory,
  removeCommunityMember,
} from '../api/members.js';
import {
  createClassChannel,
  getChannelMemberRows,
  getCommunityChannels,
} from '../api/channels.js';

import {
  getDirectConversations,
  getDirectMessageCandidates,
  startDirectConversation,
} from '../api/directMessages.js';

import ChatPanel from '../components/ChatPanel.jsx';
import MessagingSearchModal from '../components/MessagingSearchModal.jsx';
import { toUserFacingErrorMessage } from '../../../utils/userFacingError.js';
import { subscribeToUserRealtime } from '../../platform/realtime/userRealtime.js';

import './MessagingPage.css';

const COMMUNITY_PRESENTATION = {
  GENERAL: {
    shortLabel: 'General Hub',
    eyebrow: 'All Courses Community',
    initials: 'GH',
  },
  PTSY1: {
    shortLabel: 'Python Start 1',
    eyebrow: 'Python Community',
    initials: 'P1',
  },
  PTPY1: {
    shortLabel: 'Python Pro 1',
    eyebrow: 'Python Pro Community',
    initials: 'PP',
  },
  PTPY2: {
    shortLabel: 'Python Pro 2',
    eyebrow: 'Python Pro Advanced',
    initials: 'P2',
  },
  WDY1: {
    shortLabel: 'Web Dev',
    eyebrow: 'Web Community',
    initials: 'WD',
  },
  CK: {
    shortLabel: 'Creative Coding',
    eyebrow: 'Visual Coding',
    initials: 'CK',
  },
  GD: {
    shortLabel: 'Game Design',
    eyebrow: 'Game Community',
    initials: 'GD',
  },
  DS_DAE: {
    shortLabel: 'DS + DAE',
    eyebrow: 'Data Community',
    initials: 'DA',
  },
  FSW: {
    shortLabel: 'FSW',
    eyebrow: 'Web Community',
    initials: 'FW',
  },
  UGD: {
    shortLabel: 'UGD',
    eyebrow: 'Game Community',
    initials: 'UG',
  },
  CS50: {
    shortLabel: 'CS50',
    eyebrow: 'Foundation Community',
    initials: '50',
  },
};

const normalizeSearchText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const getHashSelection = () => {
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  const pathHash = queryIndex >= 0 ? hash.slice(0, queryIndex) : hash;
  const params = new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : '');
  const directMatch = pathHash.match(/^#messages\/direct\/([^/?#]+)/i);

  const decode = (value) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return String(value || '');
    }
  };

  const focusMessageId = params.get('message') || '';
  const focusThreadRootId = params.get('thread') || '';

  if (directMatch?.[1]) {
    return {
      mode: 'direct',
      communityCode: null,
      channelId: null,
      directConversationId: decode(directMatch[1]),
      focusMessageId,
      focusThreadRootId,
    };
  }

  const match = pathHash.match(
    /^#messages\/([^/?#]+)(?:\/([^/?#]+))?/i,
  );

  if (!match?.[1]) {
    return {
      mode: 'community',
      communityCode: null,
      channelId: null,
      directConversationId: null,
      focusMessageId,
      focusThreadRootId,
    };
  }

  return {
    mode: 'community',
    communityCode: decode(match[1]).toUpperCase(),
    channelId: match[2] ? decode(match[2]) : null,
    directConversationId: null,
    focusMessageId,
    focusThreadRootId,
  };
};

const buildFocusQuery = ({ focusMessageId = '', focusThreadRootId = '' } = {}) => {
  const params = new URLSearchParams();
  if (focusMessageId) params.set('message', focusMessageId);
  if (focusThreadRootId) params.set('thread', focusThreadRootId);
  const query = params.toString();
  return query ? `?${query}` : '';
};

const setMessagingHash = (communityCode, channelId = null, focus = {}) => {
  if (!communityCode) return;

  const nextHash = channelId
    ? `#messages/${encodeURIComponent(communityCode)}/${encodeURIComponent(channelId)}${buildFocusQuery(focus)}`
    : `#messages/${encodeURIComponent(communityCode)}`;

  if (window.location.hash !== nextHash) window.location.hash = nextHash;
};

const setDirectMessagingHash = (conversationId, focus = {}) => {
  if (!conversationId) return;

  const nextHash = `#messages/direct/${encodeURIComponent(conversationId)}${buildFocusQuery(focus)}`;
  if (window.location.hash !== nextHash) window.location.hash = nextHash;
};

const CommunityIcon = ({ initials }) => (
  <span className="messaging-community-avatar" aria-hidden="true">
    {initials}
  </span>
);

const PersonAvatar = ({ profile, size = 'normal' }) => {
  const label =
    profile?.display_name || profile?.email || 'User';
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <span
      className={`messaging-person-avatar messaging-person-avatar--${size}`}
      title={label}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
};

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const NavigationIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'normal',
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="messaging-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section
        className={`messaging-modal messaging-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="messaging-modal-header">
          <div>
            <p className="messaging-panel-kicker">
              Community management
            </p>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>

          <button
            type="button"
            className="messaging-icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="messaging-modal-body">{children}</div>

        {footer ? (
          <footer className="messaging-modal-footer">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

function ManageMembersModal({
  community,
  directory,
  memberIds,
  savingUserId,
  onAdd,
  onRemove,
  onClose,
}) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = normalizeSearchText(search);

    return directory.filter((profile) => {
      const matchesRole =
        roleFilter === 'all' || profile.role === roleFilter;

      if (!matchesRole) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return normalizeSearchText(
        `${profile.display_name} ${profile.email} ${profile.role}`,
      ).includes(normalizedSearch);
    });
  }, [directory, roleFilter, search]);

  const activeMembers = useMemo(
    () =>
      directory
        .filter((profile) => memberIds.has(profile.id))
        .sort((left, right) =>
          String(left.display_name || '').localeCompare(
            String(right.display_name || ''),
          ),
        ),
    [directory, memberIds],
  );

  return (
    <ModalShell
      title={`Manage ${community.name}`}
      subtitle="Add mentors and mentees to the shared General community chat."
      onClose={onClose}
      size="large"
    >
      <div className="messaging-member-manager-grid">
        <section className="messaging-member-column">
          <div className="messaging-section-heading">
            <div>
              <h3>Community members</h3>
              <p>{activeMembers.length} active members</p>
            </div>
          </div>

          <div className="messaging-person-list messaging-person-list--current">
            {activeMembers.length === 0 ? (
              <div className="messaging-inline-empty">
                No one has been added to this community yet.
              </div>
            ) : (
              activeMembers.map((profile) => (
                <div
                  key={profile.id}
                  className="messaging-person-row"
                >
                  <PersonAvatar profile={profile} />

                  <div className="messaging-person-copy">
                    <strong>{profile.display_name}</strong>
                    <span>{profile.email}</span>
                  </div>

                  <span
                    className={`messaging-role-pill messaging-role-pill--${profile.role}`}
                  >
                    {profile.role}
                  </span>

                  <button
                    type="button"
                    className="messaging-text-button messaging-text-button--danger"
                    onClick={() => onRemove(profile.id)}
                    disabled={savingUserId === profile.id}
                  >
                    {savingUserId === profile.id
                      ? 'Removing…'
                      : 'Remove'}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="messaging-member-column">
          <div className="messaging-section-heading">
            <div>
              <h3>Add people</h3>
              <p>Search the existing CS accounts.</p>
            </div>
          </div>

          <div className="messaging-directory-controls">
            <label className="messaging-search-field">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name or email"
              />
            </label>

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
              aria-label="Filter by role"
            >
              <option value="all">All roles</option>
              <option value="teacher">Teachers</option>
              <option value="student">Students</option>
              <option value="mentor">Mentors</option>
              <option value="mentee">Mentees</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <div className="messaging-person-list">
            {filteredProfiles.length === 0 ? (
              <div className="messaging-inline-empty">
                No accounts match this search.
              </div>
            ) : (
              filteredProfiles.map((profile) => {
                const isMember = memberIds.has(profile.id);

                return (
                  <div
                    key={profile.id}
                    className="messaging-person-row"
                  >
                    <PersonAvatar profile={profile} />

                    <div className="messaging-person-copy">
                      <strong>{profile.display_name}</strong>
                      <span>{profile.email}</span>
                    </div>

                    <span
                      className={`messaging-role-pill messaging-role-pill--${profile.role}`}
                    >
                      {profile.role}
                    </span>

                    <button
                      type="button"
                      className={
                        isMember
                          ? 'messaging-added-button'
                          : 'messaging-text-button'
                      }
                      onClick={() => onAdd(profile.id)}
                      disabled={
                        isMember || savingUserId === profile.id
                      }
                    >
                      {isMember
                        ? 'Added'
                        : savingUserId === profile.id
                          ? 'Adding…'
                          : 'Add'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </ModalShell>
  );
}

function CreateChannelModal({
  community,
  members,
  saving,
  onCreate,
  onClose,
}) {
  const teachers = members.filter(
    (profile) => profile.role === 'teacher' || profile.role === 'mentor',
  );
  const students = members.filter(
    (profile) => profile.role === 'student' || profile.role === 'mentee',
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState(
    new Set(),
  );
  const [formError, setFormError] = useState('');

  const toggleStudent = (userId) => {
    setSelectedStudentIds((previous) => {
      const next = new Set(previous);

      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }

      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Enter a channel name.');
      return;
    }

    const memberIds = [teacherId, ...selectedStudentIds].filter(Boolean);

    await onCreate({
      name: name.trim(),
      description: description.trim(),
      memberIds,
    });
  };

  return (
    <ModalShell
      title="Create class channel"
      subtitle={`Create one private class channel inside ${community.name}.`}
      onClose={onClose}
      footer={(
        <>
          <button
            type="button"
            className="messaging-secondary-button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="messaging-create-channel-form"
            className="messaging-primary-button"
            disabled={saving}
          >
            {saving ? 'Creating…' : 'Create class channel'}
          </button>
        </>
      )}
    >
      <form
        id="messaging-create-channel-form"
        className="messaging-channel-form"
        onSubmit={handleSubmit}
      >
        <label className="messaging-form-field">
          <span>Channel name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder="Example: PTSY1 - Class A"
            autoFocus
          />
        </label>

        <label className="messaging-form-field">
          <span>Description <small>Optional</small></span>
          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            rows={3}
            placeholder="Short description of this class channel"
          />
        </label>

        <label className="messaging-form-field">
          <span>Teacher <small>Optional</small></span>
          <select
            value={teacherId}
            onChange={(event) =>
              setTeacherId(event.target.value)
            }
          >
            <option value="">Select a teacher</option>
            {teachers.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.display_name} — {profile.email}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="messaging-mentee-selector">
          <legend>Students</legend>

          {students.length === 0 ? (
            <div className="messaging-inline-empty">
              No students found in this community yet.
            </div>
          ) : (
            <div className="messaging-checkbox-list">
              {students.map((profile) => (
                <label
                  key={profile.id}
                  className="messaging-checkbox-row"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.has(profile.id)}
                    onChange={() => toggleStudent(profile.id)}
                  />
                  <PersonAvatar profile={profile} size="small" />
                  <span>
                    <strong>{profile.display_name}</strong>
                    <small>{profile.email}</small>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {formError ? (
          <p className="messaging-form-error">{formError}</p>
        ) : null}
      </form>
    </ModalShell>
  );
}


function StartDirectMessageModal({
  candidates,
  savingUserId,
  onStart,
  onClose,
}) {
  const [search, setSearch] = useState('');
  const normalizedSearch = normalizeSearchText(search);
  const filteredCandidates = candidates.filter((candidate) =>
    !normalizedSearch ||
    normalizeSearchText(
      `${candidate.display_name} ${candidate.email} ${candidate.role}`,
    ).includes(normalizedSearch),
  );

  return (
    <ModalShell
      title="New direct message"
      subtitle="You can only message people who share an active private class channel with you."
      onClose={onClose}
      size="normal"
    >
      <div className="messaging-dm-picker">
        <label className="messaging-search-field">
          <span>Search channel members</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            autoFocus
          />
        </label>

        <div className="messaging-dm-candidate-list">
          {filteredCandidates.length === 0 ? (
            <div className="messaging-inline-empty">
              No eligible direct-message contacts were found. Both users must be active members of the same private class channel.
            </div>
          ) : (
            filteredCandidates.map((candidate) => (
              <button
                key={candidate.user_id}
                type="button"
                className="messaging-dm-candidate"
                onClick={() => onStart(candidate.user_id)}
                disabled={savingUserId === candidate.user_id}
              >
                <PersonAvatar
                  profile={{
                    display_name: candidate.display_name,
                    email: candidate.email,
                  }}
                />
                <span>
                  <strong>{candidate.display_name || candidate.email}</strong>
                  <small>
                    {candidate.role} · {candidate.shared_channel_count} shared class {Number(candidate.shared_channel_count) === 1 ? 'channel' : 'channels'}
                  </small>
                </span>
                <span className="messaging-dm-start-label">
                  {savingUserId === candidate.user_id ? 'Opening…' : 'Message'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </ModalShell>
  );
}

const getProfileById = (directoryMap, userId) =>
  directoryMap.get(userId) || {
    id: userId,
    display_name: 'Unknown user',
    email: '',
    role: 'mentee',
  };

export default function MessagingPage({
  user,
  currentUserId = '',
  userRole,
  unreadByContext = {},
}) {
  const isAdmin = userRole === 'admin' || userRole === 'ls';

  const initialHashSelection = getHashSelection();

  const [communities, setCommunities] = useState([]);
  const [selectedCode, setSelectedCode] = useState(
    initialHashSelection.communityCode,
  );
  const [selectedChannelId, setSelectedChannelId] = useState(
    initialHashSelection.channelId,
  );
  const [selectedDirectId, setSelectedDirectId] = useState(
    initialHashSelection.directConversationId,
  );
  const [focusMessageId, setFocusMessageId] = useState(
    initialHashSelection.focusMessageId || '',
  );
  const [focusThreadRootId, setFocusThreadRootId] = useState(
    initialHashSelection.focusThreadRootId || '',
  );

  const [channels, setChannels] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [communityMemberRows, setCommunityMemberRows] = useState(
    [],
  );
  const [channelMemberRows, setChannelMemberRows] = useState([]);
  const [directConversations, setDirectConversations] = useState([]);
  const [directCandidates, setDirectCandidates] = useState([]);

  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [directModalOpen, setDirectModalOpen] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [savingDirectUserId, setSavingDirectUserId] = useState('');
  const [savingUserId, setSavingUserId] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  useEffect(() => {
    const handleSearchShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && String(event.key || '').toLowerCase() === 'k') {
        event.preventDefault();
        setMessageSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  const selectedCommunity = useMemo(
    () =>
      communities.find(
        (community) => community.code === selectedCode,
      ) || null,
    [communities, selectedCode],
  );

  const selectedChannel = useMemo(
    () =>
      selectedDirectId
        ? null
        : channels.find(
          (channel) => channel.id === selectedChannelId,
        ) || null,
    [channels, selectedChannelId, selectedDirectId],
  );

  const selectedDirectConversation = useMemo(
    () =>
      directConversations.find(
        (conversation) =>
          conversation.conversation_id === selectedDirectId,
      ) || null,
    [directConversations, selectedDirectId],
  );

  const selectedDirectChannel = useMemo(() => {
    if (!selectedDirectConversation) {
      return null;
    }

    return {
      id: selectedDirectConversation.conversation_id,
      name:
        selectedDirectConversation.other_display_name ||
        selectedDirectConversation.other_email ||
        'Direct message',
      description:
        'Private conversation available because you share an active class channel.',
      status: 'active',
      channel_type: 'direct',
    };
  }, [selectedDirectConversation]);

  const directoryMap = useMemo(
    () =>
      new Map(
        directory.map((profile) => [profile.id, profile]),
      ),
    [directory],
  );

  const communityMemberIds = useMemo(
    () =>
      new Set(
        communityMemberRows.map((member) => member.user_id),
      ),
    [communityMemberRows],
  );

  const activeCommunityProfiles = useMemo(
    () =>
      communityMemberRows
        .map((member) =>
          getProfileById(directoryMap, member.user_id),
        )
        .filter((profile) => profile.role !== 'admin'),
    [communityMemberRows, directoryMap],
  );

  const hasCommunityMentor = activeCommunityProfiles.some(
    (profile) => profile.role === 'mentor',
  );
  const hasCommunityMentee = activeCommunityProfiles.some(
    (profile) => profile.role === 'mentee',
  );
  const canCreateClassChannel =
    hasCommunityMentor && hasCommunityMentee;

  const selectedChannelProfiles = useMemo(
    () =>
      channelMemberRows.map((member) =>
        getProfileById(directoryMap, member.user_id),
      ),
    [channelMemberRows, directoryMap],
  );

  const classChannels = useMemo(
    () =>
      channels.filter(
        (channel) => channel.channel_type === 'class',
      ),
    [channels],
  );

  const showToast = useCallback((message, type = 'success') => {
    setToast({
      message:
        type === 'error'
          ? toUserFacingErrorMessage(
              message,
              'Something went wrong. Please try again.',
            )
          : message,
      type,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const loadCommunities = useCallback(async () => {
    setLoadingCommunities(true);
    setErrorMessage('');

    try {
      const nextCommunities = await getMessagingCommunities();
      setCommunities(nextCommunities);

      const hashSelection = getHashSelection();
      const hashCodeExists = nextCommunities.some(
        (community) =>
          community.code === hashSelection.communityCode,
      );

      const preferredCode = hashCodeExists
        ? hashSelection.communityCode
        : MESSAGING_COMMUNITY_ORDER.find((code) =>
          nextCommunities.some(
            (community) => community.code === code,
          ),
        ) || nextCommunities[0]?.code || null;

      setSelectedCode(preferredCode);
      setSelectedChannelId(
        hashSelection.mode === 'direct'
          ? null
          : hashCodeExists
            ? hashSelection.channelId
            : null,
      );
      setSelectedDirectId(
        hashSelection.mode === 'direct'
          ? hashSelection.directConversationId
          : null,
      );
      setFocusMessageId(hashSelection.focusMessageId || '');
      setFocusThreadRootId(hashSelection.focusThreadRootId || '');

      if (preferredCode && hashSelection.mode !== 'direct') {
        setMessagingHash(
          preferredCode,
          hashCodeExists ? hashSelection.channelId : null,
          {
            focusMessageId: hashSelection.focusMessageId,
            focusThreadRootId: hashSelection.focusThreadRootId,
          },
        );
      }
    } catch (error) {
      console.error('Failed to load communities:', error);
      setErrorMessage(
        error?.message || 'The communities could not be loaded.',
      );
    } finally {
      setLoadingCommunities(false);
    }
  }, []);

  const loadDirectory = useCallback(async () => {
    if (!isAdmin) {
      setDirectory([]);
      return [];
    }

    const nextDirectory = await getMessagingDirectory();
    setDirectory(nextDirectory);
    return nextDirectory;
  }, [isAdmin]);

  const loadDirectWorkspace = useCallback(async () => {
    try {
      const [nextConversations, nextCandidates] = await Promise.all([
        getDirectConversations(),
        getDirectMessageCandidates(),
      ]);

      setDirectConversations(nextConversations);
      setDirectCandidates(nextCandidates);

      const hashSelection = getHashSelection();
      if (hashSelection.mode === 'direct') {
        const directConversationExists = nextConversations.some(
          (conversation) =>
            conversation.conversation_id ===
            hashSelection.directConversationId,
        );

        if (directConversationExists) {
          setSelectedDirectId(hashSelection.directConversationId);
          setSelectedChannelId(null);
        } else {
          setSelectedDirectId(null);
        }
      }

      return nextConversations;
    } catch (error) {
      console.error('Failed to load direct messages:', error);
      showToast(
        error?.message || 'Direct messages could not be loaded.',
        'error',
      );
      return [];
    }
  }, [showToast]);

  const loadWorkspace = useCallback(
    async (community) => {
      if (!community?.id) {
        setChannels([]);
        setCommunityMemberRows([]);
        setSelectedChannelId(null);
        return;
      }

      setLoadingWorkspace(true);
      setErrorMessage('');

      try {
        const tasks = [getCommunityChannels(community.id)];

        if (isAdmin) {
          tasks.push(getCommunityMemberRows(community.id));
        }

        const [nextChannels, nextMemberRows = []] =
          await Promise.all(tasks);

        setChannels(nextChannels);
        setCommunityMemberRows(nextMemberRows);

        const hashSelection = getHashSelection();
        const hashChannelExists = nextChannels.some(
          (channel) => channel.id === hashSelection.channelId,
        );

        const preferredChannel = hashChannelExists
          ? hashSelection.channelId
          : nextChannels.find(
            (channel) => channel.channel_type === 'community',
          )?.id || nextChannels[0]?.id || null;

        if (!selectedDirectId) {
          setSelectedChannelId(preferredChannel);
          setMessagingHash(community.code, preferredChannel, {
            focusMessageId: hashSelection.focusMessageId,
            focusThreadRootId: hashSelection.focusThreadRootId,
          });
        }
      } catch (error) {
        console.error('Failed to load messaging workspace:', error);
        setErrorMessage(
          error?.message ||
          'The community workspace could not be loaded.',
        );
      } finally {
        setLoadingWorkspace(false);
      }
    },
    [isAdmin, selectedDirectId],
  );

  const loadSelectedChannelMembers = useCallback(async () => {
    if (
      !selectedChannel?.id ||
      selectedChannel.channel_type !== 'class'
    ) {
      setChannelMemberRows([]);
      return;
    }

    try {
      const rows = await getChannelMemberRows(selectedChannel.id);
      setChannelMemberRows(rows);
    } catch (error) {
      console.error('Failed to load channel members:', error);
      setChannelMemberRows([]);
    }
  }, [selectedChannel]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  useEffect(() => {
    if (isAdmin) {
      loadDirectory().catch((error) => {
        console.error('Failed to load user directory:', error);
        showToast(
          error?.message || 'The user directory could not be loaded.',
          'error',
        );
      });
    }
  }, [isAdmin, loadDirectory, showToast]);

  useEffect(() => {
    void loadDirectWorkspace();
  }, [loadDirectWorkspace]);

  useEffect(() => {
    const userId = currentUserId || user?.id || '';
    if (!userId) return undefined;

    return subscribeToUserRealtime({
      userId,
      event: 'direct_conversation_change',
      onEvent: () => {
        void loadDirectWorkspace();
      },
      onStatus: (_status, error) => {
        if (error) console.error('Direct conversation realtime error:', error);
      },
    });
  }, [currentUserId, loadDirectWorkspace, user?.id]);

  useEffect(() => {
    loadWorkspace(selectedCommunity);
  }, [loadWorkspace, selectedCommunity]);

  useEffect(() => {
    loadSelectedChannelMembers();
  }, [loadSelectedChannelMembers]);

  useEffect(() => {
    const handleHashChange = () => {
      const selection = getHashSelection();

      setFocusMessageId(selection.focusMessageId || '');
      setFocusThreadRootId(selection.focusThreadRootId || '');

      if (selection.mode === 'direct' && selection.directConversationId) {
        setSelectedDirectId(selection.directConversationId);
        setSelectedChannelId(null);
        return;
      }

      if (
        selection.communityCode &&
        communities.some(
          (community) =>
            community.code === selection.communityCode,
        )
      ) {
        setSelectedDirectId(null);
        setSelectedCode(selection.communityCode);
        setSelectedChannelId(selection.channelId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [communities]);

  const handleSelectCommunity = (communityCode) => {
    setMobileNavigationOpen(false);
    setFocusMessageId('');
    setFocusThreadRootId('');
    setSelectedDirectId(null);
    setSelectedCode(communityCode);
    setSelectedChannelId(null);
    setMessagingHash(communityCode);
  };

  const handleSelectChannel = (channelId) => {
    setMobileNavigationOpen(false);
    setFocusMessageId('');
    setFocusThreadRootId('');
    setSelectedDirectId(null);
    setSelectedChannelId(channelId);
    setMessagingHash(selectedCommunity.code, channelId);
  };

  const handleSelectDirectConversation = (conversationId) => {
    setMobileNavigationOpen(false);
    setFocusMessageId('');
    setFocusThreadRootId('');
    setSelectedDirectId(conversationId);
    setSelectedChannelId(null);
    setDirectMessagingHash(conversationId);
  };

  const handleStartDirectConversation = async (otherUserId) => {
    setSavingDirectUserId(otherUserId);

    try {
      const conversationId = await startDirectConversation(otherUserId);
      await loadDirectWorkspace();
      setDirectModalOpen(false);
      handleSelectDirectConversation(conversationId);
      showToast('Direct conversation opened.');
    } catch (error) {
      console.error('Failed to start direct message:', error);
      showToast(
        error?.message || 'The direct conversation could not be opened.',
        'error',
      );
    } finally {
      setSavingDirectUserId('');
    }
  };

  const refreshCurrentWorkspace = async () => {
    await loadWorkspace(selectedCommunity);
  };

  const handleAddCommunityMember = async (userId) => {
    if (!selectedCommunity?.id) {
      return;
    }

    setSavingUserId(userId);

    try {
      await addCommunityMember({
        communityId: selectedCommunity.id,
        userId,
      });

      const nextRows = await getCommunityMemberRows(
        selectedCommunity.id,
      );
      setCommunityMemberRows(nextRows);
      showToast('Member added to the community.');
    } catch (error) {
      console.error('Failed to add community member:', error);
      showToast(
        error?.message || 'The member could not be added.',
        'error',
      );
    } finally {
      setSavingUserId('');
    }
  };

  const handleRemoveCommunityMember = async (userId) => {
    if (!selectedCommunity?.id) {
      return;
    }

    const profile = directoryMap.get(userId);
    const confirmed = window.confirm(
      `Remove ${
        profile?.display_name || profile?.email || 'this user'
      } from ${selectedCommunity.name}? They will also lose access to class channels in this community.`,
    );

    if (!confirmed) {
      return;
    }

    setSavingUserId(userId);

    try {
      await removeCommunityMember({
        communityId: selectedCommunity.id,
        userId,
      });

      const nextRows = await getCommunityMemberRows(
        selectedCommunity.id,
      );
      setCommunityMemberRows(nextRows);
      showToast('Member removed from the community.');
    } catch (error) {
      console.error('Failed to remove community member:', error);
      showToast(
        error?.message || 'The member could not be removed.',
        'error',
      );
    } finally {
      setSavingUserId('');
    }
  };

  const handleCreateChannel = async ({
    name,
    description,
    memberIds,
  }) => {
    if (!selectedCommunity?.id) {
      return;
    }

    setCreatingChannel(true);

    try {
      const newChannelId = await createClassChannel({
        communityId: selectedCommunity.id,
        name,
        description,
        memberIds,
      });

      setChannelModalOpen(false);
      await refreshCurrentWorkspace();
      setSelectedChannelId(newChannelId);
      setMessagingHash(selectedCommunity.code, newChannelId);
      showToast('Class channel created.');
    } catch (error) {
      console.error('Failed to create class channel:', error);
      showToast(
        error?.message || 'The class channel could not be created.',
        'error',
      );
    } finally {
      setCreatingChannel(false);
    }
  };


  useEffect(() => {
    if (!mobileNavigationOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileNavigationOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [mobileNavigationOpen]);

  if (loadingCommunities) {
    return (
      <section className="messaging-status-card" aria-live="polite">
        <span className="messaging-loading-spinner" aria-hidden="true" />
        <div>
          <p className="messaging-status-kicker">Community</p>
          <h1>Loading your workspace…</h1>
          <p>Loading your communities and conversations…</p>
        </div>
      </section>
    );
  }

  if (errorMessage && communities.length === 0) {
    return (
      <section className="messaging-status-card messaging-status-card--error">
        <div className="messaging-status-icon" aria-hidden="true">
          !
        </div>
        <div className="messaging-status-copy">
          <p className="messaging-status-kicker">Unable to load</p>
          <h1>Community data is unavailable</h1>
          <p>{errorMessage}</p>
          <button
            type="button"
            className="messaging-primary-button"
            onClick={loadCommunities}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (communities.length === 0) {
    return (
      <section className="messaging-status-card messaging-status-card--blocked">
        <div className="messaging-status-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <div>
          <p className="messaging-status-kicker">Community</p>
          <h1>No community access yet</h1>
          <p>
            Ask an administrator to add this account to a CoderSchool
            community.
          </p>
        </div>
      </section>
    );
  }

  const directInitials = String(
    selectedDirectConversation?.other_display_name ||
    selectedDirectConversation?.other_email ||
    'DM',
  )
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const selectedPresentation = selectedDirectConversation
    ? {
      shortLabel: 'Direct',
      eyebrow: 'Direct message',
      initials: directInitials || 'DM',
    }
    : COMMUNITY_PRESENTATION[selectedCommunity?.code] || {
      shortLabel: selectedCommunity?.code || 'Community',
      eyebrow: 'CoderSchool Community',
      initials: 'CS',
    };

  return (
    <>
      <section className="messaging-shell messaging-shell--channels messaging-shell--focus messaging-shell--member-merged">
        <div className="messaging-workspace">
          <header className="messaging-workspace-header">
            <button
              type="button"
              className="messaging-mobile-navigation-button"
              onClick={() => setMobileNavigationOpen(true)}
              aria-label="Open communities, channels, and direct messages"
              aria-expanded={mobileNavigationOpen}
            >
              <NavigationIcon />
              <span>Chats</span>
            </button>

            <div className="messaging-workspace-title-group">
              <CommunityIcon initials={selectedPresentation.initials} />
              <div>
                <p className="messaging-panel-kicker">
                  {selectedPresentation.eyebrow}
                </p>
                <h2>{selectedDirectConversation ? (selectedDirectConversation.other_display_name || selectedDirectConversation.other_email) : selectedCommunity?.name}</h2>
              </div>
            </div>

            <div className="messaging-header-actions">
              <button type="button" className="messaging-secondary-button messaging-search-trigger" onClick={() => setMessageSearchOpen(true)} title="Search messages">
                ⌕ Search
              </button>
              {!selectedDirectConversation && isAdmin ? (
                <>
                  <button
                    type="button"
                    className="messaging-secondary-button"
                    onClick={() => setMembersModalOpen(true)}
                  >
                    Manage members
                  </button>
                  <button
                    type="button"
                    className="messaging-primary-button messaging-primary-button--compact"
                    onClick={() => setChannelModalOpen(true)}
                    disabled={!canCreateClassChannel}
                    title={
                      !canCreateClassChannel
                        ? 'Add at least one mentor and one mentee first.'
                        : undefined
                    }
                  >
                    <PlusIcon />
                    Create class channel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="messaging-secondary-button"
                  onClick={() => setDirectModalOpen(true)}
                  disabled={directCandidates.length === 0}
                >
                  <PlusIcon />
                  New message
                </button>
              )}
            </div>
          </header>

          <div className="messaging-workspace-content messaging-workspace-content--channels">
            {errorMessage ? (
              <div className="messaging-inline-alert">
                {errorMessage}
              </div>
            ) : null}

            {!selectedDirectConversation ? (
            <div className="messaging-community-summary messaging-community-summary--compact">
              <div>
                <p className="messaging-panel-kicker">
                  About this community
                </p>
                <h3>{selectedCommunity?.name}</h3>
                <p>
                  {selectedCommunity?.description ||
                    'This community contains a shared General chat and private class channels.'}
                </p>
              </div>

              <div className="messaging-summary-stats">
                {isAdmin ? (
                  <div className="messaging-summary-stat">
                    <strong>{communityMemberRows.length}</strong>
                    <span>Members</span>
                  </div>
                ) : null}
                <div className="messaging-summary-stat">
                  <strong>{classChannels.length}</strong>
                  <span>Class channels</span>
                </div>
              </div>
            </div>
            ) : null}

            <div
              className={`messaging-channel-layout ${
                mobileNavigationOpen ? 'is-mobile-navigation-open' : ''
              }`}
            >
              <aside className="messaging-channel-panel">
                <div className="messaging-mobile-navigation-header">
                  <strong>Chats</strong>
                  <button
                    type="button"
                    onClick={() => setMobileNavigationOpen(false)}
                    aria-label="Close chat navigation"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <section className="messaging-community-selector-section">
                  <label
                    className="messaging-community-selector-label"
                    htmlFor="messaging-community-selector"
                  >
                    Community
                  </label>

                  {communities.length > 1 ? (
                    <div className="messaging-community-select-wrap">
                      <CommunityIcon
                        initials={
                          COMMUNITY_PRESENTATION[selectedCommunity?.code]
                            ?.initials || 'CS'
                        }
                      />
                      <select
                        id="messaging-community-selector"
                        value={selectedCommunity?.code || ''}
                        onChange={(event) =>
                          handleSelectCommunity(event.target.value)
                        }
                        aria-label="Select community"
                      >
                        {communities.map((community) => {
                          const presentation =
                            COMMUNITY_PRESENTATION[community.code] || {
                              shortLabel: community.code,
                            };

                          return (
                            <option
                              key={community.id}
                              value={community.code}
                            >
                              {presentation.shortLabel} — {community.name}
                            </option>
                          );
                        })}
                      </select>
                      <svg
                        className="messaging-community-select-chevron"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  ) : (
                    <div className="messaging-community-single-card">
                      <CommunityIcon
                        initials={
                          COMMUNITY_PRESENTATION[selectedCommunity?.code]
                            ?.initials || 'CS'
                        }
                      />
                      <span>
                        <strong>
                          {COMMUNITY_PRESENTATION[selectedCommunity?.code]
                            ?.shortLabel || selectedCommunity?.code}
                        </strong>
                        <small>{selectedCommunity?.name}</small>
                      </span>
                    </div>
                  )}
                </section>

                <div className="messaging-channel-panel-header">
                  <div>
                    <p className="messaging-panel-kicker">Channels</p>
                    <h3>Community workspace</h3>
                  </div>
                </div>

                {loadingWorkspace ? (
                  <div className="messaging-channel-loading">
                    <span className="messaging-loading-spinner" />
                    Loading channels…
                  </div>
                ) : (
                  <div className="messaging-channel-list">
                    {channels.map((channel) => {
                      const isSelected =
                        channel.id === selectedChannel?.id;
                      const unreadCount = Number(
                        unreadByContext[`channel:${channel.id}`]?.unreadCount || 0,
                      );

                      return (
                        <button
                          key={channel.id}
                          type="button"
                          className={`messaging-channel-button ${
                            isSelected ? 'is-selected' : ''
                          }`}
                          onClick={() =>
                            handleSelectChannel(channel.id)
                          }
                        >
                          <span className="messaging-channel-symbol">
                            {channel.channel_type === 'community'
                              ? '#'
                              : '◉'}
                          </span>
                          <span className="messaging-channel-button-copy">
                            <strong>{channel.name}</strong>
                            <small>
                              {channel.channel_type === 'community'
                                ? 'Everyone in this community'
                                : 'Private mentor class'}
                            </small>
                          </span>
                          {channel.channel_type === 'community' ? (
                            <span className="messaging-general-badge">
                              General
                            </span>
                          ) : null}
                          {unreadCount > 0 ? (
                            <span
                              className="messaging-context-unread-badge"
                              aria-label={`${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`}
                            >
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="messaging-direct-section">
                  <div className="messaging-direct-section-header">
                    <p className="messaging-panel-kicker">Direct messages</p>
                    <button
                      type="button"
                      onClick={() => setDirectModalOpen(true)}
                      disabled={directCandidates.length === 0}
                      title="New direct message"
                      aria-label="New direct message"
                    >
                      <PlusIcon />
                    </button>
                  </div>

                  <div className="messaging-direct-list">
                    {directConversations.length === 0 ? (
                      <p className="messaging-direct-empty">
                        No direct conversations yet.
                      </p>
                    ) : (
                      directConversations.map((conversation) => {
                        const isSelected =
                          conversation.conversation_id === selectedDirectId;
                        const label =
                          conversation.other_display_name ||
                          conversation.other_email ||
                          'Direct message';
                        const unreadCount = Number(
                          unreadByContext[`direct:${conversation.conversation_id}`]?.unreadCount || 0,
                        );

                        return (
                          <button
                            key={conversation.conversation_id}
                            type="button"
                            className={`messaging-direct-button ${
                              isSelected ? 'is-selected' : ''
                            }`}
                            onClick={() =>
                              handleSelectDirectConversation(
                                conversation.conversation_id,
                              )
                            }
                          >
                            <PersonAvatar
                              profile={{
                                display_name: label,
                                email: conversation.other_email,
                              }}
                              size="small"
                            />
                            <strong className="messaging-direct-person-name">
                              {label}
                            </strong>
                            {unreadCount > 0 ? (
                              <span
                                className="messaging-context-unread-badge"
                                aria-label={`${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`}
                              >
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </aside>

              <button
                type="button"
                className="messaging-mobile-navigation-backdrop"
                onClick={() => setMobileNavigationOpen(false)}
                aria-label="Close chat navigation"
                tabIndex={mobileNavigationOpen ? 0 : -1}
              />

              <main className="messaging-channel-preview">
                {selectedDirectChannel ? (
                  <>
                    <header className="messaging-channel-preview-header messaging-channel-preview-header--direct">
                      <div>
                        <p className="messaging-panel-kicker">Direct message</p>
                        <h3>@ {selectedDirectChannel.name}</h3>
                        <p>
                          Private conversation with a member of your class channel.
                        </p>
                      </div>
                      <span className="messaging-channel-type-pill messaging-channel-type-pill--direct">
                        Direct
                      </span>
                    </header>

                    <ChatPanel
                      key={`direct-${selectedDirectChannel.id}`}
                      channel={selectedDirectChannel}
                      conversationMode="direct"
                      user={user}
                      currentUserId={currentUserId}
                      userRole={userRole}
                      onShowToast={showToast}
                      onConversationActivity={loadDirectWorkspace}
                      focusMessageId={focusMessageId}
                      focusThreadRootId={focusThreadRootId}
                    />
                  </>
                ) : selectedChannel ? (
                  <>
                    <header className="messaging-channel-preview-header">
                      <div>
                        <p className="messaging-panel-kicker">
                          {selectedChannel.channel_type === 'community'
                            ? 'Shared community chat'
                            : 'Private class channel'}
                        </p>
                        <h3># {selectedChannel.name}</h3>
                        <p>
                          {selectedChannel.description ||
                            (selectedChannel.channel_type === 'community'
                              ? 'All active community members will be able to join this chat.'
                              : 'Only the assigned mentor, mentees, and administrators can access this channel.')}
                        </p>
                      </div>

                      <span
                        className={`messaging-channel-type-pill messaging-channel-type-pill--${selectedChannel.channel_type}`}
                      >
                        {selectedChannel.channel_type === 'community'
                          ? 'Community'
                          : 'Class'}
                      </span>
                    </header>

                    <section className="messaging-channel-members-preview">
                      <div className="messaging-section-heading">
                        <div>
                          <h4>Access</h4>
                          <p>
                            {selectedChannel.channel_type === 'community'
                              ? 'Inherited from community membership'
                              : `${selectedChannelProfiles.length} explicit channel members`}
                          </p>
                        </div>
                      </div>

                      {selectedChannel.channel_type === 'community' ? (
                        <div className="messaging-access-rule-card">
                          <span className="messaging-access-rule-icon">◎</span>
                          <div>
                            <strong>Big community chat</strong>
                            <p>
                              Anyone added to {selectedCommunity.name}
                              automatically receives access to General.
                            </p>
                          </div>
                        </div>
                      ) : isAdmin && selectedChannelProfiles.length > 0 ? (
                        <div className="messaging-member-chip-list">
                          {selectedChannelProfiles.map((profile) => (
                            <div
                              key={profile.id}
                              className="messaging-member-chip"
                            >
                              <PersonAvatar profile={profile} size="small" />
                              <span>
                                <strong>{profile.display_name}</strong>
                                <small>{profile.role}</small>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : channelMemberRows.length > 0 ? (
                        <div className="messaging-access-rule-card">
                          <span className="messaging-access-rule-icon">◉</span>
                          <div>
                            <strong>Private class access</strong>
                            <p>
                              {channelMemberRows.length} assigned mentor and
                              mentee account{channelMemberRows.length === 1 ? '' : 's'}
                              can access this channel.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="messaging-inline-empty">
                          No active class members were found.
                        </div>
                      )}
                    </section>

                    <ChatPanel
                      key={selectedChannel.id}
                      channel={selectedChannel}
                      user={user}
                      currentUserId={currentUserId}
                      userRole={userRole}
                      onShowToast={showToast}
                      focusMessageId={focusMessageId}
                      focusThreadRootId={focusThreadRootId}
                    />
                  </>
                ) : (
                  <div className="messaging-inline-empty">
                    Select a channel or direct message to open the conversation.
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      </section>

      {membersModalOpen && selectedCommunity ? (
        <ManageMembersModal
          community={selectedCommunity}
          directory={directory}
          memberIds={communityMemberIds}
          savingUserId={savingUserId}
          onAdd={handleAddCommunityMember}
          onRemove={handleRemoveCommunityMember}
          onClose={() => setMembersModalOpen(false)}
        />
      ) : null}

      {channelModalOpen && selectedCommunity ? (
        <CreateChannelModal
          community={selectedCommunity}
          members={activeCommunityProfiles}
          saving={creatingChannel}
          onCreate={handleCreateChannel}
          onClose={() => setChannelModalOpen(false)}
        />
      ) : null}

      <MessagingSearchModal open={messageSearchOpen} onClose={() => setMessageSearchOpen(false)} />

      {directModalOpen ? (
        <StartDirectMessageModal
          candidates={directCandidates}
          savingUserId={savingDirectUserId}
          onStart={handleStartDirectConversation}
          onClose={() => setDirectModalOpen(false)}
        />
      ) : null}

      {toast ? (
        <div
          className={`messaging-toast messaging-toast--${toast.type}`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
