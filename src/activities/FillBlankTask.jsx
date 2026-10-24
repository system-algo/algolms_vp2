import { useEffect, useMemo, useState } from 'react';
import './FillBlankTask.css';

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  '',
).replace(/\/+$/, '');

const SESSION_STORAGE_KEY = 'algolms_session_id';

const LEGACY_FILL_BLANK_TASK_IDS = new Set([
  'task-16-16ex0v8',
]);

const DEFAULT_FILL_BLANK_DATA = {
  title: 'Part 1.',
  question: 'Fill in the blanks using syntactic rules',
  attempt: 'Attempt: 1/2',
  side: null,
  sample: null,
  segments: [
    '<a style = "border',
    { id: 'blank-1', answer: ':' },
    ' 5px solid pink',
    { id: 'blank-2', answer: ';' },
    ' color',
    { id: 'blank-3', answer: ':' },
    ' red" href',
    { id: 'blank-4', answer: '=' },
    ' "https://algoritmika.org">Highlighted link</a>',
  ],
};

function normalizeAnswer(value) {
  return String(value || '').trim();
}

function getTaskId(task) {
  return task?.id || task?.taskId || task?.key || task?.slug || '';
}

function getManualMapUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const course = params.get('course');
    const lesson = params.get('lesson');
    const page = params.get('page');

    if (!course || !lesson || !page) return '';

    return `/manual-activity-maps/${encodeURIComponent(course)}/${encodeURIComponent(
      lesson,
    )}/${encodeURIComponent(page)}.activity-map.json`;
  } catch {
    return '';
  }
}

function getRuntimeIds(pageInstance) {
  let courseId = '';
  let lessonId = '';
  let pageId = '';

  try {
    const params = new URLSearchParams(window.location.search);

    courseId = params.get('course') || '';
    lessonId = params.get('lesson') || '';
    pageId = params.get('page') || '';
  } catch {
    // Ignore and use pageInstance fallback below.
  }

  return {
    courseId: courseId || pageInstance?.courseId || pageInstance?.course?.id || pageInstance?.course || '',
    lessonId: lessonId || pageInstance?.lessonId || pageInstance?.lesson?.id || pageInstance?.lesson || '',
    pageId: pageId || pageInstance?.pageId || pageInstance?.page?.id || pageInstance?.id || '',
  };
}

function createFallbackId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSessionId() {
  try {
    const params = new URLSearchParams(window.location.search);
    const querySessionId = params.get('sessionId') || params.get('session');

    if (querySessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, querySessionId);
      return querySessionId;
    }

    const existing = localStorage.getItem(SESSION_STORAGE_KEY);

    if (existing) return existing;

    const next = `session-${createFallbackId()}`;
    localStorage.setItem(SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return `session-${createFallbackId()}`;
  }
}

function getUserId() {
  try {
    const params = new URLSearchParams(window.location.search);

    return (
      params.get('userId') ||
      localStorage.getItem('lms-user-id') ||
      localStorage.getItem('lms_student_email') ||
      'tim.tran@algo.edu.vn'
    );
  } catch {
    return 'tim.tran@algo.edu.vn';
  }
}

function getTaskFromManualMap(map, taskId) {
  if (!map || !taskId) return null;

  const directCandidates = [
    map?.[taskId],
    map?.tasks?.[taskId],
    map?.activities?.[taskId],
    map?.activityMap?.[taskId],
    map?.manualActivities?.[taskId],
  ];

  const direct = directCandidates.find(Boolean);

  if (direct) {
    return {
      id: taskId,
      ...direct,
    };
  }

  const pools = [
    map,
    map?.tasks,
    map?.activities,
    map?.activityMap,
    map?.manualActivities,
  ];

  for (const pool of pools) {
    if (!pool || typeof pool !== 'object' || Array.isArray(pool)) continue;

    const found = Object.values(pool).find((item) => {
      return getTaskId(item) === taskId;
    });

    if (found) {
      return {
        id: taskId,
        ...found,
      };
    }
  }

  return null;
}

