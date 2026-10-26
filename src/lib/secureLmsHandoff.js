// Receive the student's authenticated LMS context from the Algorithmics portal.
// The token is transferred with postMessage, never placed in the destination URL.
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
    if (!context || !context.studentEmail || !context.courseId ||
        !context.supabaseUrl || !context.supabaseKey || !context.accessToken) return;

    const values = {
      lms_student_email: String(context.studentEmail).trim().toLowerCase(),
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
    localStorage.setItem('lms_viewer_role', 'student');
    localStorage.setItem('lms_user_role', 'student');

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
