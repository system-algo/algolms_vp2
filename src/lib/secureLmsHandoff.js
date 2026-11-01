// Receive the student's authenticated LMS context from the Algorithmics portal.
// The token is transferred with postMessage, never placed in the destination URL.
// Authentication context must be scoped to this browser tab. The LMS codebase
// still reads these legacy keys through localStorage, so redirect only those
// keys to sessionStorage while leaving all unrelated application storage alone.
const TAB_SCOPED_LMS_KEYS = new Set([
  'lms_student_email',
  'lms_user_email',
  'lms_course_id',
  'lms_supabase_url',
  'lms_supabase_key',
  'lms_access_token',
  'lms_backend_url',
  'lms_user_role',
  'lms_viewer_role',
  'lms_platform_origin',
]);

function installTabIsolatedLmsStorage() {
  if (typeof window === 'undefined' || window.__algoTabIsolatedLmsStorageInstalled) return;

  const storagePrototype = window.Storage.prototype;
  const nativeGetItem = storagePrototype.getItem;
  const nativeSetItem = storagePrototype.setItem;
  const nativeRemoveItem = storagePrototype.removeItem;
  const nativeClear = storagePrototype.clear;
  const localStore = window.localStorage;
  const tabStore = window.sessionStorage;

  storagePrototype.getItem = function getItem(key) {
    const normalizedKey = String(key);
    if (this === localStore && TAB_SCOPED_LMS_KEYS.has(normalizedKey)) {
      return nativeGetItem.call(tabStore, normalizedKey);
    }
    return nativeGetItem.call(this, normalizedKey);
  };

  storagePrototype.setItem = function setItem(key, value) {
    const normalizedKey = String(key);
    if (this === localStore && TAB_SCOPED_LMS_KEYS.has(normalizedKey)) {
      return nativeSetItem.call(tabStore, normalizedKey, String(value));
    }
    return nativeSetItem.call(this, normalizedKey, String(value));
  };

  storagePrototype.removeItem = function removeItem(key) {
    const normalizedKey = String(key);
    if (this === localStore && TAB_SCOPED_LMS_KEYS.has(normalizedKey)) {
      return nativeRemoveItem.call(tabStore, normalizedKey);
    }
    return nativeRemoveItem.call(this, normalizedKey);
  };

  storagePrototype.clear = function clear() {
    if (this === localStore) {
      for (const key of TAB_SCOPED_LMS_KEYS) {
        nativeRemoveItem.call(tabStore, key);
      }
    }
    return nativeClear.call(this);
  };

  // Never inherit browser-wide identity left by an older deployment.
  for (const key of TAB_SCOPED_LMS_KEYS) {
    nativeRemoveItem.call(localStore, key);
  }

  window.__algoTabIsolatedLmsStorageInstalled = true;
}

function clearTabScopedLmsContext() {
  for (const key of TAB_SCOPED_LMS_KEYS) {
    localStorage.removeItem(key);
  }
}

