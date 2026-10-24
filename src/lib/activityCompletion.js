const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  localStorage.getItem('lms_backend_url') ||
  '',
).replace(/\/+$/, '');

const SESSION_KEYS = [
  'lms-session-id',
  'algolms_session_id',
];

const USER_KEYS = [
  'lms-user-id',
  'lms_student_email',
];

function createFallbackId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeIdentity(value) {
  return String(value || '').trim().toLowerCase();
}

export function getActivityUserId() {
  const params = new URLSearchParams(window.location.search);

  const queryUserId =
    params.get('userId') ||
    params.get('studentEmail') ||
    params.get('email');

  if (queryUserId) {
    USER_KEYS.forEach((key) => {
      localStorage.setItem(key, queryUserId);
    });

    return queryUserId;
  }

  for (const key of USER_KEYS) {
    const storedValue = localStorage.getItem(key);

    if (storedValue) {
      return storedValue;
    }
  }

  return null;
}

export function getActivitySessionId() {
  const params = new URLSearchParams(window.location.search);

  const querySessionId =
    params.get('sessionId') ||
    params.get('session');

  if (querySessionId) {
    SESSION_KEYS.forEach((key) => {
      localStorage.setItem(key, querySessionId);
    });

    return querySessionId;
  }

  /*
   * Progress must belong to the learner, not to a temporary visit.
   * Use the logged-in user/email as the stable session identity whenever
   * available. This also synchronizes the two legacy storage keys used by
   * different activity renderers.
   */
  const userId = normalizeIdentity(getActivityUserId());

  if (userId) {
    const stableSessionId = `user:${userId}`;

    SESSION_KEYS.forEach((key) => {
      localStorage.setItem(key, stableSessionId);
    });

    return stableSessionId;
  }

  for (const key of SESSION_KEYS) {
    const saved = localStorage.getItem(key);

    if (saved) {
      SESSION_KEYS.forEach((nextKey) => {
        localStorage.setItem(nextKey, saved);
      });

      return saved;
    }
  }

  const sessionId = `session-${createFallbackId()}`;

  SESSION_KEYS.forEach((key) => {
    localStorage.setItem(key, sessionId);
  });

  return sessionId;
}

export function getActivityRouteContext(fallback = {}) {
  const params = new URLSearchParams(window.location.search);

  return {
    courseId:
      params.get('course') ||
      fallback.courseId ||
      '',
    lessonId:
      params.get('lesson') ||
      fallback.lessonId ||
      '',
    pageId:
      params.get('page') ||
      fallback.pageId ||
      '',
  };
}

function getApiUrl(pathname) {
  return `${API_BASE_URL}${pathname}`;
}

async function readJsonResponse(response) {
  return response
    .json()
    .catch(() => ({}));
}

function createApiError(response, payload, fallbackMessage) {
  const error = new Error(
    payload?.message ||
    payload?.error ||
    `${fallbackMessage} with HTTP ${response.status}`,
  );

  error.status = response.status;
  error.payload = payload;

  return error;
}

export async function submitActivityCompletion({
  sessionId = getActivitySessionId(),
  userId = getActivityUserId(),
  courseId,
  lessonId,
  pageId,
  taskId,
  activityType,
  completionType = 'completed',
  isCorrect = null,
  score = 0,
  maxScore = 1,
  feedback = '',
  needsReview = false,
  metadata = {},
}) {
  const response = await fetch(
    getApiUrl('/api/activity-completions'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        userId,
        courseId,
        lessonId,
        pageId,
        taskId,
        activityType,
        completionType,
        isCorrect,
        score,
        maxScore,
        feedback,
        needsReview,
        metadata,
      }),
    },
  );

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw createApiError(
      response,
      payload,
      'Completion request failed',
    );
  }

  return payload;
}

export async function fetchPageProgress({
  sessionId = getActivitySessionId(),
  userId = getActivityUserId(),
  courseId,
  lessonId,
  pageId,
}) {
  const params = new URLSearchParams({
    sessionId,
    courseId,
    lessonId,
    pageId,
  });

  if (userId) {
    params.set('userId', userId);
  }

  const response = await fetch(
    getApiUrl(`/api/progress/page?${params.toString()}`),
  );

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw createApiError(
      response,
      payload,
      'Progress request failed',
    );
  }

  return Array.isArray(payload?.progress)
    ? payload.progress
    : [];
}

export async function fetchLessonProgress({
  sessionId = getActivitySessionId(),
  userId = getActivityUserId(),
  courseId,
  lessonId,
}) {
  const params = new URLSearchParams({
    sessionId,
    courseId,
    lessonId,
  });

  if (userId) {
    params.set('userId', userId);
  }

  const response = await fetch(
    getApiUrl(`/api/progress/lesson?${params.toString()}`),
  );

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw createApiError(
      response,
      payload,
      'Lesson progress request failed',
    );
  }

  return Array.isArray(payload?.progress)
    ? payload.progress
    : [];
}

export function isCompletedProgressRow(row) {
  if (!row) return false;

  if (row.is_completed === true) return true;
  if (row.status === 'completed') return true;
  if (row.status === 'correct') return true;

  const bestScore = Number(row.best_score || 0);
  const maxScore = Number(row.max_score || 0);

  return maxScore > 0 && bestScore >= maxScore;
}
