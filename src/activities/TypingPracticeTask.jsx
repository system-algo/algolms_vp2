import { useEffect, useMemo, useRef, useState } from 'react';
import LmsActivityFrame from '../components/LmsActivityFrame.jsx';
import './TypingPracticeTask.css';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function getRouteContext() {
  const params = new URLSearchParams(window.location.search);

  return {
    courseId: params.get('course') || '',
    lessonId: params.get('lesson') || '',
    pageId: params.get('page') || '',
  };
}

function createFallbackId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSessionId() {
  const params = new URLSearchParams(window.location.search);
  const querySessionId = params.get('sessionId') || params.get('session');

  if (querySessionId) {
    localStorage.setItem('lms-session-id', querySessionId);
    return querySessionId;
  }

  let sessionId = localStorage.getItem('lms-session-id');

  if (!sessionId) {
    sessionId = `session-${createFallbackId()}`;
    localStorage.setItem('lms-session-id', sessionId);
  }

  return sessionId;
}

function getUserId() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get('userId') ||
    localStorage.getItem('lms-user-id') ||
    localStorage.getItem('lms_student_email') ||
    'tim.tran@algo.edu.vn'
  );
}

function getTaskId(task) {
  return String(
    task?.id ||
    task?.taskId ||
    task?.taskKey ||
    task?.key ||
    task?.manualTaskId ||
    task?.mapTaskId ||
    task?.sourceTaskId ||
    task?.rawTaskId ||
    '',
  ).trim();
}

function getStateId(state) {
  return String(state?.id || state?.stateId || '').trim();
}

function collectAllText(value, output = [], depth = 0) {
  if (depth > 12 || value == null) return output;

  if (typeof value === 'string') {
    const text = value.trim();
    if (text) output.push(text);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectAllText(item, output, depth + 1));
    return output;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectAllText(item, output, depth + 1));
  }

  return output;
}

function isNoiseLine(line) {
  const text = normalizeText(line).toLowerCase();

  if (!text) return true;
  if (text === 'next') return true;
  if (text === 'reset') return true;
  if (text === 'check') return true;
  if (text === 'run') return true;
  if (text === "let's go!") return true;
  if (text === "let's go") return true;
  if (text.includes('screenshots/')) return true;
  if (text.includes('assets/')) return true;
  if (text.includes('queryselector')) return true;
  if (text.includes('nth-of-type')) return true;
  if (text.includes('dom path')) return true;
  if (text.includes('css selector')) return true;

  return false;
}

