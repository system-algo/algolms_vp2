import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { supabase } from '../../../supabaseClient.js';

import {
  addMessageReaction,
  deleteChannelMessage,
  editChannelMessage,
  getChannelMessages,
  removeMessageReaction,
  sendChannelMessage,
} from '../api/messages.js';

import {
  addDirectMessageReaction,
  deleteDirectMessage,
  editDirectMessage,
  getDirectMessages,
  removeDirectMessageReaction,
  sendDirectMessage,
} from '../api/directMessages.js';

import {
  cleanupPendingMessageAttachments,
  formatAttachmentSize,
  getAttachmentFingerprint,
  hydrateSingleAttachment,
  isImageAttachment,
  MAX_ATTACHMENTS_PER_MESSAGE,
  mergeAttachmentFiles,
  uploadSinglePendingMessageAttachment,
  validateAttachmentFiles,
} from '../api/attachments.js';

import {
  buildMessagingDraftKey,
  deleteMessagingDraft,
  loadMessagingDraft,
  saveMessagingDraft,
} from '../api/drafts.js';

import {
  getMessagingReadState,
  markMessagingConversationRead,
} from '../api/notifications.js';

import {
  getMentionCandidates,
  getPinnedMessageIds,
  toggleMessagePin,
} from '../api/enhancements.js';
import { SkeletonLine } from '../../../components/ui/Skeleton.jsx';

import FormattedMessage from './FormattedMessage.jsx';
import RichTextEditor from './RichTextEditor.jsx';

import './ChatPanel.css';

const QUICK_REACTIONS = ['👍', '✅', '👀', '🐛', '💻', '🚀'];

const EMOJI_SECTIONS = [
  {
    label: 'Popular',
    emojis: [
      '👍', '👎', '❤️', '😂', '🎉', '🔥', '👏', '🙏',
      '✅', '❌', '💯', '🤔', '👀', '😮', '😢', '😍',
      '😅', '😎', '💪', '⭐', '💡', '🤝', '🙌', '🥳',
      '🫶', '😭', '😡', '💬', '📌', '✨', '🏆', '🎯',
    ],
  },
  {
    label: 'Coding',
    emojis: [
      '💻', '🧑‍💻', '👨‍💻', '👩‍💻', '⌨️', '🖥️', '🤖', '🐛',
      '🔧', '🛠️', '⚙️', '🧩', '🧪', '🔬', '🔍', '💡',
      '🚀', '📦', '🗄️', '☁️', '📡', '🔒', '🔓', '🔑',
      '🔀', '🔁', '♻️', '⚡', '🧠', '📚', '📝', '⚠️',
    ],
  },
];

const formatMessageTime = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const dateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const formatDateSeparator = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dateKey(date) === dateKey(today)) return 'Today';
  if (dateKey(date) === dateKey(yesterday)) return 'Yesterday';
  return new Intl.DateTimeFormat('en', { weekday: 'short', day: '2-digit', month: 'short', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined }).format(date);
};

const getInitials = (value) =>
  String(value || 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

const sortMessages = (messages) =>
  [...messages].sort(
    (left, right) =>
      new Date(left.created_at).getTime() -
      new Date(right.created_at).getTime(),
  );

const addOrReplaceMessage = (messages, nextMessage) => {
  const index = messages.findIndex(
    (message) => message.id === nextMessage.id,
  );

  if (index === -1) {
    return sortMessages([
      ...messages,
      {
        ...nextMessage,
        reactions: nextMessage.reactions || [],
      },
    ]);
  }

  const current = messages[index];
  const copy = [...messages];

  copy[index] = {
    ...current,
    ...nextMessage,
    reactions: nextMessage.reactions || current.reactions || [],
  };

  return copy;
};

const addReactionToMessages = (messages, reaction) =>
  messages.map((message) => {
    if (message.id !== reaction.message_id) {
      return message;
    }

    const reactions = message.reactions || [];
    const exists = reactions.some(
      (item) =>
        item.message_id === reaction.message_id &&
        item.user_id === reaction.user_id &&
        item.emoji === reaction.emoji,
    );

    if (exists) {
      return message;
    }

    return {
      ...message,
      reactions: [...reactions, reaction],
    };
  });

const removeReactionFromMessages = (messages, reaction) =>
  messages.map((message) => {
    if (message.id !== reaction.message_id) {
      return message;
    }

    return {
      ...message,
      reactions: (message.reactions || []).filter(
        (item) =>
          !(
            item.user_id === reaction.user_id &&
            item.emoji === reaction.emoji
          ),
      ),
    };
  });

const addAttachmentToMessages = (messages, attachment, messageId) =>
  (messages || []).map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    const current = message.attachments || [];

    if (current.some((item) => item.id === attachment.id)) {
      return message;
    }

    return {
      ...message,
      attachments: [...current, attachment],
    };
  });

const resolveRootId = (message, messageMap) => {
  if (!message) {
    return null;
  }

  let current = message;
  const visited = new Set();

  while (current?.reply_to_id && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = messageMap.get(current.reply_to_id);

    if (!parent) {
      return current.reply_to_id;
    }

    current = parent;
  }

  return current?.id || message.id;
};

