const DB_NAME = 'coderschool-messaging-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';
const FALLBACK_PREFIX = 'cs.messaging.draft.';

const canUseIndexedDb = () => typeof indexedDB !== 'undefined';

const openDraftDb = () =>
  new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async (mode, callback) => {
  const db = await openDraftDb();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let request;

    try {
      request = callback(store);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }

    if (request) {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    } else {
      transaction.oncomplete = () => resolve(null);
      transaction.onerror = () => reject(transaction.error);
    }

    transaction.oncomplete = () => db.close();
    transaction.onabort = () => db.close();
    transaction.onerror = () => db.close();
  });
};

export const buildMessagingDraftKey = ({
  userId,
  conversationMode = 'channel',
  conversationId,
  threadRootId = '',
}) =>
  [
    String(userId || ''),
    String(conversationMode || 'channel'),
    String(conversationId || ''),
    threadRootId ? `thread:${threadRootId}` : 'main',
  ].join(':');

export async function loadMessagingDraft(key) {
  if (!key) return null;

  try {
    if (canUseIndexedDb()) {
      const row = await withStore('readonly', (store) => store.get(key));
      if (row) return row;
    }
  } catch (error) {
    console.warn('IndexedDB draft load failed:', error);
  }

  try {
    const raw = localStorage.getItem(`${FALLBACK_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      files: [],
      preparedAttachments: parsed?.preparedAttachments || {},
    };
  } catch {
    return null;
  }
}

export async function saveMessagingDraft({
  key,
  text = '',
  files = [],
  preparedAttachments = {},
}) {
  if (!key) return;

  const hasContent = Boolean(String(text || '').trim()) || files.length > 0;

  if (!hasContent) {
    await deleteMessagingDraft(key);
    return;
  }

  const row = {
    key,
    text: String(text || ''),
    files: Array.from(files || []),
    preparedAttachments: preparedAttachments || {},
    updatedAt: Date.now(),
  };

  try {
    if (canUseIndexedDb()) {
      await withStore('readwrite', (store) => store.put(row));
    }
  } catch (error) {
    console.warn('IndexedDB draft save failed:', error);
  }

  try {
    localStorage.setItem(
      `${FALLBACK_PREFIX}${key}`,
      JSON.stringify({
        key,
        text: row.text,
        preparedAttachments: row.preparedAttachments,
        updatedAt: row.updatedAt,
      }),
    );
  } catch {
    // Storage quota/privacy mode: draft persistence becomes best effort.
  }
}

export async function deleteMessagingDraft(key) {
  if (!key) return;

  try {
    if (canUseIndexedDb()) {
      await withStore('readwrite', (store) => store.delete(key));
    }
  } catch (error) {
    console.warn('IndexedDB draft delete failed:', error);
  }

  try {
    localStorage.removeItem(`${FALLBACK_PREFIX}${key}`);
  } catch {
    // Ignore unavailable local storage.
  }
}