function inferLinesFromSource(task, state) {
  const source = state || task;
  const seen = new Set();

  return collectAllText(source)
    .flatMap((text) => String(text).replace(/\r/g, '\n').split('\n'))
    .map(normalizeText)
    .filter((line) => !isNoiseLine(line))
    .filter((line) => {
      const key = line.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

function getTypingConfig(pageInstance, task, state) {
  const taskId = getTaskId(task);
  const stateId = getStateId(state);

  const taskRenderer = taskId ? pageInstance?.taskRenderers?.[taskId] : null;
  const stateRenderer = taskRenderer && stateId ? taskRenderer.states?.[stateId] : null;

  return (
    stateRenderer?.typingPractice ||
    taskRenderer?.typingPractice ||
    state?.typingPractice ||
    task?.typingPractice ||
    null
  );
}

function buildData(config, task, state, screenMode = '') {
  const fallbackLines = inferLinesFromSource(task, state);

  const mode = String(screenMode || config?.mode || '').trim().toLowerCase();

  const inferredIntro =
    fallbackLines.some((line) => line.toLowerCase().includes('type the text')) ||
    fallbackLines.some((line) => line.toLowerCase().includes('typing speed'));

  if (mode === 'intro' || (!mode && inferredIntro)) {
    return {
      mode: 'intro',
      title: normalizeText(
        config?.title ||
          fallbackLines.find((line) => line.toLowerCase().includes('type the text')) ||
          'Type the text – the faster, the better',
      ),
      description: normalizeText(
        config?.description ||
          fallbackLines.find((line) => line.toLowerCase().includes('typing speed')) ||
          'For a programmer, typing speed is very important.',
      ),
      buttonText: normalizeText(config?.buttonText || "LET'S GO!"),
    };
  }

  const configLines = Array.isArray(config?.lines)
    ? config.lines.map(normalizeText).filter(Boolean)
    : [];

  const lines = configLines.length > 0
    ? configLines
    : fallbackLines.filter((line) => {
        const lower = line.toLowerCase();

        if (lower.includes('type the text')) return false;
        if (lower.includes('typing speed')) return false;

        return true;
      });

  return {
    mode: 'typing',
    title: normalizeText(config?.title || ''),
    lines,
    showLineNumbers: config?.showLineNumbers !== false,
    autoNextOnComplete: Boolean(config?.autoNextOnComplete),
  };
}

function getStorageKey(task, state) {
  return `typing-practice:${getTaskId(task)}:${getStateId(state) || 'default'}`;
}

function readSavedState(task, state) {
  try {
    const raw = localStorage.getItem(getStorageKey(task, state));

    if (!raw) return null;

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(task, state, data) {
  try {
    localStorage.setItem(getStorageKey(task, state), JSON.stringify(data));
  } catch {
    // Ignore storage errors.
  }
}

function splitTarget(lines) {
  return lines.join('\n');
}

function getLineStartIndexes(lines) {
  const starts = [];
  let cursor = 0;

  lines.forEach((line, index) => {
    starts.push(cursor);
    cursor += line.length;

    if (index < lines.length - 1) {
      cursor += 1;
    }
  });

  return starts;
}

function getFeedbackFromResult(result) {
  if (!result) return '';

  const feedback = result.feedback || '';

  if (typeof result.score === 'number' && typeof result.maxScore === 'number') {
    return `${feedback} (${result.score}/${result.maxScore})`;
  }

  return feedback;
}

async function submitTypingToBackend(payload) {
  const endpoint = `${API_BASE_URL}/api/activity-attempts`;

  console.log('[TypingPractice] Submit endpoint:', endpoint);
  console.log('[TypingPractice] Submit payload:', payload);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  console.log('[TypingPractice] Response status:', response.status);
  console.log('[TypingPractice] Response text:', text);

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.feedback ||
      data?.error?.message ||
      text ||
      `API error ${response.status}`,
    );
  }

  return data;
}

export default function TypingPracticeTask(props) {
  const {
    task,
    state,
    pageInstance,
    onNextTask,
    onPrevTask,
  } = props;

  const [typed, setTyped] = useState('');
  const [wrongText, setWrongText] = useState('');
  const [startedAt, setStartedAt] = useState(null);
  const [finishedAt, setFinishedAt] = useState(null);
  const [screenMode, setScreenMode] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');
  const [backendResult, setBackendResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedText, setSubmittedText] = useState('');

  const focusRef = useRef(null);
  const wrongTimerRef = useRef(null);
  const autoNextTimerRef = useRef(null);

  const taskId = getTaskId(task);

  const storageKey = useMemo(
    () => getStorageKey(task, state),
    [task, state],
  );

  const config = useMemo(
    () => getTypingConfig(pageInstance, task, state),
    [pageInstance, task, state],
  );

  const data = useMemo(
    () => buildData(config, task, state, screenMode),
    [config, task, state, screenMode],
  );

  const targetText = useMemo(() => {
    if (data.mode !== 'typing') return '';
    return splitTarget(data.lines);
  }, [data]);

  const lineStarts = useMemo(() => {
    if (data.mode !== 'typing') return [];
    return getLineStartIndexes(data.lines);
  }, [data]);

  const complete = data.mode === 'typing' && targetText.length > 0 && typed.length >= targetText.length;

  useEffect(() => {
    const initialMode = String(config?.mode || '').trim().toLowerCase();

    if (initialMode === 'intro') {
      setScreenMode('intro');
    } else {
      setScreenMode('typing');
    }
  }, [storageKey, config]);

  useEffect(() => {
    const savedState = readSavedState(task, state);

    setTyped(savedState?.typed || '');
    setWrongText('');
    setStartedAt(savedState?.startedAt || null);
    setFinishedAt(savedState?.finishedAt || null);
    setSubmitStatus(savedState?.submitStatus || '');
    setBackendResult(savedState?.backendResult || null);
    setSubmittedText(savedState?.submittedText || '');
  }, [storageKey, task, state]);

  useEffect(() => {
    if (data.mode !== 'typing') return;

    saveState(task, state, {
      typed,
      startedAt,
      finishedAt,
      submitStatus,
      backendResult,
      submittedText,
    });
  }, [
    data.mode,
    task,
    state,
    typed,
    startedAt,
    finishedAt,
    submitStatus,
    backendResult,
    submittedText,
  ]);

  useEffect(() => {
    if (data.mode !== 'typing') return;

    const timer = window.setTimeout(() => {
      focusRef.current?.focus();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [data.mode, storageKey]);

  useEffect(() => {
    if (!complete || finishedAt) return;

    setFinishedAt(Date.now());
  }, [complete, finishedAt]);

  useEffect(() => {
    async function submitCompletedTyping() {
      if (!complete) return;
      if (!targetText) return;
      if (!taskId) return;
      if (isSubmitting) return;
      if (submittedText === typed) return;

      const { courseId, lessonId, pageId } = getRouteContext();

      const payload = {
        sessionId: getSessionId(),
        userId: getUserId(),
        courseId,
        lessonId,
        pageId,
        taskId,
        activityType: 'typing-practice',
        answer: {
          typedText: typed,
        },
      };

      setIsSubmitting(true);
      setSubmitStatus('Saving...');

      try {
        const responseData = await submitTypingToBackend(payload);
        const gradingResult = responseData?.result || responseData;
        const nextStatus = getFeedbackFromResult(gradingResult);

        setBackendResult(gradingResult);
        setSubmitStatus(nextStatus || 'Saved.');
        setSubmittedText(typed);
      } catch (error) {
        console.error('[TypingPracticeTask] Backend grading failed:', error);
        setSubmitStatus(error?.message || 'Cannot connect to backend grading.');
        setBackendResult({
          isCorrect: false,
        });
      } finally {
        setIsSubmitting(false);
      }
    }

    submitCompletedTyping();
  }, [complete, typed, targetText, taskId, isSubmitting, submittedText]);

  useEffect(() => {
    if (!complete || !data.autoNextOnComplete || !onNextTask) return;

    autoNextTimerRef.current = window.setTimeout(() => {
      onNextTask();
    }, 700);

    return () => {
      if (autoNextTimerRef.current) {
        window.clearTimeout(autoNextTimerRef.current);
      }
    };
  }, [complete, data.autoNextOnComplete, onNextTask]);

  function handleStart() {
    setStartedAt((current) => current || Date.now());
    setScreenMode('typing');

    window.setTimeout(() => {
      focusRef.current?.focus();
    }, 80);
  }

  function showWrongChar(char) {
    setWrongText((current) => `${current}${char}`);

    if (wrongTimerRef.current) {
      window.clearTimeout(wrongTimerRef.current);
    }

    wrongTimerRef.current = window.setTimeout(() => {
      setWrongText('');
    }, 420);
  }

  function handleKeyDown(event) {
    if (data.mode !== 'typing') return;

    const key = event.key;

    if (key === 'Tab') {
      event.preventDefault();
      return;
    }

    if (
      key === 'Shift' ||
      key === 'Control' ||
      key === 'Alt' ||
      key === 'Meta' ||
      key === 'CapsLock'
    ) {
      return;
    }

    if (key === 'Backspace') {
      event.preventDefault();

      if (complete) return;

      setTyped((current) => current.slice(0, -1));
      setWrongText('');
      setSubmitStatus('');
      setBackendResult(null);
      setSubmittedText('');
      return;
    }

    if (key === 'Enter') {
      event.preventDefault();

      const expected = targetText[typed.length];

      if (expected === '\n') {
        if (!startedAt) setStartedAt(Date.now());

        setTyped((current) => `${current}\n`);
        setWrongText('');
        setSubmitStatus('');
        setBackendResult(null);
        setSubmittedText('');
      } else {
        showWrongChar('↵');
      }

      return;
    }

    if (key.length !== 1) return;

    event.preventDefault();

    if (complete) return;

    const expected = targetText[typed.length];

    if (!startedAt) setStartedAt(Date.now());

    if (key === expected) {
      setTyped((current) => `${current}${key}`);
      setWrongText('');
      setSubmitStatus('');
      setBackendResult(null);
      setSubmittedText('');
      return;
    }

    showWrongChar(key);
  }

  function resetTyping() {
    setTyped('');
    setWrongText('');
    setStartedAt(null);
    setFinishedAt(null);
    setSubmitStatus('');
    setBackendResult(null);
    setSubmittedText('');
    focusRef.current?.focus();
  }

  function renderLine(line, lineIndex) {
    const start = lineStarts[lineIndex];

    return (
      <div className="typing-practice-line" key={`${lineIndex}-${line}`}>
        {data.showLineNumbers ? (
          <span className="typing-practice-line-number">
            {lineIndex + 1}
          </span>
        ) : null}

        <span className="typing-practice-line-content">
          {line.split('').map((char, charIndex) => {
            const absoluteIndex = start + charIndex;
            const isDone = absoluteIndex < typed.length;
            const isCurrent = absoluteIndex === typed.length && !complete;

            let className = 'typing-practice-char';

            if (isDone) className += ' is-done';
            if (isCurrent) className += ' is-current';

            return (
              <span className={className} key={`${lineIndex}-${charIndex}`}>
                {isCurrent && wrongText ? (
                  <span className="typing-practice-wrong">
                    {wrongText}
                  </span>
                ) : null}
                {char === ' ' ? '\u00a0' : char}
              </span>
            );
          })}

          {line.length === 0 && typed.length === start && wrongText ? (
            <span className="typing-practice-wrong">{wrongText}</span>
          ) : null}
        </span>
      </div>
    );
  }

  if (data.mode === 'intro') {
    return (
      <LmsActivityFrame
        title={data.title}
        onPrevTask={onPrevTask}
        onNextTask={onNextTask}
      >
        <article className="typing-practice typing-practice-intro-screen">
          <section className="typing-practice-intro-card">
            <h1>{data.title}</h1>
            <p>{data.description}</p>

            <button
              type="button"
              className="typing-practice-start-button"
              onClick={handleStart}
            >
              {data.buttonText}
            </button>
          </section>
        </article>
      </LmsActivityFrame>
    );
  }

  return (
    <LmsActivityFrame
      title={data.title || 'Typing practice'}
      onPrevTask={onPrevTask}
      onNextTask={onNextTask}
    >
      <article
        className="typing-practice typing-practice-screen"
        tabIndex={0}
        ref={focusRef}
        onKeyDown={handleKeyDown}
        onClick={() => focusRef.current?.focus()}
      >
        <section className="typing-practice-editor">
          {data.lines.length > 0 ? (
            data.lines.map(renderLine)
          ) : (
            <div className="typing-practice-empty">
              No typing text configured for this task.
            </div>
          )}
        </section>

        <footer className="typing-practice-footer">
          <div className="typing-practice-progress">
            {typed.length}
            /
            {targetText.length}
          </div>

          {complete ? (
            <div className="typing-practice-complete">
              Completed
            </div>
          ) : (
            <div className="typing-practice-hint">
              Type exactly as shown. Wrong keys will flash.
            </div>
          )}

          <button
            type="button"
            className="typing-practice-reset"
            onClick={resetTyping}
          >
            Reset
          </button>
        </footer>

        {submitStatus ? (
          <div
            style={{
              marginTop: 18,
              padding: '12px 16px',
              borderRadius: 12,
              background: '#ffffff',
              color: backendResult?.isCorrect === false ? '#b42318' : '#027a48',
              fontWeight: 700,
              fontSize: 16,
              border: backendResult?.isCorrect === false
                ? '1px solid #ef4444'
                : '1px solid #22c55e',
            }}
          >
            {submitStatus}
          </div>
        ) : null}
      </article>
    </LmsActivityFrame>
  );
}