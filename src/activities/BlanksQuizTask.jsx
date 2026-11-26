import { submitQuizAttempt } from '../lib/quizGradingApi';
import React, { useEffect, useMemo, useState } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { saveTaskCompletionToSupabase } from '../lib/supabaseProgress';
import './ImageChoiceQuizTask.css';
import './BlanksQuizTask.css';

/*
 * LMS "Test yourself" fill-in-the-blanks question (Algorithmics quiz3 blanks layout):
 *   - left: white card with picture, bold title, description; reset + ANSWER below
 *   - right: white panel with text that contains small input boxes
 *
 * Data comes from task.blanksQuizTask in the page manifest:
 * {
 *   title, description, image,
 *   text: 'The enemy turns at a random value\nfrom {{a}} to {{b}}.',
 *   answers: { a: ['60'], b: ['120'] }      // accepted values per blank
 * }
 */

const TOKEN = /\{\{\s*([\w-]+)\s*\}\}/g;

function getBackendUrl() {
  return String(
    sessionStorage.getItem('lms_backend_url') ||
      localStorage.getItem('lms_backend_url') ||
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      'https://algo-lms-backend.onrender.com',
  ).replace(/\/+$/, '');
}

function getSessionId() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('sessionId') || params.get('session');
  if (query) return query;
  const studentEmail =
    sessionStorage.getItem('lms_student_email') ||
    localStorage.getItem('lms_student_email');
  if (studentEmail) return `user:${studentEmail.trim().toLowerCase()}`;
  return (
    sessionStorage.getItem('lms-session-id') ||
    localStorage.getItem('lms-session-id') ||
    'session-blanks-quiz'
  );
}

function getUserId() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('userId') ||
    params.get('studentEmail') ||
    sessionStorage.getItem('lms_student_email') ||
    localStorage.getItem('lms_student_email') ||
    'student@algo.edu.vn'
  );
}