function decodeJwtPayload(token) {
  const payloadPart = String(token || '').split('.')[1];
  if (!payloadPart) throw new Error('Invalid LMS access token.');

  const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const bytes = Uint8Array.from(window.atob(padded), (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function assertTokenMatchesContext(context) {
  const viewerRole = String(context?.viewerRole || '').trim().toLowerCase();
  const teacherEmail = String(context?.teacherEmail || '').trim().toLowerCase();
  const studentEmail = String(context?.studentEmail || '').trim().toLowerCase();
  const expectedEmail =
    viewerRole === 'teacher' || viewerRole === 'admin'
      ? teacherEmail || studentEmail
      : studentEmail || teacherEmail;
  const tokenEmail = String(decodeJwtPayload(context?.accessToken).email || '')
    .trim()
    .toLowerCase();

  if (!expectedEmail || !tokenEmail || tokenEmail !== expectedEmail) {
    throw new Error('LMS handoff identity does not match the access token.');
  }
}

installTabIsolatedLmsStorage();

const PLATFORM_ORIGINS = new Set([
  'https://learn.algorithmics.edu.vn',
  'https://learn.algorithmics.com.vn',
  'https://learn.algo.edu.vn',
  'http://localhost:5173',
  'http://localhost:5174',
]);
const READY = 'ALGO_LMS_READY';
const HANDOFF = 'ALGO_LMS_HANDOFF';
const ACK = 'ALGO_LMS_HANDOFF_ACK';
const APPLIED_KEY = 'algo_vp2_secure_handoff_applied';
const SESSION_ACTIVE = 'algo_vp_session_active';
const SESSION_DEADLINE = 'algo_vp_session_deadline';
const SESSION_EXPIRED = 'algo_vp_session_expired';

export function installSecureLmsHandoffReceiver() {
  const opener = window.opener;
  if (!opener || window.__algoSecureLmsHandoffInstalled) return;
  window.__algoSecureLmsHandoffInstalled = true;

  // A completed handoff reloads this page to initialize application state.
  if (sessionStorage.getItem(APPLIED_KEY) && sessionStorage.getItem(SESSION_ACTIVE) === '1') {
    return;
  }

  window.__algoSecureLmsHandoffPending = true;
  let completed = false;
  let timer;
  let timeout;

  function cleanup() {
    window.removeEventListener('message', onMessage);
    if (timer) window.clearInterval(timer);
    if (timeout) window.clearTimeout(timeout);
  }

  function sendReady() {
    PLATFORM_ORIGINS.forEach((origin) => {
      try { opener.postMessage({ type: READY }, origin); } catch {}
    });
  }

  function onMessage(event) {
    if (event.source !== opener || !PLATFORM_ORIGINS.has(event.origin)) return;
    const data = event.data;
    if (data?.type !== HANDOFF || typeof data.handoffId !== 'string') return;
    const context = data.context;
    if (!context || !(context.studentEmail || context.teacherEmail) || !context.courseId ||
        !context.supabaseUrl || !context.supabaseKey || !context.accessToken) return;

    try {
      assertTokenMatchesContext(context);
    } catch (error) {
      console.error('Secure LMS handoff rejected:', error);
      return;
    }
    clearTabScopedLmsContext();

    const values = {
      lms_student_email: String(context.studentEmail || context.teacherEmail).trim().toLowerCase(),
      lms_user_email: String(context.teacherEmail || '').trim().toLowerCase(),
      lms_course_id: String(context.courseId),
      lms_supabase_url: String(context.supabaseUrl),
      lms_supabase_key: String(context.supabaseKey),
      lms_access_token: String(context.accessToken),
      lms_backend_url: String(context.backendUrl || ''),
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    });
    const viewerRole = ['student', 'teacher', 'admin'].includes(
      String(context.viewerRole || '').trim().toLowerCase(),
    )
      ? String(context.viewerRole).trim().toLowerCase()
      : 'student';
    localStorage.setItem('lms_viewer_role', viewerRole);
    localStorage.setItem('lms_user_role', viewerRole);

    sessionStorage.setItem(SESSION_ACTIVE, '1');
    sessionStorage.setItem(SESSION_DEADLINE, String(Date.now() + 60 * 60 * 1000));
    sessionStorage.removeItem(SESSION_EXPIRED);
    sessionStorage.setItem(APPLIED_KEY, data.handoffId);
    completed = true;
    window.__algoSecureLmsHandoffPending = false;

    event.source.postMessage({ type: ACK, handoffId: data.handoffId }, event.origin);
    cleanup();
    window.location.reload();
  }

  window.addEventListener('message', onMessage);
  sendReady();
  timer = window.setInterval(sendReady, 450);
  timeout = window.setTimeout(() => {
    if (completed) return;
    cleanup();
    window.__algoSecureLmsHandoffPending = false;
    // Resume the app's existing session-required flow if the handoff failed.
    window.location.reload();
  }, 12000);
}