function getManualFillBlankConfig(source) {
  if (!source) return null;

  const manual =
    source?.fillBlankTask ||
    source?.fillBlank ||
    source?.renderer?.fillBlankTask ||
    source?.renderer?.fillBlank ||
    source?.config?.fillBlankTask ||
    source?.config?.fillBlank ||
    source?.activity?.fillBlankTask ||
    source?.activity?.fillBlank ||
    null;

  if (manual?.segments?.length || manual?.parts?.length) {
    return manual;
  }

  if (source?.segments?.length || source?.parts?.length) {
    return source;
  }

  return null;
}

function normalizeSegments(manual) {
  if (Array.isArray(manual?.segments)) {
    return manual.segments.map((segment, index) => {
      if (typeof segment === 'string') return segment;

      if (!segment || typeof segment !== 'object') return '';

      if (segment.type === 'text') {
        return segment.text || segment.value || '';
      }

      return {
        id: segment.id || `blank-${index + 1}`,
        answer:
          segment.answer ??
          segment.correctAnswer ??
          segment.value ??
          segment.text ??
          '',
        placeholder: segment.placeholder || '',
      };
    });
  }

  if (Array.isArray(manual?.parts)) {
    return manual.parts.map((part, index) => {
      if (typeof part === 'string') return part;

      if (!part || typeof part !== 'object') return '';

      if (part.type === 'blank') {
        return {
          id: part.id || `blank-${index + 1}`,
          answer:
            part.answer ??
            part.correctAnswer ??
            part.value ??
            part.text ??
            '',
          placeholder: part.placeholder || '',
        };
      }

      return part.text || part.value || '';
    });
  }

  return [];
}

function getSideData(manual, manualTask, task) {
  const side =
    manual?.side ||
    manual?.sidebar ||
    manual?.sideCard ||
    manual?.leftPanel ||
    manualTask?.side ||
    manualTask?.sidebar ||
    manualTask?.sideCard ||
    manualTask?.leftPanel ||
    task?.side ||
    task?.sidebar ||
    task?.sideCard ||
    task?.leftPanel ||
    null;

  if (!side) return null;

  return {
    title: side.title || '',
    description: side.description || side.text || '',
    code: side.code || side.programCode || side.sourceCode || '',
  };
}

function getFillBlankData(task, manualTask) {
  const manual =
    getManualFillBlankConfig(task) ||
    getManualFillBlankConfig(manualTask);

  if (manual) {
    return {
      title: manual.title || manualTask?.title || task?.title || 'Part 1.',
      question:
        manual.question ||
        manual.prompt ||
        manualTask?.question ||
        manualTask?.prompt ||
        task?.question ||
        task?.prompt ||
        '',
      attempt:
        manual.attempt ||
        manualTask?.attemptText ||
        manualTask?.attempt ||
        task?.attemptText ||
        task?.attempt ||
        'Attempt: 1/2',
      side: getSideData(manual, manualTask, task),
      sample:
        manual.sample ||
        manual.preview ||
        manual.reference ||
        manualTask?.sample ||
        task?.sample ||
        null,
      segments: normalizeSegments(manual),
    };
  }

  const taskId = getTaskId(task);

  if (LEGACY_FILL_BLANK_TASK_IDS.has(taskId)) {
    return DEFAULT_FILL_BLANK_DATA;
  }

  return {
    title: task?.title || 'Part 1.',
    question:
      task?.question ||
      task?.prompt ||
      'Missing fillBlankTask data for this task.',
    attempt: task?.attemptText || task?.attempt || 'Attempt: 1/2',
    side: getSideData(null, manualTask, task),
    sample: null,
    segments: [],
  };
}

function FillBlankSample({ sample }) {
  if (!sample) return null;

  const imageSrc = sample.imageSrc || '';

  return (
    <div className="fill-blank-sample">
      {imageSrc && (
        <div className="fill-blank-preview-crop">
          <img
            className="fill-blank-preview-image"
            src={imageSrc}
            alt={sample.imageAlt || ''}
          />
        </div>
      )}
    </div>
  );
}

function FillBlankSide({ side }) {
  if (!side) return null;

  const hasTitle = Boolean(side.title);
  const hasDescription = Boolean(side.description);
  const hasCode = Boolean(side.code);

  if (!hasTitle && !hasDescription && !hasCode) return null;

  return (
    <aside className="fill-blank-left-card">
      {hasTitle && (
        <h1 className="fill-blank-left-title">
          {side.title}
        </h1>
      )}

      {hasDescription && (
        <p className="fill-blank-left-description">
          {side.description}
        </p>
      )}

      {hasCode && (
        <pre className="fill-blank-left-code">
          <code>{side.code}</code>
        </pre>
      )}
    </aside>
  );
}