function normalizeValue(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getConfig(task) {
  const raw =
    task?.blanksQuizTask ||
    task?.renderer?.blanksQuizTask ||
    task?.states?.[0]?.blanksQuizTask ||
    {};

  const answers = Object.fromEntries(
    Object.entries(raw.answers || {}).map(([key, value]) => [
      key,
      (Array.isArray(value) ? value : [value]).map(normalizeValue),
    ]),
  );

  return {
    title: raw.title || task?.title || '',
    description: raw.description || '',
    image: raw.image || '',
    imageAlt: raw.imageAlt || raw.title || '',
    text: raw.text || '',
    gradeOnServer: raw.gradeOnServer === true,
    answers,
  };
}

// split text into lines of [string | {blank}] parts
function parseText(text) {
  return String(text)
    .split('\n')
    .map((line) => {
      const parts = [];
      let last = 0;
      line.replace(TOKEN, (match, key, offset) => {
        if (offset > last) parts.push(line.slice(last, offset));
        parts.push({ blank: key });
        last = offset + match.length;
        return match;
      });
      if (last < line.length) parts.push(line.slice(last));
      return parts;
    });
}

export default function BlanksQuizTask({
  task,
  onTaskCompleted,
  onNextTask,
  onPrevTask,
  completedTaskIds = [],
}) {
  const taskId = task?.id || task?.taskId || 'blanks-quiz';
  const config = useMemo(() => getConfig(task), [task]);
  const lines = useMemo(() => parseText(config.text), [config.text]);
  const blankKeys = useMemo(() => config.gradeOnServer ? [...new Set(lines.flatMap((line) => line.filter((part) => part.blank).map((part) => part.blank)))] : Object.keys(config.answers), [config, lines]);

  const [values, setValues] = useState({});
  const [checked, setChecked] = useState({}); // key -> 'is-correct' | 'is-wrong'
  const [status, setStatus] = useState(''); // '', 'correct', 'wrong'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasUserReset, setHasUserReset] = useState(false);

  useEffect(() => {
    setHasUserReset(false);
  }, [taskId]);

  useEffect(() => {
    if (hasUserReset) return;

    let isAlreadyDone = false;
    try {
      isAlreadyDone =
        completedTaskIds.includes(taskId) ||
        (!config.gradeOnServer && localStorage.getItem(`task_completed_${taskId}`) === 'true');
    } catch {}

    if (isAlreadyDone) {
      setValues(Object.fromEntries(blankKeys.map((key) => [key, config.answers[key]?.[0] ?? ''])));
      setChecked(Object.fromEntries(blankKeys.map((key) => [key, 'is-correct'])));
      setStatus('correct');
    } else {
      setValues({});
      setChecked({});
      setStatus('');
    }
  }, [taskId, completedTaskIds, config, blankKeys, hasUserReset]);

  const isLocked = status === 'correct';
  const allFilled = blankKeys.every((key) => String(values[key] ?? '').trim() !== '');
  const anyFilled = blankKeys.some((key) => String(values[key] ?? '').trim() !== '');

  const handleChange = (key, value) => {
    if (isLocked) return;
    setValues((prev) => ({ ...prev, [key]: value }));
    setChecked((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (status === 'wrong') setStatus('');
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(`task_completed_${taskId}`);
    } catch {}
    setErrorMessage('');
    setHasUserReset(true);
    setValues({});
    setChecked({});
    setStatus('');
  };

  const handleAnswer = async () => {
    if (!allFilled || isLocked || isSubmitting) return;

    if (config.gradeOnServer) {
      const params = new URLSearchParams(window.location.search);
      setIsSubmitting(true);
      setErrorMessage('');
      try {
        const result = await submitQuizAttempt(getBackendUrl(), {
          sessionId: getSessionId(),
          userId: getUserId(),
          courseId: params.get('course') || task?.courseId || 'VP2',
          lessonId: params.get('lesson') || task?.lessonId || '',
          pageId: params.get('page') || task?.pageId || '',
          taskId,
          activityType: 'fill-blank-task',
          answer: { values },
        });
        if (result.isCorrect === true && result.status === 'correct') {
          setChecked(Object.fromEntries(blankKeys.map((key) => [key, 'is-correct'])));
          setStatus('correct');
          onTaskCompleted?.({ taskId, completionType: 'correct', isCorrect: true,
            score: result.score, maxScore: result.maxScore });
        } else if (result.isCorrect === false) {
          setChecked(Object.fromEntries(Object.entries(result.details?.blankResults || {})
            .map(([key, correct]) => [key, correct ? 'is-correct' : 'is-wrong'])));
          setStatus('wrong');
        } else {
          setErrorMessage('Answer not yet available. Please contact your teacher.');
        }
      } catch (error) {
        setErrorMessage(error.message || 'Cannot check your answer now. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const nextChecked = {};
    let isCorrect = true;
    blankKeys.forEach((key) => {
      const ok = config.answers[key].includes(normalizeValue(values[key]));
      nextChecked[key] = ok ? 'is-correct' : 'is-wrong';
      if (!ok) isCorrect = false;
    });

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course') || task?.courseId || 'VP2';
    const lessonId = urlParams.get('lesson') || task?.lessonId || '';
    const pageId = urlParams.get('page') || task?.pageId || '';

    const payload = {
      sessionId: getSessionId(),
      userId: getUserId(),
      courseId,
      lessonId,
      pageId,
      taskId,
      activityType: 'blanks-quiz-task',
      answer: { values },
      isCorrect,
      score: isCorrect ? 1 : 0,
      maxScore: 1,
    };

    try {
      const accessToken =
        sessionStorage.getItem('lms_access_token') ||
        localStorage.getItem('lms_access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      fetch(`${getBackendUrl()}/api/activity-attempts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn('[BlanksQuizTask] backend attempt error:', err);
      });
    } catch (err) {
      console.warn('[BlanksQuizTask] attempt send error:', err);
    }

    setChecked(nextChecked);

    if (isCorrect) {
      setStatus('correct');

      saveTaskCompletionToSupabase({ courseId, lessonId, pageId, taskId, isCompleted: true });

      try {
        localStorage.setItem(`task_completed_${taskId}`, 'true');
      } catch {}

      onTaskCompleted?.({
        taskId,
        completionType: 'correct',
        isCorrect: true,
        score: 1,
        maxScore: 1,
      });
      return;
    }

    setStatus('wrong');
  };

  return (
    <div className="icq-stage">
      {onPrevTask && (
        <button type="button" className="icq-nav-arrow icq-nav-prev" onClick={onPrevTask} aria-label="Previous Task">
          ‹
        </button>
      )}

      <div className="icq-layout">
        <div className="icq-left">
          <article className="icq-card">
            {config.image ? (
              <div className="icq-image-wrap">
                <img src={config.image} alt={config.imageAlt} className="icq-image" />
              </div>
            ) : null}

            <h2 className={`icq-title ${status === 'correct' ? 'is-correct' : ''}`}>{config.title}</h2>
            {config.description ? <p className="icq-description bq-description">{config.description}</p> : null}

            {errorMessage && <p role="status">{errorMessage}</p>}
            {status ? (
              <div className={`icq-feedback icq-feedback--${status}`} role="status" aria-live="polite">
                {status === 'correct' && 'Correct!'}
                {status === 'wrong' && 'Not quite right.'}
              </div>
            ) : null}
          </article>

          <div className="icq-actions">
            <button
              type="button"
              className="icq-btn icq-btn-reset"
              onClick={handleReset}
              disabled={isSubmitting || (!anyFilled && !status && !errorMessage)}
              aria-label="Reset"
              title="Reset"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <polyline points="3 3 3 9 9 9" />
              </svg>
            </button>
            <button type="button" className="icq-btn icq-btn-answer" onClick={handleAnswer} disabled={!allFilled || isLocked || isSubmitting}>
              ANSWER
            </button>
          </div>
        </div>

        <div className="bq-panel">
          <div className="bq-text">
            {lines.map((parts, lineIndex) => (
              <div className="bq-line" key={lineIndex}>
                {parts.map((part, partIndex) =>
                  typeof part === 'string' ? (
                    <span key={partIndex}>{part}</span>
                  ) : (
                    <input
                      key={partIndex}
                      type="text"
                      inputMode="numeric"
                      className={`bq-input ${checked[part.blank] || ''}`}
                      value={values[part.blank] ?? ''}
                      size={Math.max(1, String(values[part.blank] ?? '').length)}
                      onChange={(event) => handleChange(part.blank, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleAnswer();
                      }}
                      disabled={isLocked || isSubmitting}
                      aria-label={`Blank ${part.blank}`}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {onNextTask && (
        <button type="button" className="icq-nav-arrow icq-nav-next" onClick={onNextTask} aria-label="Next Task">
          ›
        </button>
      )}
    </div>
  );
}