function EmojiPicker({
  onSelect,
  onClose,
  anchorRef,
  label = 'Choose emoji',
}) {
  const pickerRef = useRef(null);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    visibility: 'hidden',
  });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef?.current;
    const picker = pickerRef.current;

    if (!anchor || !picker) {
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const pickerRect = picker.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 8;

    let left = anchorRect.right - pickerRect.width;
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - pickerRect.width - viewportPadding),
    );

    let top = anchorRect.top - pickerRect.height - gap;

    if (top < viewportPadding) {
      top = anchorRect.bottom + gap;
    }

    if (top + pickerRect.height > window.innerHeight - viewportPadding) {
      top = Math.max(
        viewportPadding,
        window.innerHeight - pickerRect.height - viewportPadding,
      );
    }

    const nextPosition = {
      top: Math.round(top),
      left: Math.round(left),
      visibility: 'visible',
    };

    setPosition(nextPosition);
  }, [anchorRef, label]);

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleOutsidePress = (event) => {
      const target = event.target;
      const insidePicker = Boolean(pickerRef.current?.contains(target));
      const insideAnchor = Boolean(anchorRef?.current?.contains(target));

      if (insidePicker || insideAnchor) {
        return;
      }

      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOutsidePress, true);
    document.addEventListener('touchstart', handleOutsidePress, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutsidePress, true);
      document.removeEventListener('touchstart', handleOutsidePress, true);
    };
  }, [anchorRef, onClose]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={pickerRef}
      className="messaging-emoji-picker"
      role="dialog"
      aria-label={label}
      style={position}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
        <div className="messaging-emoji-picker-header">
          <div>
            <strong>Emoji</strong>
            <span>React or add one to your message</span>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            aria-label="Close emoji picker"
          >
            ×
          </button>
        </div>

        <div className="messaging-emoji-picker-content">
          {EMOJI_SECTIONS.map((section) => (
            <section key={section.label} className="messaging-emoji-section">
              <p>{section.label}</p>
              <div className="messaging-emoji-grid">
                {section.emojis.map((emoji, index) => (
                  <button
                    key={`${section.label}-${emoji}-${index}`}
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onSelect(emoji);
                    }}
                    title={`Use ${emoji}`}
                    aria-label={`Use ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
    </div>,
    document.body,
  );
}

function ReactionBar({ message, currentUserId, disabled, onToggle }) {
  const groups = useMemo(() => {
    const result = new Map();

    for (const reaction of message.reactions || []) {
      const current = result.get(reaction.emoji) || [];
      current.push(reaction);
      result.set(reaction.emoji, current);
    }

    return [...result.entries()];
  }, [message.reactions]);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="messaging-reaction-bar">
      {groups.map(([emoji, reactions]) => {
        const selected = reactions.some(
          (reaction) => reaction.user_id === currentUserId,
        );

        return (
          <button
            key={emoji}
            type="button"
            className={`messaging-reaction-chip ${
              selected ? 'is-selected' : ''
            }`}
            onClick={() => onToggle(message, emoji)}
            disabled={disabled}
            title={selected ? 'Remove reaction' : 'Add reaction'}
          >
            <span>{emoji}</span>
            <strong>{reactions.length}</strong>
          </button>
        );
      })}
    </div>
  );
}

function AttachmentLightbox({ attachments, initialIndex = 0, onClose }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const active = attachments?.[activeIndex] || null;

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key === 'ArrowLeft' && attachments.length > 1) {
        setActiveIndex((current) =>
          current <= 0 ? attachments.length - 1 : current - 1,
        );
      }

      if (event.key === 'ArrowRight' && attachments.length > 1) {
        setActiveIndex((current) =>
          current >= attachments.length - 1 ? 0 : current + 1,
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [attachments.length, onClose]);

  if (!active?.signed_url) return null;

  return createPortal(
    <div
      className="messaging-attachment-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${active.file_name}`}
      onClick={onClose}
    >
      <button
        type="button"
        className="messaging-attachment-lightbox-close"
        onClick={onClose}
        aria-label="Close attachment preview"
      >
        ×
      </button>

      {attachments.length > 1 ? (
        <button
          type="button"
          className="messaging-attachment-lightbox-nav is-prev"
          onClick={(event) => {
            event.stopPropagation();
            setActiveIndex((current) =>
              current <= 0 ? attachments.length - 1 : current - 1,
            );
          }}
          aria-label="Previous image"
        >
          ‹
        </button>
      ) : null}

      <div
        className="messaging-attachment-lightbox-content"
        onClick={(event) => event.stopPropagation()}
      >
        <img src={active.signed_url} alt={active.file_name || 'Attachment'} />
        <div>
          <strong>{active.file_name}</strong>
          <span>
            {formatAttachmentSize(Number(active.size_bytes || 0))}
            {attachments.length > 1
              ? ` · ${activeIndex + 1}/${attachments.length}`
              : ''}
          </span>
          <span className="messaging-attachment-lightbox-links">
            <a href={active.signed_url} target="_blank" rel="noreferrer noopener">Open original</a>
            <a href={active.signed_url} download={active.file_name || true}>Download</a>
          </span>
        </div>
      </div>

      {attachments.length > 1 ? (
        <button
          type="button"
          className="messaging-attachment-lightbox-nav is-next"
          onClick={(event) => {
            event.stopPropagation();
            setActiveIndex((current) =>
              current >= attachments.length - 1 ? 0 : current + 1,
            );
          }}
          aria-label="Next image"
        >
          ›
        </button>
      ) : null}
    </div>,
    document.body,
  );
}

function MessageAttachments({ attachments = [] }) {
  const [previewIndex, setPreviewIndex] = useState(null);
  const activeAttachments = attachments.filter((attachment) => !attachment?.expired_at);
  const expiredAttachments = attachments.filter((attachment) => Boolean(attachment?.expired_at));
  const images = activeAttachments.filter(isImageAttachment);
  const documents = activeAttachments.filter((attachment) => !isImageAttachment(attachment));

  if (attachments.length === 0) return null;

  return (
    <>
      {images.length > 0 ? (
        <div
          className={`messaging-attachment-gallery messaging-attachment-gallery--${Math.min(images.length, 5)}`}
          aria-label={`${images.length} image attachment${images.length === 1 ? '' : 's'}`}
        >
          {images.map((attachment, index) => {
            const unavailable = !attachment.signed_url;
            return (
              <button
                key={attachment.id || attachment.storage_path}
                type="button"
                className="messaging-attachment-gallery-item"
                onClick={() => {
                  if (!unavailable) setPreviewIndex(index);
                }}
                disabled={unavailable}
                title={unavailable ? 'Preview unavailable' : `Open ${attachment.file_name}`}
              >
                {attachment.signed_url ? (
                  <img
                    src={attachment.thumbnail_signed_url || attachment.signed_url}
                    alt={attachment.file_name || 'Image attachment'}
                    loading="lazy"
                  />
                ) : (
                  <span className="messaging-attachment-unavailable">Image unavailable</span>
                )}
                {images.length === 1 ? (
                  <span className="messaging-attachment-image-meta">
                    <strong>{attachment.file_name}</strong>
                    <small>{formatAttachmentSize(Number(attachment.size_bytes || 0))}</small>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div className="messaging-attachment-file-list">
          {documents.map((attachment) => {
            const unavailable = !attachment.signed_url;
            return (
              <a
                key={attachment.id || attachment.storage_path}
                className={`messaging-attachment-file-card ${unavailable ? 'is-unavailable' : ''}`}
                href={attachment.signed_url || undefined}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(event) => {
                  if (unavailable) event.preventDefault();
                }}
              >
                <span className="messaging-attachment-file-icon" aria-hidden="true">PDF</span>
                <span>
                  <strong>{attachment.file_name}</strong>
                  <small>{formatAttachmentSize(Number(attachment.size_bytes || 0))}</small>
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            );
          })}
        </div>
      ) : null}

      {expiredAttachments.length > 0 ? (
        <div className="messaging-expired-attachment-list" aria-label="Expired attachments">
          {expiredAttachments.map((attachment) => (
            <div
              key={attachment.id || attachment.storage_path}
              className="messaging-expired-attachment"
            >
              <span className="messaging-expired-attachment__icon" aria-hidden="true">📎</span>
              <span>
                <strong>{attachment.file_name || 'Attachment'}</strong>
                <small>Attachment expired after 90 days</small>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {previewIndex !== null ? (
        <AttachmentLightbox
          attachments={images}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      ) : null}
    </>
  );
}

function PendingAttachmentCard({
  file,
  onRemove,
  disabled,
  uploadState,
  onRetry,
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const image = isImageAttachment(file);
  const status = uploadState?.status || 'ready';
  const progress = Number(uploadState?.progress || 0);

  useEffect(() => {
    if (!image) {
      setPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, image]);

  const statusLabel =
    status === 'preparing'
      ? 'Preparing upload…'
      : status === 'uploading'
        ? `Uploading ${progress}%`
        : status === 'uploaded'
          ? 'Uploaded'
          : status === 'error'
            ? uploadState?.error || 'Upload failed'
            : formatAttachmentSize(file.size);

  return (
    <div className={`messaging-pending-attachment is-${status}`}>
      <span className="messaging-pending-attachment-preview">
        {image && previewUrl ? (
          <img src={previewUrl} alt="" />
        ) : (
          <span aria-hidden="true">PDF</span>
        )}
      </span>
      <span className="messaging-pending-attachment-copy">
        <strong>{file.name}</strong>
        <small>{statusLabel}</small>
        {status === 'uploading' || status === 'preparing' ? (
          <span className="messaging-upload-progress" aria-hidden="true">
            <span style={{ width: `${Math.max(4, progress)}%` }} />
          </span>
        ) : null}
      </span>
      {status === 'error' && onRetry ? (
        <button
          type="button"
          className="messaging-pending-attachment-retry"
          onClick={onRetry}
          disabled={disabled}
        >
          Retry
        </button>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${file.name}`}
        title="Remove attachment"
      >
        ×
      </button>
    </div>
  );
}

function MessageItem({
  message,
  currentUserId,
  isAdmin,
  channelIsActive,
  savingMessageId,
  reactionPendingKey,
  threadReplyCount = 0,
  threadLastReplyAt = null,
  showThreadAction = true,
  onOpenThread,
  onEdit,
  onDelete,
  onToggleReaction,
  isPinned = false,
  onTogglePin,
  onCopyLink,
}) {
  const isOwn = message.author_id === currentUserId;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content || '');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const emojiButtonRef = useRef(null);
  const actionMenuRef = useRef(null);
  const actionMenuButtonRef = useRef(null);

  useEffect(() => {
    setEditValue(message.content || '');
  }, [message.content]);

  useEffect(() => {
    if (!actionMenuOpen) {
      return undefined;
    }

    const handleOutsidePress = (event) => {
      if (
        actionMenuRef.current?.contains(event.target) ||
        actionMenuButtonRef.current?.contains(event.target) ||
        event.target?.closest?.('.messaging-emoji-picker')
      ) {
        return;
      }

      setActionMenuOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setActionMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePress);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePress);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [actionMenuOpen]);

  const handleSaveEdit = async () => {
    const normalized = editValue.trim();

    if (!normalized || normalized === message.content) {
      setEditing(false);
      setEditValue(message.content || '');
      return;
    }

    const saved = await onEdit(message, normalized);

    if (saved) {
      setEditing(false);
    }
  };

  return (
    <article
      className={`messaging-message-row ${isOwn ? 'is-own' : ''} ${
        message.deleted_at ? 'is-deleted' : ''
      }`}
    >
      <span
        className={`messaging-message-avatar messaging-message-avatar--${message.author_role}`}
        aria-hidden="true"
      >
        {getInitials(message.author_name)}
      </span>

      <div className="messaging-message-main">
        <header className="messaging-message-meta">
          <strong>{message.author_name}</strong>
          <span
            className={`messaging-message-role messaging-message-role--${message.author_role}`}
          >
            {message.author_role}
          </span>
          <time dateTime={message.created_at}>
            {formatMessageTime(message.created_at)}
          </time>
          {message.edited_at && !message.deleted_at ? (
            <span className="messaging-message-edited">edited</span>
          ) : null}
          {isPinned && !message.deleted_at ? (
            <span className="messaging-message-pinned" title="Pinned message">📌 pinned</span>
          ) : null}
        </header>

        {message.deleted_at ? (
          <p className="messaging-message-deleted-copy">
            This message was deleted.
          </p>
        ) : editing ? (
          <div className="messaging-message-edit-box">
            <textarea
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              maxLength={4000}
              rows={3}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setEditing(false);
                  setEditValue(message.content || '');
                }

                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  void handleSaveEdit();
                }
              }}
            />
            <div>
              <span>Enter to save · Esc to cancel</span>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditValue(message.content || '');
                }}
                disabled={savingMessageId === message.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="is-primary"
                onClick={() => void handleSaveEdit()}
                disabled={savingMessageId === message.id}
              >
                {savingMessageId === message.id ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : message.content?.trim() ? (
          <FormattedMessage content={message.content} />
        ) : null}

        {!message.deleted_at ? (
          <MessageAttachments attachments={message.attachments || []} />
        ) : null}

        {!message.deleted_at ? (
          <ReactionBar
            message={message}
            currentUserId={currentUserId}
            disabled={!channelIsActive}
            onToggle={onToggleReaction}
          />
        ) : null}

        {showThreadAction && threadReplyCount > 0 ? (
          <button
            type="button"
            className="messaging-thread-summary"
            onClick={() => onOpenThread?.(message)}
          >
            <span className="messaging-thread-summary-icon">↳</span>
            <strong>
              {threadReplyCount} {threadReplyCount === 1 ? 'reply' : 'replies'}
            </strong>
            {threadLastReplyAt ? (
              <span>Last reply {formatMessageTime(threadLastReplyAt)}</span>
            ) : null}
          </button>
        ) : null}
      </div>

      {!message.deleted_at && !editing ? (
        <button
          ref={actionMenuButtonRef}
          type="button"
          className="messaging-message-mobile-menu-button"
          onClick={(event) => {
            event.stopPropagation();
            setActionMenuOpen((current) => !current);
          }}
          aria-label="Open message actions"
          aria-expanded={actionMenuOpen}
        >
          •••
        </button>
      ) : null}

      {!message.deleted_at && !editing ? (
        <div
          ref={actionMenuRef}
          className={`messaging-message-actions ${
            actionMenuOpen ? 'is-open' : ''
          }`}
        >
          {channelIsActive ? (
            <>
              {showThreadAction ? (
                <button
                  type="button"
                  onClick={() => {
                    setActionMenuOpen(false);
                    onOpenThread?.(message);
                  }}
                  title="Open thread"
                >
                  Thread
                </button>
              ) : null}

              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="messaging-quick-reaction"
                  onClick={() => {
                    setActionMenuOpen(false);
                    onToggleReaction(message, emoji);
                  }}
                  disabled={reactionPendingKey === `${message.id}:${emoji}`}
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}

              <div className="messaging-more-emoji-wrap">
                <button
                  ref={emojiButtonRef}
                  type="button"
                  className="messaging-more-emoji-button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setEmojiPickerOpen((current) => !current);
                  }}
                  title="More emoji"
                  aria-expanded={emojiPickerOpen}
                >
                  +😊
                </button>
                {emojiPickerOpen ? (
                  <EmojiPicker
                    anchorRef={emojiButtonRef}
                    label="Choose a reaction"
                    onClose={() => setEmojiPickerOpen(false)}
                    onSelect={(emoji) => {
                      void onToggleReaction(message, emoji);
                      setEmojiPickerOpen(false);
                      setActionMenuOpen(false);
                    }}
                  />
                ) : null}
              </div>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setActionMenuOpen(false);
              onCopyLink?.(message);
            }}
            title="Copy link to message"
          >
            Copy link
          </button>

          <button
            type="button"
            onClick={() => {
              setActionMenuOpen(false);
              onTogglePin?.(message);
            }}
            title={isPinned ? 'Unpin message' : 'Pin message'}
          >
            {isPinned ? 'Unpin' : 'Pin'}
          </button>

          {isOwn && channelIsActive ? (
            <button
              type="button"
              onClick={() => {
                setActionMenuOpen(false);
                setEditing(true);
              }}
              title="Edit message"
            >
              Edit
            </button>
          ) : null}

          {(isOwn && channelIsActive) || isAdmin ? (
            <button
              type="button"
              className="is-danger"
              onClick={() => {
                setActionMenuOpen(false);
                onDelete(message);
              }}
              disabled={savingMessageId === message.id}
              title="Delete message"
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function MessageComposer({
  draft,
  setDraft,
  sending,
  sendError,
  placeholder,
  textareaRef,
  onSend,
  attachmentFiles = [],
  setAttachmentFiles,
  onAttachmentError,
  uploadStates = {},
  onRetryAttachment,
  onRemoveAttachment,
  mentionCandidates = [],
  compact = false,
}) {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const [activeFormats, setActiveFormats] = useState({});
  const [draggingFiles, setDraggingFiles] = useState(false);
  const emojiButtonRef = useRef(null);
  const mentionPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    if (!mentionPickerOpen) return undefined;
    const handleOutside = (event) => {
      if (!mentionPickerRef.current?.contains(event.target)) setMentionPickerOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setMentionPickerOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [mentionPickerOpen]);

  const appendAttachmentFiles = useCallback(
    (files) => {
      const selected = Array.from(files || []);

      if (selected.length === 0) {
        return;
      }

      try {
        const { files: nextFiles, duplicateCount } = mergeAttachmentFiles(
          attachmentFiles,
          selected,
        );
        setAttachmentFiles?.(nextFiles);
        onAttachmentError?.(
          duplicateCount > 0
            ? `${duplicateCount === 1 ? 'That file is' : `${duplicateCount} files are`} already attached.`
            : '',
        );
      } catch (error) {
        onAttachmentError?.(error?.message || 'The selected file could not be attached.');
      }
    },
    [attachmentFiles, onAttachmentError, setAttachmentFiles],
  );

  const handleFilesSelected = useCallback(
    (event) => {
      appendAttachmentFiles(event.target.files);
      event.target.value = '';
    },
    [appendAttachmentFiles],
  );

  const isFileDrag = useCallback((event) => {
    const types = Array.from(event.dataTransfer?.types || []);
    return types.includes('Files');
  }, []);

  const handleDragEnter = useCallback(
    (event) => {
      if (sending || !isFileDrag(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current += 1;
      setDraggingFiles(true);
    },
    [isFileDrag, sending],
  );

  const handleDragOver = useCallback(
    (event) => {
      if (sending || !isFileDrag(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    },
    [isFileDrag, sending],
  );

  const handleDragLeave = useCallback(
    (event) => {
      if (!isFileDrag(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

      if (dragDepthRef.current === 0) {
        setDraggingFiles(false);
      }
    },
    [isFileDrag],
  );

  const handleDrop = useCallback(
    (event) => {
      if (!isFileDrag(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current = 0;
      setDraggingFiles(false);

      if (sending) {
        return;
      }

      appendAttachmentFiles(event.dataTransfer?.files);
    },
    [appendAttachmentFiles, isFileDrag, sending],
  );

  const refreshActiveFormats = useCallback(() => {
    const queryState = (command) => {
      try {
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    };

    setActiveFormats({
      bold: queryState('bold'),
      italic: queryState('italic'),
      underline: queryState('underline'),
      strike: queryState('strikeThrough'),
      numbered: queryState('insertOrderedList'),
      bullets: queryState('insertUnorderedList'),
    });
  }, []);

  const applyCommand = useCallback(
    (command, value = null) => {
      textareaRef.current?.applyCommand(command, value);
      window.requestAnimationFrame(refreshActiveFormats);
    },
    [refreshActiveFormats, textareaRef],
  );

  const insertLink = useCallback(() => {
    textareaRef.current?.rememberSelection();
    const enteredUrl = window.prompt(
      'Paste the web address (https://...)',
      'https://',
    );

    if (!enteredUrl) {
      textareaRef.current?.focus();
      return;
    }

    const normalizedUrl = /^https?:\/\//i.test(enteredUrl)
      ? enteredUrl
      : `https://${enteredUrl}`;

    textareaRef.current?.insertLink(normalizedUrl, normalizedUrl);
    window.requestAnimationFrame(refreshActiveFormats);
  }, [refreshActiveFormats, textareaRef]);

  const insertEmoji = useCallback(
    (emoji) => {
      textareaRef.current?.insertText(emoji);
      setEmojiPickerOpen(false);
    },
    [textareaRef],
  );

  const insertMention = useCallback(
    (candidate) => {
      const token = String(candidate?.mention_token || '').trim();
      if (!token) return;
      textareaRef.current?.insertText(`@${token} `);
      setMentionPickerOpen(false);
    },
    [textareaRef],
  );

  const toolbarItems = [
    {
      key: 'bold',
      label: 'Bold',
      content: <strong>B</strong>,
      active: activeFormats.bold,
      action: () => applyCommand('bold'),
    },
    {
      key: 'italic',
      label: 'Italic',
      content: <em>I</em>,
      active: activeFormats.italic,
      action: () => applyCommand('italic'),
    },
    {
      key: 'underline',
      label: 'Underline',
      content: <u>U</u>,
      active: activeFormats.underline,
      action: () => applyCommand('underline'),
    },
    {
      key: 'strike',
      label: 'Strikethrough',
      content: <s>S</s>,
      active: activeFormats.strike,
      action: () => applyCommand('strikeThrough'),
    },
    { key: 'separator-1', separator: true },
    {
      key: 'link',
      label: 'Insert link',
      content: '🔗',
      action: insertLink,
    },
    {
      key: 'numbered',
      label: 'Numbered list',
      content: '1.',
      active: activeFormats.numbered,
      action: () => applyCommand('insertOrderedList'),
    },
    {
      key: 'bullets',
      label: 'Bulleted list',
      content: '•',
      active: activeFormats.bullets,
      action: () => applyCommand('insertUnorderedList'),
    },
    {
      key: 'quote',
      label: 'Quote',
      content: '❯',
      action: () => applyCommand('formatBlock', 'blockquote'),
    },
    { key: 'separator-2', separator: true },
    {
      key: 'inline-code',
      label: 'Inline code',
      content: '</>',
      action: () => textareaRef.current?.wrapInline('code', 'code'),
    },
    {
      key: 'code-block',
      label: 'Code block',
      content: '{ }',
      action: () => applyCommand('formatBlock', 'pre'),
    },
  ];

  return (
    <div
      className={`messaging-composer-shell ${
        compact ? 'messaging-composer-shell--thread' : ''
      } ${draggingFiles ? 'is-dragging-files' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {draggingFiles ? (
        <div className="messaging-attachment-drop-overlay" role="status" aria-live="polite">
          <span className="messaging-attachment-drop-icon" aria-hidden="true">
            +
          </span>
          <strong>Drop files here to attach</strong>
          <small>Images or PDF · max 10 MB each · up to 5 files</small>
        </div>
      ) : null}

      <form
        className="messaging-composer-box"
        onSubmit={(event) => {
          event.preventDefault();
          void onSend();
        }}
      >
        <div className="messaging-format-toolbar" aria-label="Message formatting">
          {toolbarItems.map((item) =>
            item.separator ? (
              <span key={item.key} className="messaging-format-separator" />
            ) : (
              <button
                key={item.key}
                type="button"
                className={item.active ? 'is-active' : ''}
                onMouseDown={(event) => {
                  event.preventDefault();
                  textareaRef.current?.rememberSelection();
                }}
                onClick={item.action}
                title={item.label}
                aria-label={item.label}
                aria-pressed={item.active || undefined}
              >
                {item.content}
              </button>
            ),
          )}
        </div>

        <div className="messaging-composer-editor">
          <RichTextEditor
            ref={textareaRef}
            value={draft}
            onChange={setDraft}
            placeholder={placeholder}
            compact={compact}
            disabled={sending}
            onSubmit={() => void onSend()}
            onSelectionChange={refreshActiveFormats}
            onPasteFiles={appendAttachmentFiles}
          />
        </div>

        {attachmentFiles.length > 0 ? (
          <div className="messaging-pending-attachments" aria-label="Attachments ready to send">
            {attachmentFiles.map((file, index) => (
              <PendingAttachmentCard
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                file={file}
                disabled={sending}
                uploadState={uploadStates[getAttachmentFingerprint(file)]}
                onRetry={
                  onRetryAttachment
                    ? () => onRetryAttachment(file)
                    : null
                }
                onRemove={() => {
                  if (onRemoveAttachment) {
                    onRemoveAttachment(file, index);
                    return;
                  }
                  setAttachmentFiles?.(
                    attachmentFiles.filter((_, fileIndex) => fileIndex !== index),
                  );
                }}
              />
            ))}
          </div>
        ) : null}

        <div className="messaging-composer-footer">
          <div className="messaging-composer-footer-actions">
            <button
              ref={emojiButtonRef}
              type="button"
              className="messaging-composer-tool-button"
              onMouseDown={(event) => {
                event.preventDefault();
                textareaRef.current?.rememberSelection();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMentionPickerOpen(false);
                setEmojiPickerOpen((current) => !current);
              }}
              title="Add emoji"
              aria-expanded={emojiPickerOpen}
            >
              😊
            </button>
            {emojiPickerOpen ? (
              <EmojiPicker
                anchorRef={emojiButtonRef}
                label="Insert emoji into message"
                onClose={() => setEmojiPickerOpen(false)}
                onSelect={insertEmoji}
              />
            ) : null}
            {mentionCandidates.length > 0 ? (
              <div ref={mentionPickerRef} className="messaging-mention-picker-wrap">
                <button
                  type="button"
                  className="messaging-composer-tool-button messaging-mention-button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    textareaRef.current?.rememberSelection();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    setEmojiPickerOpen(false);
                    setMentionPickerOpen((current) => !current);
                  }}
                  title="Mention someone"
                  aria-label="Mention someone"
                  aria-expanded={mentionPickerOpen}
                >
                  @
                </button>
                {mentionPickerOpen ? (
                  <div className="messaging-mention-picker" role="menu" aria-label="Mention a participant">
                    <strong>Mention someone</strong>
                    <div>
                      {mentionCandidates.map((candidate) => (
                        <button
                          key={candidate.user_id}
                          type="button"
                          role="menuitem"
                          onClick={() => insertMention(candidate)}
                        >
                          <span>{candidate.display_name || 'User'}</span>
                          <small>@{candidate.mention_token}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              className="messaging-attachment-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              multiple
              onChange={handleFilesSelected}
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              className="messaging-composer-tool-button messaging-attachment-button"
              onClick={() => {
                setMentionPickerOpen(false);
                fileInputRef.current?.click();
              }}
              disabled={sending || attachmentFiles.length >= MAX_ATTACHMENTS_PER_MESSAGE}
              title="Attach image or PDF (max 10 MB)"
              aria-label="Attach image or PDF"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <span className="messaging-composer-shortcut">
              Enter sends · In a list, Enter adds the next item · Shift + Enter adds a line break
            </span>
          </div>

          <div className="messaging-composer-submit-group">
            <span>
              {attachmentFiles.length > 0 ? `${attachmentFiles.length}/5 files · ` : ''}
              {draft.length}/4000
            </span>
            <button
              type="submit"
              className="messaging-send-button"
              disabled={(!draft.trim() && attachmentFiles.length === 0) || sending}
              title="Send message"
              aria-label="Send message"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
              <span>{sending ? 'Sending…' : 'Send'}</span>
            </button>
          </div>
        </div>
      </form>

      {sendError ? (
        <div className="messaging-composer-error" role="alert">
          <strong>Message not sent.</strong>
          <span>{sendError}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function ChatPanel({
  channel,
  user,
  currentUserId: currentUserIdProp = '',
  userRole,
  onShowToast,
  conversationMode = 'channel',
  onConversationActivity,
  focusMessageId = '',
  focusThreadRootId = '',
}) {
  const [resolvedCurrentUserId, setResolvedCurrentUserId] = useState(
    currentUserIdProp || user?.id || '',
  );

  useEffect(() => {
    let mounted = true;
    const identityFromProps = currentUserIdProp || user?.id || '';

    if (identityFromProps) {
      setResolvedCurrentUserId(identityFromProps);
    } else {
      const resolveIdentity = async () => {
        const { data } = await supabase.auth.getUser();
        const authUserId = data?.user?.id || '';

        if (mounted) {
          setResolvedCurrentUserId(authUserId);
        }
      };

      resolveIdentity();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUserId = session?.user?.id || '';

      if (mounted) {
        setResolvedCurrentUserId(authUserId);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [currentUserIdProp, user?.id]);

  const currentUserId =
    currentUserIdProp || user?.id || resolvedCurrentUserId;
  const isAdmin = userRole === 'admin';
  const isDirect = conversationMode === 'direct' || channel?.channel_type === 'direct';
  const channelIsActive = channel?.status === 'active';
  const canModerateOthers = isAdmin && !isDirect;

  const loadConversationMessages = isDirect
    ? getDirectMessages
    : getChannelMessages;
  const resolvedDisplayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    'User';

  const sendConversationMessage = isDirect
    ? ({ channelId, ...options }) => sendDirectMessage({
      conversationId: channelId,
      authorId: currentUserId,
      authorName: resolvedDisplayName,
      authorRole: userRole,
      ...options,
    })
    : (options) => sendChannelMessage({
      authorId: currentUserId,
      authorName: resolvedDisplayName,
      authorRole: userRole,
      ...options,
    });
  const editConversationMessage = isDirect
    ? editDirectMessage
    : editChannelMessage;
  const deleteConversationMessage = isDirect
    ? deleteDirectMessage
    : deleteChannelMessage;
  const addConversationReaction = isDirect
    ? addDirectMessageReaction
    : addMessageReaction;
  const removeConversationReaction = isDirect
    ? removeDirectMessageReaction
    : removeMessageReaction;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [preparedAttachments, setPreparedAttachments] = useState({});
  const [attachmentUploadStates, setAttachmentUploadStates] = useState({});
  const [mainDraftHydrated, setMainDraftHydrated] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [threadRootId, setThreadRootId] = useState(null);
  const [threadDraft, setThreadDraft] = useState('');
  const [threadPendingAttachments, setThreadPendingAttachments] = useState([]);
  const [threadPreparedAttachments, setThreadPreparedAttachments] = useState({});
  const [threadAttachmentUploadStates, setThreadAttachmentUploadStates] = useState({});
  const [threadDraftHydrated, setThreadDraftHydrated] = useState(false);
  const [threadSending, setThreadSending] = useState(false);
  const [threadSendError, setThreadSendError] = useState('');
  const [unreadBoundaryAt, setUnreadBoundaryAt] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState('');
  const [savingMessageId, setSavingMessageId] = useState('');
  const [reactionPendingKey, setReactionPendingKey] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING');
  const [mainDraggingFiles, setMainDraggingFiles] = useState(false);
  const [threadDraggingFiles, setThreadDraggingFiles] = useState(false);
  const [pinnedRows, setPinnedRows] = useState([]);
  const [mentionCandidates, setMentionCandidates] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [newMessagesBelow, setNewMessagesBelow] = useState(0);

  const listRef = useRef(null);
  const threadListRef = useRef(null);
  const composerRef = useRef(null);
  const threadComposerRef = useRef(null);
  const mainDragDepthRef = useRef(0);
  const threadDragDepthRef = useRef(0);
  const presenceChannelRef = useRef(null);
  const typingTimerRef = useRef(null);
  const localTypingActiveRef = useRef(false);
  const lastTypingBroadcastAtRef = useRef(0);
  const incomingTypingTimersRef = useRef(new Map());
  const readTimerRef = useRef(null);
  const pendingReadAtRef = useRef(null);
  const lastMarkedReadAtRef = useRef(0);

  const contextType = isDirect ? 'direct' : 'channel';
  const mainDraftKey = useMemo(
    () =>
      currentUserId && channel?.id
        ? buildMessagingDraftKey({
          userId: currentUserId,
          conversationMode: contextType,
          conversationId: channel.id,
        })
        : '',
    [channel?.id, contextType, currentUserId],
  );
  const threadDraftKey = useMemo(
    () =>
      currentUserId && channel?.id && threadRootId
        ? buildMessagingDraftKey({
          userId: currentUserId,
          conversationMode: contextType,
          conversationId: channel.id,
          threadRootId,
        })
        : '',
    [channel?.id, contextType, currentUserId, threadRootId],
  );

  const updateAttachmentUploadState = useCallback((target, event) => {
    const setState =
      target === 'thread'
        ? setThreadAttachmentUploadStates
        : setAttachmentUploadStates;

    setState((current) => ({
      ...current,
      [event.fingerprint]: {
        status: event.status,
        progress: Number(event.progress || 0),
        error: event.error || '',
      },
    }));
  }, []);

  const rememberPreparedAttachments = useCallback((target, attachments) => {
    const setPrepared =
      target === 'thread'
        ? setThreadPreparedAttachments
        : setPreparedAttachments;

    setPrepared((current) => {
      const next = { ...current };
      for (const attachment of attachments || []) {
        const fingerprint = attachment?.client_fingerprint;
        if (fingerprint && attachment?.storage_path) {
          next[fingerprint] = attachment;
        }
      }
      return next;
    });
  }, []);

  const removePendingAttachment = useCallback(
    async (target, file, index) => {
      const fingerprint = getAttachmentFingerprint(file);
      const prepared =
        target === 'thread'
          ? threadPreparedAttachments[fingerprint]
          : preparedAttachments[fingerprint];

      if (prepared?.storage_path) {
        await cleanupPendingMessageAttachments([prepared]);
      }

      if (target === 'thread') {
        setThreadPendingAttachments((current) =>
          current.filter((_, fileIndex) => fileIndex !== index),
        );
        setThreadPreparedAttachments((current) => {
          const next = { ...current };
          delete next[fingerprint];
          return next;
        });
        setThreadAttachmentUploadStates((current) => {
          const next = { ...current };
          delete next[fingerprint];
          return next;
        });
      } else {
        setPendingAttachments((current) =>
          current.filter((_, fileIndex) => fileIndex !== index),
        );
        setPreparedAttachments((current) => {
          const next = { ...current };
          delete next[fingerprint];
          return next;
        });
        setAttachmentUploadStates((current) => {
          const next = { ...current };
          delete next[fingerprint];
          return next;
        });
      }
    },
    [preparedAttachments, threadPreparedAttachments],
  );

  const retryAttachmentUpload = useCallback(
    async (target, file) => {
      const fingerprint = getAttachmentFingerprint(file);
      const onProgress = (event) => updateAttachmentUploadState(target, event);

      try {
        const attachment = await uploadSinglePendingMessageAttachment(file, {
          onProgress,
        });
        rememberPreparedAttachments(target, [attachment]);

        if (target === 'thread') {
          setThreadSendError('');
        } else {
          setSendError('');
        }
      } catch (error) {
        updateAttachmentUploadState(target, {
          fingerprint,
          status: 'error',
          progress: 0,
          error: error?.message || 'Upload failed.',
        });
      }
    },
    [rememberPreparedAttachments, updateAttachmentUploadState],
  );

  const appendDroppedFiles = useCallback(
    (files, target = 'main') => {
      const selected = Array.from(files || []);

      if (selected.length === 0) {
        return;
      }

      const current =
        target === 'thread' ? threadPendingAttachments : pendingAttachments;

      try {
        const { files: nextFiles, duplicateCount } = mergeAttachmentFiles(
          current,
          selected,
        );

        if (target === 'thread') {
          setThreadPendingAttachments(nextFiles);
          setThreadSendError(
            duplicateCount > 0 ? 'That file is already attached.' : '',
          );
        } else {
          setPendingAttachments(nextFiles);
          setSendError(
            duplicateCount > 0 ? 'That file is already attached.' : '',
          );
        }
      } catch (error) {
        const message =
          error?.message || 'The dropped file could not be attached.';

        if (target === 'thread') {
          setThreadSendError(message);
        } else {
          setSendError(message);
        }
      }
    },
    [pendingAttachments, threadPendingAttachments],
  );

  const fileDragHandlers = useCallback(
    ({ target, disabled, depthRef, setDragging }) => ({
      onDragEnter: (event) => {
        const hasFiles = Array.from(event.dataTransfer?.types || []).includes('Files');

        if (disabled || !hasFiles) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        depthRef.current += 1;
        setDragging(true);
      },
      onDragOver: (event) => {
        const hasFiles = Array.from(event.dataTransfer?.types || []).includes('Files');

        if (disabled || !hasFiles) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'copy';
        }
      },
      onDragLeave: (event) => {
        const hasFiles = Array.from(event.dataTransfer?.types || []).includes('Files');

        if (!hasFiles) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        depthRef.current = Math.max(0, depthRef.current - 1);

        if (depthRef.current === 0) {
          setDragging(false);
        }
      },
      onDrop: (event) => {
        const hasFiles = Array.from(event.dataTransfer?.types || []).includes('Files');

        if (!hasFiles) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        depthRef.current = 0;
        setDragging(false);

        if (!disabled) {
          appendDroppedFiles(event.dataTransfer?.files, target);
        }
      },
    }),
    [appendDroppedFiles],
  );

  const mainDropHandlers = fileDragHandlers({
    target: 'main',
    disabled: !channelIsActive || sending,
    depthRef: mainDragDepthRef,
    setDragging: setMainDraggingFiles,
  });

  const threadDropHandlers = fileDragHandlers({
    target: 'thread',
    disabled: !channelIsActive || threadSending,
    depthRef: threadDragDepthRef,
    setDragging: setThreadDraggingFiles,
  });

  const messageMap = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages],
  );

  const repliesByRoot = useMemo(() => {
    const result = new Map();

    for (const message of messages) {
      if (!message.reply_to_id) {
        continue;
      }

      const rootId = resolveRootId(message, messageMap);
      const current = result.get(rootId) || [];
      current.push(message);
      result.set(rootId, sortMessages(current));
    }

    return result;
  }, [messageMap, messages]);

  const rootMessages = useMemo(
    () => messages.filter((message) => !message.reply_to_id),
    [messages],
  );
  const pinnedMessageIdSet = useMemo(
    () => new Set(pinnedRows.map((row) => row.message_id)),
    [pinnedRows],
  );
  const pinnedMessages = useMemo(
    () => pinnedRows
      .map((row) => messageMap.get(row.message_id))
      .filter((message) => message && !message.deleted_at),
    [messageMap, pinnedRows],
  );

  const threadRoot = threadRootId
    ? messageMap.get(threadRootId) || null
    : null;
  const threadReplies = threadRootId
    ? repliesByRoot.get(threadRootId) || []
    : [];

  const scrollToBottom = useCallback((behavior = 'auto') => {
    window.requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior,
      });
    });
  }, []);

  const scrollThreadToBottom = useCallback((behavior = 'auto') => {
    window.requestAnimationFrame(() => {
      threadListRef.current?.scrollTo({
        top: threadListRef.current.scrollHeight,
        behavior,
      });
    });
  }, []);

  const isNearBottom = useCallback((element) => {
    if (!element) return true;
    return element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  }, []);

  const handleMainScroll = useCallback(() => {
    const nearBottom = isNearBottom(listRef.current);
    setShowJumpToLatest(!nearBottom);
    if (nearBottom) setNewMessagesBelow(0);
  }, [isNearBottom]);

  const jumpToLatest = useCallback(() => {
    setShowJumpToLatest(false);
    setNewMessagesBelow(0);
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  const markReadThrough = useCallback((readAt) => {
    if (!channel?.id || !currentUserId || !readAt) return;

    const timestamp = Date.parse(readAt);
    if (!Number.isFinite(timestamp) || timestamp <= lastMarkedReadAtRef.current) return;

    const pendingTimestamp = Date.parse(pendingReadAtRef.current || '');
    if (!Number.isFinite(pendingTimestamp) || timestamp > pendingTimestamp) {
      pendingReadAtRef.current = readAt;
    }

    if (readTimerRef.current) return;

    readTimerRef.current = window.setTimeout(async () => {
      readTimerRef.current = null;
      const nextReadAt = pendingReadAtRef.current;
      pendingReadAtRef.current = null;
      if (!nextReadAt) return;

      try {
        await markMessagingConversationRead({
          contextType,
          contextId: channel.id,
          readAt: nextReadAt,
        });
        const nextTimestamp = Date.parse(nextReadAt);
        if (Number.isFinite(nextTimestamp)) {
          lastMarkedReadAtRef.current = Math.max(lastMarkedReadAtRef.current, nextTimestamp);
        }
      } catch (error) {
        console.warn('Failed to mark conversation as read:', error);
      }
    }, 450);
  }, [channel?.id, contextType, currentUserId]);

  const loadPins = useCallback(async () => {
    if (!channel?.id) { setPinnedRows([]); return; }
    try {
      setPinnedRows(await getPinnedMessageIds({ contextType, contextId: channel.id }));
    } catch (error) {
      console.warn('Pinned messages unavailable:', error);
    }
  }, [channel?.id, contextType]);

  useEffect(() => {
    void loadPins();
  }, [loadPins]);

  useEffect(() => {
    let cancelled = false;
    if (!channel?.id) {
      setMentionCandidates([]);
      return undefined;
    }

    void getMentionCandidates({ contextType, contextId: channel.id })
      .then((rows) => {
        if (!cancelled) setMentionCandidates(rows);
      })
      .catch((error) => {
        console.warn('Mention suggestions unavailable:', error);
        if (!cancelled) setMentionCandidates([]);
      });

    return () => {
      cancelled = true;
    };
  }, [channel?.id, contextType]);


  const broadcastTyping = useCallback((isTyping) => {
    const realtime = presenceChannelRef.current;
    if (!realtime || !currentUserId) return;

    const name = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email || 'Someone';
    const now = Date.now();

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (!isTyping) {
      if (!localTypingActiveRef.current) return;
      localTypingActiveRef.current = false;
      lastTypingBroadcastAtRef.current = now;
      void realtime.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, name, isTyping: false },
      });
      return;
    }

    // Do not broadcast on every keystroke. Send the start once, refresh only
    // during a long typing run, and send stop after the user becomes idle.
    if (!localTypingActiveRef.current || now - lastTypingBroadcastAtRef.current >= 5000) {
      localTypingActiveRef.current = true;
      lastTypingBroadcastAtRef.current = now;
      void realtime.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, name, isTyping: true },
      });
    }

    typingTimerRef.current = window.setTimeout(() => {
      const activeRealtime = presenceChannelRef.current;
      if (!activeRealtime || !localTypingActiveRef.current) return;
      localTypingActiveRef.current = false;
      lastTypingBroadcastAtRef.current = Date.now();
      void activeRealtime.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, name, isTyping: false },
      });
    }, 1600);
  }, [currentUserId, user?.email, user?.user_metadata?.display_name, user?.user_metadata?.name]);

  const loadMessages = useCallback(async () => {
    if (!channel?.id) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    try {
      let readState = null;
      try {
        readState = await getMessagingReadState({
          contextType,
          contextId: channel.id,
        });
      } catch (error) {
        console.warn('Messaging read state is unavailable:', error);
      }

      const nextMessages = await loadConversationMessages(channel.id, {
        limit: 250,
      });

      setUnreadBoundaryAt(readState);
      setMessages(nextMessages);
      scrollToBottom();

      const latestMessage = nextMessages[nextMessages.length - 1];
      if (latestMessage?.created_at && document.visibilityState === 'visible') {
        void markReadThrough(latestMessage.created_at);
      }
    } catch (error) {
      console.error('Failed to load channel messages:', error);
      setLoadError(error?.message || 'Messages could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [channel?.id, contextType, loadConversationMessages, markReadThrough, scrollToBottom]);

  useEffect(() => {
    setThreadRootId(null);
    setThreadDraft('');
    setThreadPendingAttachments([]);
    setThreadPreparedAttachments({});
    setThreadAttachmentUploadStates({});
    setThreadDraftHydrated(false);
    setThreadSendError('');
    setMessages([]);
    setUnreadBoundaryAt(null);
    setHighlightedMessageId('');
    setShowJumpToLatest(false);
    setNewMessagesBelow(0);
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    let cancelled = false;
    setMainDraftHydrated(false);
    setDraft('');
    setPendingAttachments([]);
    setPreparedAttachments({});
    setAttachmentUploadStates({});
    setSendError('');

    if (!mainDraftKey) {
      setMainDraftHydrated(true);
      return () => {
        cancelled = true;
      };
    }

    void loadMessagingDraft(mainDraftKey)
      .then((saved) => {
        if (cancelled || !saved) return;

        const files = Array.from(saved.files || []);
        try {
          validateAttachmentFiles(files);
          setPendingAttachments(files);
        } catch (error) {
          console.warn('Saved message attachments are no longer valid:', error);
        }
        setDraft(saved.text || '');
        setPreparedAttachments(saved.preparedAttachments || {});
      })
      .finally(() => {
        if (!cancelled) setMainDraftHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [mainDraftKey]);

  useEffect(() => {
    if (!mainDraftHydrated || !mainDraftKey) return undefined;

    const timer = window.setTimeout(() => {
      void saveMessagingDraft({
        key: mainDraftKey,
        text: draft,
        files: pendingAttachments,
        preparedAttachments,
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [draft, mainDraftHydrated, mainDraftKey, pendingAttachments, preparedAttachments]);

  useEffect(() => {
    let cancelled = false;
    setThreadDraftHydrated(false);
    setThreadDraft('');
    setThreadPendingAttachments([]);
    setThreadPreparedAttachments({});
    setThreadAttachmentUploadStates({});
    setThreadSendError('');

    if (!threadDraftKey) return () => {
      cancelled = true;
    };

    void loadMessagingDraft(threadDraftKey)
      .then((saved) => {
        if (cancelled || !saved) return;

        const files = Array.from(saved.files || []);
        try {
          validateAttachmentFiles(files);
          setThreadPendingAttachments(files);
        } catch (error) {
          console.warn('Saved thread attachments are no longer valid:', error);
        }
        setThreadDraft(saved.text || '');
        setThreadPreparedAttachments(saved.preparedAttachments || {});
      })
      .finally(() => {
        if (!cancelled) setThreadDraftHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [threadDraftKey]);

  useEffect(() => {
    if (!threadDraftHydrated || !threadDraftKey) return undefined;

    const timer = window.setTimeout(() => {
      void saveMessagingDraft({
        key: threadDraftKey,
        text: threadDraft,
        files: threadPendingAttachments,
        preparedAttachments: threadPreparedAttachments,
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    threadDraft,
    threadDraftHydrated,
    threadDraftKey,
    threadPendingAttachments,
    threadPreparedAttachments,
  ]);

  useEffect(() => {
    if (threadRootId && !threadRoot) {
      setThreadRootId(null);
    }
  }, [threadRoot, threadRootId]);

  useEffect(() => {
    if (!channel?.id || !currentUserId) return undefined;

    const displayName = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email || 'Someone';
    const topic = `${contextType}:${channel.id}`;
    const realtime = supabase.channel(topic, {
      config: {
        private: false,
        presence: { key: currentUserId },
        broadcast: { self: false },
      },
    });
    presenceChannelRef.current = realtime;

    const refreshPresence = () => {
      const state = realtime.presenceState();
      const entries = Object.values(state || {}).flat().filter(Boolean);
      const unique = new Map();
      entries.forEach((entry) => {
        const id = entry.user_id || entry.presence_ref;
        if (id && id !== currentUserId) unique.set(id, entry);
      });
      setOnlineUsers(Array.from(unique.values()));
    };

    const handleTyping = ({ payload }) => {
      if (!payload?.userId || payload.userId === currentUserId) return;

      const previousTimer = incomingTypingTimersRef.current.get(payload.userId);
      if (previousTimer) window.clearTimeout(previousTimer);

      setTypingUsers((current) => {
        const without = current.filter((item) => item.userId !== payload.userId);
        return payload.isTyping ? [...without, payload] : without;
      });

      if (payload.isTyping) {
        const timer = window.setTimeout(() => {
          incomingTypingTimersRef.current.delete(payload.userId);
          setTypingUsers((current) => current.filter((item) => item.userId !== payload.userId));
        }, 6500);
        incomingTypingTimersRef.current.set(payload.userId, timer);
      } else {
        incomingTypingTimersRef.current.delete(payload.userId);
      }
    };

    realtime
      .on('presence', { event: 'sync' }, refreshPresence)
      .on('broadcast', { event: 'typing' }, handleTyping)
      .on('broadcast', { event: 'message_insert' }, ({ payload: message }) => {
        setMessages((current) => addOrReplaceMessage(current, { ...message, reactions: [] }));
        if (isDirect) onConversationActivity?.();

        if (document.visibilityState === 'visible' && message?.created_at) {
          void markReadThrough(message.created_at);
        }

        if (message?.reply_to_id) {
          if (isNearBottom(threadListRef.current) || message.author_id === currentUserId) {
            scrollThreadToBottom('smooth');
          }
        } else if (isNearBottom(listRef.current) || message?.author_id === currentUserId) {
          scrollToBottom('smooth');
          setShowJumpToLatest(false);
          setNewMessagesBelow(0);
        } else {
          setShowJumpToLatest(true);
          setNewMessagesBelow((count) => count + 1);
        }
      })
      .on('broadcast', { event: 'message_update' }, ({ payload: message }) => {
        setMessages((current) => addOrReplaceMessage(current, message));
      })
      .on('broadcast', { event: 'reaction_insert' }, ({ payload: reaction }) => {
        setMessages((current) => addReactionToMessages(current, reaction));
      })
      .on('broadcast', { event: 'reaction_delete' }, ({ payload: reaction }) => {
        setMessages((current) => removeReactionFromMessages(current, reaction));
      })
      .on('broadcast', { event: 'attachment_insert' }, ({ payload: attachment }) => {
        const messageId = isDirect ? attachment?.direct_message_id : attachment?.channel_message_id;
        if (!messageId) return;
        void hydrateSingleAttachment(attachment).then((hydrated) => {
          if (!hydrated) return;
          setMessages((current) => addAttachmentToMessages(current, hydrated, messageId));
        });
      })
      .on('broadcast', { event: 'pins_change' }, () => {
        void loadPins();
      })
      .subscribe(async (status, error) => {
        setRealtimeStatus(status);
        if (error) console.warn('Messaging realtime notification:', error.message || error);
        if (status === 'SUBSCRIBED') {
          await realtime.track({
            user_id: currentUserId,
            name: displayName,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (localTypingActiveRef.current) {
        void realtime.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: currentUserId, name: displayName, isTyping: false },
        });
      }
      localTypingActiveRef.current = false;
      presenceChannelRef.current = null;
      setTypingUsers([]);
      setOnlineUsers([]);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
      incomingTypingTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      incomingTypingTimersRef.current.clear();
      void supabase.removeChannel(realtime);
    };
  }, [
    channel?.id,
    contextType,
    currentUserId,
    isDirect,
    isNearBottom,
    loadPins,
    markReadThrough,
    onConversationActivity,
    scrollThreadToBottom,
    scrollToBottom,
    user?.email,
    user?.user_metadata?.display_name,
    user?.user_metadata?.name,
  ]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const latest = messages[messages.length - 1];
      if (latest?.created_at) void markReadThrough(latest.created_at);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [markReadThrough, messages]);

  const handleSend = async () => {
    const normalized = draft.trim();

    if ((!normalized && pendingAttachments.length === 0) || !channel?.id || sending) {
      return;
    }

    setSending(true);
    setSendError('');

    try {
      const sentMessage = await sendConversationMessage({
        channelId: channel.id,
        content: normalized,
        replyToId: null,
        attachmentFiles: pendingAttachments,
        preparedAttachments,
        onUploadProgress: (event) => {
          updateAttachmentUploadState('main', event);
          if (event.attachment) {
            rememberPreparedAttachments('main', [event.attachment]);
          }
        },
      });

      setMessages((current) => addOrReplaceMessage(current, sentMessage));
      if (isDirect) onConversationActivity?.();

      setDraft('');
      broadcastTyping(false);
      setPendingAttachments([]);
      setPreparedAttachments({});
      setAttachmentUploadStates({});
      if (mainDraftKey) void deleteMessagingDraft(mainDraftKey);
      if (sentMessage?.created_at) void markReadThrough(sentMessage.created_at);
      scrollToBottom('smooth');
      composerRef.current?.focus();
    } catch (error) {
      rememberPreparedAttachments('main', error?.uploadedAttachments || []);
      const message = error?.message || 'The message could not be sent.';
      console.error('Failed to send message:', error);
      setSendError(message);
      onShowToast?.(message, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSendThreadReply = async () => {
    const normalized = threadDraft.trim();

    if (
      (!normalized && threadPendingAttachments.length === 0) ||
      !channel?.id ||
      !threadRoot?.id ||
      threadSending
    ) {
      return;
    }

    setThreadSending(true);
    setThreadSendError('');

    try {
      const sentMessage = await sendConversationMessage({
        channelId: channel.id,
        content: normalized,
        replyToId: threadRoot.id,
        attachmentFiles: threadPendingAttachments,
        preparedAttachments: threadPreparedAttachments,
        onUploadProgress: (event) => {
          updateAttachmentUploadState('thread', event);
          if (event.attachment) {
            rememberPreparedAttachments('thread', [event.attachment]);
          }
        },
      });

      setMessages((current) => addOrReplaceMessage(current, sentMessage));
      if (isDirect) onConversationActivity?.();

      setThreadDraft('');
      broadcastTyping(false);
      setThreadPendingAttachments([]);
      setThreadPreparedAttachments({});
      setThreadAttachmentUploadStates({});
      if (threadDraftKey) void deleteMessagingDraft(threadDraftKey);
      if (sentMessage?.created_at) void markReadThrough(sentMessage.created_at);
      scrollThreadToBottom('smooth');
      threadComposerRef.current?.focus();
    } catch (error) {
      rememberPreparedAttachments('thread', error?.uploadedAttachments || []);
      const message = error?.message || 'The thread reply could not be sent.';
      console.error('Failed to send thread reply:', error);
      setThreadSendError(message);
      onShowToast?.(message, 'error');
    } finally {
      setThreadSending(false);
    }
  };

  const handleEdit = async (message, content) => {
    setSavingMessageId(message.id);

    try {
      await editConversationMessage({ messageId: message.id, content });

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
              ...item,
              content,
              edited_at: new Date().toISOString(),
            }
            : item,
        ),
      );
      return true;
    } catch (error) {
      console.error('Failed to edit message:', error);
      onShowToast?.(
        error?.message || 'The message could not be edited.',
        'error',
      );
      return false;
    } finally {
      setSavingMessageId('');
    }
  };

  const handleDelete = async (message) => {
    const confirmed = window.confirm(
      canModerateOthers && message.author_id !== currentUserId
        ? `Delete ${message.author_name}'s message?`
        : 'Delete this message?',
    );

    if (!confirmed) {
      return;
    }

    setSavingMessageId(message.id);

    try {
      await deleteConversationMessage(message.id);

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
              ...item,
              deleted_at: new Date().toISOString(),
              deleted_by: currentUserId,
            }
            : item,
        ),
      );
    } catch (error) {
      console.error('Failed to delete message:', error);
      onShowToast?.(
        error?.message || 'The message could not be deleted.',
        'error',
      );
    } finally {
      setSavingMessageId('');
    }
  };

  const handleToggleReaction = async (message, emoji) => {
    if (!currentUserId || !channelIsActive || message.deleted_at) {
      return;
    }

    const key = `${message.id}:${emoji}`;
    const existing = (message.reactions || []).find(
      (reaction) =>
        reaction.user_id === currentUserId && reaction.emoji === emoji,
    );
    const optimisticReaction = existing || {
      message_id: message.id,
      user_id: currentUserId,
      emoji,
      created_at: new Date().toISOString(),
    };

    setReactionPendingKey(key);

    if (existing) {
      setMessages((current) =>
        removeReactionFromMessages(current, optimisticReaction),
      );
    } else {
      setMessages((current) =>
        addReactionToMessages(current, optimisticReaction),
      );
    }

    try {
      if (existing) {
        await removeConversationReaction({
          messageId: message.id,
          userId: currentUserId,
          emoji,
        });
      } else {
        const savedReaction = await addConversationReaction({
          messageId: message.id,
          userId: currentUserId,
          emoji,
        });

        if (savedReaction) {
          setMessages((current) =>
            addReactionToMessages(current, savedReaction),
          );
        }
      }

    } catch (error) {
      if (existing) {
        setMessages((current) =>
          addReactionToMessages(current, optimisticReaction),
        );
      } else {
        setMessages((current) =>
          removeReactionFromMessages(current, optimisticReaction),
        );
      }

      console.error('Failed to toggle reaction:', error);
      onShowToast?.(
        error?.message || 'The reaction could not be updated.',
        'error',
      );
    } finally {
      setReactionPendingKey('');
    }
  };

  const openThread = (message) => {
    const rootId = resolveRootId(message, messageMap);
    setThreadRootId(rootId);
    setThreadSendError('');
    scrollThreadToBottom();
  };

  const firstUnreadMessage = useMemo(() => {
    if (!unreadBoundaryAt) return null;
    const boundary = new Date(unreadBoundaryAt).getTime();
    if (!Number.isFinite(boundary)) return null;

    return messages.find(
      (message) =>
        message.author_id !== currentUserId &&
        !message.deleted_at &&
        new Date(message.created_at).getTime() > boundary,
    ) || null;
  }, [currentUserId, messages, unreadBoundaryAt]);

  const unreadDividerRootId = firstUnreadMessage
    ? resolveRootId(firstUnreadMessage, messageMap)
    : '';

  const firstUnreadThreadReplyId = useMemo(() => {
    if (!unreadBoundaryAt) return '';
    const boundary = new Date(unreadBoundaryAt).getTime();
    if (!Number.isFinite(boundary)) return '';

    return (
      threadReplies.find(
        (message) =>
          message.author_id !== currentUserId &&
          !message.deleted_at &&
          new Date(message.created_at).getTime() > boundary,
      )?.id || ''
    );
  }, [currentUserId, threadReplies, unreadBoundaryAt]);

  useEffect(() => {
    if (loading || !focusMessageId || messages.length === 0) return undefined;

    if (focusThreadRootId && messageMap.has(focusThreadRootId)) {
      setThreadRootId(focusThreadRootId);
    }

    setHighlightedMessageId(focusMessageId);

    const scrollTimer = window.setTimeout(() => {
      const targetId = focusThreadRootId
        ? `thread-message-${focusMessageId}`
        : `message-${focusMessageId}`;
      document.getElementById(targetId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, focusThreadRootId ? 140 : 40);

    const highlightTimer = window.setTimeout(() => {
      setHighlightedMessageId((current) =>
        current === focusMessageId ? '' : current,
      );
    }, 4200);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [focusMessageId, focusThreadRootId, loading, messageMap, messages.length]);

  const realtimeConnected = realtimeStatus === 'SUBSCRIBED';

  const handleTogglePin = useCallback(async (message) => {
    const wasPinned = pinnedMessageIdSet.has(message.id);
    setPinnedRows((current) => wasPinned
      ? current.filter((row) => row.message_id !== message.id)
      : [{ message_id: message.id, created_at: new Date().toISOString(), pinned_by: currentUserId }, ...current]);
    try {
      const pinned = await toggleMessagePin({ contextType, contextId: channel.id, messageId: message.id });
      if (pinned !== !wasPinned) await loadPins();
      onShowToast?.(pinned ? '📌 Message pinned.' : 'Message unpinned.', 'success');
    } catch (error) {
      await loadPins();
      onShowToast?.(error?.message || 'Pinned message could not be updated.', 'error');
    }
  }, [channel?.id, contextType, currentUserId, loadPins, onShowToast, pinnedMessageIdSet]);

  const handleCopyMessageLink = useCallback(async (message) => {
    const baseHash = String(window.location.hash || '#messages').split('?')[0];
    const params = new URLSearchParams();
    params.set('message', message.id);
    if (message.reply_to_id) params.set('thread', resolveRootId(message, messageMap));
    const link = `${window.location.origin}${window.location.pathname}${window.location.search}${baseHash}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(link);
      onShowToast?.('Message link copied.', 'success');
    } catch {
      onShowToast?.('Could not copy the message link.', 'error');
    }
  }, [messageMap, onShowToast]);

  const renderMessage = (message, { inThread = false } = {}) => {
    const replies = repliesByRoot.get(message.id) || [];

    return (
      <div
        key={message.id}
        id={`${inThread ? 'thread-message' : 'message'}-${message.id}`}
        className={`messaging-message-anchor ${
          highlightedMessageId === message.id ? 'is-highlighted' : ''
        }`}
      >
        <MessageItem
          message={message}
          currentUserId={currentUserId}
          isAdmin={canModerateOthers}
          channelIsActive={channelIsActive}
          savingMessageId={savingMessageId}
          reactionPendingKey={reactionPendingKey}
          threadReplyCount={inThread ? 0 : replies.length}
          threadLastReplyAt={
            inThread || replies.length === 0
              ? null
              : replies[replies.length - 1]?.created_at
          }
          showThreadAction={!inThread}
          onOpenThread={openThread}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleReaction={handleToggleReaction}
          isPinned={pinnedMessageIdSet.has(message.id)}
          onTogglePin={handleTogglePin}
          onCopyLink={handleCopyMessageLink}
        />
      </div>
    );
  };

  return (
    <section
      className={`messaging-chat-surface ${
        threadRoot ? 'has-open-thread' : ''
      }`}
    >
      <div className="messaging-chat-body">
        <div
          className={`messaging-chat-main ${mainDraggingFiles ? 'is-dragging-files' : ''}`}
          {...mainDropHandlers}
        >
          {mainDraggingFiles ? (
            <div className="messaging-chat-drop-overlay" role="status" aria-live="polite">
              <span className="messaging-attachment-drop-icon" aria-hidden="true">+</span>
              <strong>Drop files to attach to this message</strong>
              <small>Images or PDF · max 10 MB each · up to 5 files</small>
            </div>
          ) : null}
          <div className="messaging-chat-status-row">
            <span
              className={`messaging-realtime-status ${
                realtimeConnected ? 'is-connected' : ''
              }`}
            >
              <span aria-hidden="true" />
              {realtimeConnected ? 'Live' : 'Connecting…'}
            </span>
            <span className="messaging-presence-summary">
              {isDirect
                ? (onlineUsers.length ? 'Active now' : 'Offline')
                : `${onlineUsers.length + 1} online`}
            </span>
          </div>

          {pinnedMessages.length ? (
            <div className="messaging-pinned-strip" aria-label="Pinned messages">
              <span>📌 {pinnedMessages.length} pinned</span>
              {pinnedMessages.slice(0, 3).map((message) => (
                <button key={message.id} type="button" onClick={() => {
                  const rootId = message.reply_to_id ? resolveRootId(message, messageMap) : null;
                  if (rootId) setThreadRootId(rootId);
                  window.requestAnimationFrame(() => document.getElementById(`${message.reply_to_id ? 'thread-message' : 'message'}-${message.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                }}>
                  <strong>{message.author_name}</strong>
                  <span>{String(message.content || 'Attachment').slice(0, 52)}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div
            ref={listRef}
            className="messaging-message-list"
            aria-live="polite"
            onScroll={handleMainScroll}
          >
            {loading ? (
              <div className="messaging-message-skeletons" role="status" aria-label="Loading messages">
                {[0, 1, 2, 3].map((item) => (
                  <div className="messaging-message-skeleton" key={item}>
                    <span className="messaging-message-skeleton__avatar" />
                    <div><SkeletonLine width="28%" /><SkeletonLine width={item % 2 ? '62%' : '78%'} /></div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="messaging-chat-state messaging-chat-state--error">
                <strong>Messages are unavailable</strong>
                <p>{loadError}</p>
                <button type="button" onClick={() => void loadMessages()}>
                  Try again
                </button>
              </div>
            ) : rootMessages.length === 0 ? (
              <div className="messaging-chat-intro">
                <span className="messaging-chat-intro-icon">{isDirect ? '@' : '#'}</span>
                <h4>Welcome to {channel.name}</h4>
                <p>
                  This is the beginning of the conversation. Send the first
                  message to start the chat.
                </p>
              </div>
            ) : (
              rootMessages.map((message, index) => (
                <React.Fragment key={message.id}>
                  {index === 0 || dateKey(rootMessages[index - 1]?.created_at) !== dateKey(message.created_at) ? (
                    <div className="messaging-date-separator" role="separator"><span>{formatDateSeparator(message.created_at)}</span></div>
                  ) : null}
                  {message.id === unreadDividerRootId ? (
                    <div className="messaging-unread-divider" role="separator">
                      <span>New messages</span>
                    </div>
                  ) : null}
                  {renderMessage(message)}
                </React.Fragment>
              ))
            )}
          </div>

          {showJumpToLatest ? (
            <button type="button" className="messaging-jump-latest" onClick={jumpToLatest}>
              ↓ {newMessagesBelow ? `${newMessagesBelow} new · ` : ''}Jump to latest
            </button>
          ) : null}

          {typingUsers.length ? (
            <div className="messaging-typing-indicator" aria-live="polite">
              <span><i /><i /><i /></span>
              {typingUsers.length === 1 ? `${typingUsers[0].name || 'Someone'} is typing…` : `${typingUsers.length} people are typing…`}
            </div>
          ) : null}

          {channelIsActive ? (
            <MessageComposer
              draft={draft}
              setDraft={(value) => {
                setDraft(value);
                broadcastTyping(Boolean(String(value || '').trim()));
                if (sendError) {
                  setSendError('');
                }
              }}
              sending={sending}
              sendError={sendError}
              placeholder={isDirect ? `Message ${channel.name}` : `Message #${channel.name}`}
              textareaRef={composerRef}
              onSend={handleSend}
              attachmentFiles={pendingAttachments}
              setAttachmentFiles={setPendingAttachments}
              uploadStates={attachmentUploadStates}
              onRetryAttachment={(file) => void retryAttachmentUpload('main', file)}
              onRemoveAttachment={(file, index) =>
                void removePendingAttachment('main', file, index)
              }
              onAttachmentError={(message) => setSendError(message || '')}
              mentionCandidates={mentionCandidates}
            />
          ) : (
            <div className="messaging-readonly-banner">
              This channel is {channel.status.replace('_', ' ')}. New messages
              and reactions are disabled.
            </div>
          )}
        </div>

        {threadRoot ? (
          <aside
            className={`messaging-thread-panel ${threadDraggingFiles ? 'is-dragging-files' : ''}`}
            aria-label="Message thread"
            {...threadDropHandlers}
          >
            {threadDraggingFiles ? (
              <div className="messaging-chat-drop-overlay messaging-chat-drop-overlay--thread" role="status" aria-live="polite">
                <span className="messaging-attachment-drop-icon" aria-hidden="true">+</span>
                <strong>Drop files to attach to this reply</strong>
                <small>Images or PDF · max 10 MB each · up to 5 files</small>
              </div>
            ) : null}
            <header className="messaging-thread-header">
              <div>
                <p>Thread</p>
                <strong>
                  {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setThreadRootId(null)}
                aria-label="Close thread"
                title="Close thread"
              >
                ×
              </button>
            </header>

            <div ref={threadListRef} className="messaging-thread-list">
              <div className="messaging-thread-root">
                {renderMessage(threadRoot, { inThread: true })}
              </div>

              <div className="messaging-thread-divider">
                <span>
                  {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
                </span>
              </div>

              {threadReplies.length === 0 ? (
                <div className="messaging-thread-empty">
                  <span>↳</span>
                  <strong>Start this thread</strong>
                  <p>Keep replies together without filling the main chat.</p>
                </div>
              ) : (
                threadReplies.map((message, index) => (
                  <React.Fragment key={message.id}>
                    {index === 0 || dateKey(threadReplies[index - 1]?.created_at) !== dateKey(message.created_at) ? (
                      <div className="messaging-date-separator messaging-date-separator--thread" role="separator"><span>{formatDateSeparator(message.created_at)}</span></div>
                    ) : null}
                    {message.id === firstUnreadThreadReplyId ? (
                      <div className="messaging-unread-divider messaging-unread-divider--thread" role="separator">
                        <span>New replies</span>
                      </div>
                    ) : null}
                    {renderMessage(message, { inThread: true })}
                  </React.Fragment>
                ))
              )}
            </div>

            {channelIsActive ? (
              <MessageComposer
                compact
                draft={threadDraft}
                setDraft={(value) => {
                  setThreadDraft(value);
                  broadcastTyping(Boolean(String(value || '').trim()));
                  if (threadSendError) {
                    setThreadSendError('');
                  }
                }}
                sending={threadSending}
                sendError={threadSendError}
                placeholder={`Reply to ${threadRoot.author_name}`}
                textareaRef={threadComposerRef}
                onSend={handleSendThreadReply}
                attachmentFiles={threadPendingAttachments}
                setAttachmentFiles={setThreadPendingAttachments}
                uploadStates={threadAttachmentUploadStates}
                onRetryAttachment={(file) => void retryAttachmentUpload('thread', file)}
                onRemoveAttachment={(file, index) =>
                  void removePendingAttachment('thread', file, index)
                }
                onAttachmentError={(message) => setThreadSendError(message || '')}
                mentionCandidates={mentionCandidates}
              />
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