function getFeedbackFromBackendResult(result) {
  if (!result) return '';

  const feedback = result.feedback || '';

  if (typeof result.score === 'number' && typeof result.maxScore === 'number') {
    return `${feedback} (${result.score}/${result.maxScore})`;
  }

  return feedback;
}

export default function FillBlankTask({
  task,
  pageInstance,
  onPrevTask,
  onNextTask,
  onTaskCompleted,
}) {
  const taskId = getTaskId(task);
  const [manualTask, setManualTask] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setManualTask(null);

    const mapUrl = getManualMapUrl();

    if (!taskId || !mapUrl) return undefined;

    fetch(mapUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Cannot load manual activity map: ${response.status}`);
        }

        return response.json();
      })
      .then((map) => {
        if (cancelled) return;

        const foundTask = getTaskFromManualMap(map, taskId);
        setManualTask(foundTask || null);
      })
      .catch((error) => {
        console.warn('[FillBlankTask] Manual map fallback failed:', {
          taskId,
          mapUrl,
          error,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const data = useMemo(() => {
    return getFillBlankData(task, manualTask);
  }, [task, manualTask]);

  const blanks = useMemo(() => {
    return data.segments.filter((segment) => {
      return segment && typeof segment === 'object';
    });
  }, [data.segments]);

  const taskIdentity = useMemo(() => {
    return `${taskId || 'fill-blank'}:${JSON.stringify(data.segments)}`;
  }, [taskId, data.segments]);

  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState('');
  const [feedback, setFeedback] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setAnswers({});
    setStatus('');
    setFeedback('');
    setChecking(false);
  }, [taskIdentity]);

  function updateAnswer(id, value) {
    setStatus('');
    setFeedback('');
    setAnswers((current) => ({
      ...current,
      [id]: value,
    }));
  }

  function resetAnswers() {
    if (checking) return;

    setStatus('');
    setFeedback('');
    setAnswers({});
  }

  function runLocalCheck() {
    const isCorrect = blanks.every((blank) => {
      return normalizeAnswer(answers[blank.id]) === normalizeAnswer(blank.answer);
    });

    setStatus(isCorrect ? 'correct' : 'wrong');
    setFeedback(isCorrect ? 'Correct' : 'Try again');

    if (isCorrect) {
      onTaskCompleted?.({
        completionType: 'correct',
        isCorrect: true,
        score: 1,
        maxScore: 1,
        feedback: 'Fill-in-the-blank answer is correct.',
        metadata: {
          values: answers,
        },
      });
    }
  }

  function getApiEndpoint(path) {
    return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  }

  async function submitAttemptToBackend() {
    const { courseId, lessonId, pageId } = getRuntimeIds(pageInstance);

    if (!courseId || !lessonId || !pageId || !taskId) {
      throw new Error('Missing courseId, lessonId, pageId, or taskId.');
    }

    const endpoint = getApiEndpoint('/api/activity-attempts');

    console.log('[FILL_BLANK] API_BASE_URL:', API_BASE_URL || '(empty, using relative /api)');
    console.log('[FILL_BLANK] Submit endpoint:', endpoint);
    console.log('[FILL_BLANK] Submit payload:', {
      sessionId: getSessionId(),
      userId: getUserId(),
      courseId,
      lessonId,
      pageId,
      taskId,
      activityType: 'fill-blank-task',
      answer: {
        values: answers,
      },
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: getSessionId(),
        userId: getUserId(),
        courseId,
        lessonId,
        pageId,
        taskId,
        activityType: 'fill-blank-task',
        answer: {
          values: answers,
        },
      }),
    });

    const text = await response.text();
    let payload = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!response.ok || payload?.ok === false) {
      throw new Error(
        payload?.error?.message ||
        payload?.message ||
        payload?.feedback ||
        text ||
        `API error ${response.status}`,
      );
    }

    return payload;
  }

  function applyBackendResult(payload) {
    const result = payload?.result || payload?.attempt?.result || payload || {};
    const nextFeedback = getFeedbackFromBackendResult(result);

    if (result.isCorrect === true || payload?.attempt?.isCorrect === true) {
      setStatus('correct');
      setFeedback(nextFeedback || 'Correct');
      return;
    }

    if (result.status === 'missing_answer_key') {
      setStatus('wrong');
      setFeedback(nextFeedback || 'Missing answer key');
      return;
    }

    if (result.status === 'incomplete') {
      setStatus('wrong');
      setFeedback(nextFeedback || result.feedback || 'Please fill in all blanks first.');
      return;
    }

    setStatus('wrong');
    setFeedback(nextFeedback || result.feedback || payload?.attempt?.feedback || 'Try again');
  }

  async function checkAnswer() {
    if (!data.segments.length || checking) return;

    setChecking(true);
    setStatus('');
    setFeedback('Checking...');

    try {
      const payload = await submitAttemptToBackend();

      if (!payload) {
        runLocalCheck();
        return;
      }

      applyBackendResult(payload);
    } catch (error) {
      console.error('[FILL_BLANK_SUBMIT_ERROR]', error);

      // Keep the task usable in local/dev mode even if backend is unavailable.
      runLocalCheck();
    } finally {
      setChecking(false);
    }
  }

  const hasSample = Boolean(data.sample);
  const hasSide = Boolean(
    data.side?.title ||
    data.side?.description ||
    data.side?.code,
  );

  return (
    <div className={`fill-blank-stage ${hasSample ? 'fill-blank-stage-with-sample' : ''}`}>
      <button className="fill-blank-side fill-blank-side-left" onClick={onPrevTask}>
        ‹
      </button>

      <div className={`fill-blank-layout ${hasSide ? 'fill-blank-layout-with-side' : ''}`}>
        {hasSide && (
          <FillBlankSide side={data.side} />
        )}

        <section className={`fill-blank-card ${hasSample ? 'fill-blank-card-with-sample' : ''}`}>
          <div className="fill-blank-header">
            <div className="fill-blank-title">
              <span className="fill-blank-info">i</span>
              <span>{data.title}</span>
            </div>

            <div className="fill-blank-attempt">{data.attempt}</div>
          </div>

          {data.question && (
            <h2 className="fill-blank-question">{data.question}</h2>
          )}

          <FillBlankSample sample={data.sample} />

          {data.segments.length > 0 ? (
            <div className="fill-blank-code-line">
              {data.segments.map((segment, index) => {
                if (typeof segment === 'string') {
                  return (
                    <span className="fill-blank-text" key={`text-${index}`}>
                      {segment}
                    </span>
                  );
                }

                return (
                  <input
                    key={segment.id || `blank-${index}`}
                    className="fill-blank-input"
                    value={answers[segment.id] || ''}
                    placeholder={segment.placeholder || ''}
                    onChange={(event) => updateAnswer(segment.id, event.target.value)}
                    aria-label={`blank ${index + 1}`}
                    disabled={checking}
                  />
                );
              })}
            </div>
          ) : (
            <div className="fill-blank-missing">
              This task is selected as fill-blank-task, but it does not have
              fillBlankTask.segments yet.
            </div>
          )}

          {feedback && !status && (
            <div className="fill-blank-status">
              {feedback}
            </div>
          )}

          {status === 'correct' && (
            <div className="fill-blank-status fill-blank-status-correct">
              {feedback || 'Correct'}
            </div>
          )}

          {status === 'wrong' && (
            <div className="fill-blank-status fill-blank-status-wrong">
              {feedback || 'Try again'}
            </div>
          )}

          {data.segments.length > 0 && (
            <div className="fill-blank-actions">
              <button
                className="fill-blank-reset"
                onClick={resetAnswers}
                disabled={checking}
              >
                Reset
              </button>

              <button
                className="fill-blank-check"
                onClick={checkAnswer}
                disabled={checking}
              >
                {checking ? 'Checking...' : 'Check'}
              </button>
            </div>
          )}
        </section>
      </div>

      <button className="fill-blank-side fill-blank-side-right" onClick={onNextTask}>
        ›
      </button>
    </div>
  );
}