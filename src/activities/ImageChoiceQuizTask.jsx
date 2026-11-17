import React, { useEffect, useMemo, useState } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { saveTaskCompletionToSupabase } from '../lib/supabaseProgress';
import './ImageChoiceQuizTask.css';

/*
 * LMS "Test yourself" quiz question (Algorithmics quiz layout):
 *   - left: white card with question image, bold title and description
 *   - below the card: yellow reset button + yellow ANSWER button
 *   - right: list of answer options (radio, or checkbox when `multiple`)
 *
 * Data comes from task.imageChoiceQuizTask in the page manifest:
 * {
 *   title, description, image, imageAlt,
 *   multiple: false,
 *   options: [{ id, text, image? }],
 *   correctOptionIds: ['b']
 * }
 */

const MAX_ATTEMPTS = 2;

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
    'session-image-choice'
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

function getConfig(task) {
  const raw =
    task?.imageChoiceQuizTask ||
    task?.renderer?.imageChoiceQuizTask ||
    task?.states?.[0]?.imageChoiceQuizTask ||
    {};

  const options = (raw.options || []).map((option, index) => ({
    id: String(option.id || `option-${index + 1}`),
    text: option.text || '',
    image: option.image || '',
    alt: option.alt || option.text || '',
  }));

  const correct = raw.correctOptionIds || raw.answerKey || [];

  return {
    title: raw.title || task?.title || '',
    description: raw.description || raw.question || '',
    image: raw.image || '',
    imageAlt: raw.imageAlt || raw.title || '',
    multiple: Boolean(raw.multiple),
    options,
    correctOptionIds: (Array.isArray(correct) ? correct : [correct]).map(String),
  };
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

export default function ImageChoiceQuizTask({
  task,
  onTaskCompleted,
  onNextTask,
  onPrevTask,
  completedTaskIds = [],
}) {
  const taskId = task?.id || task?.taskId || 'image-choice-quiz';
  const config = useMemo(() => getConfig(task), [task]);

  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState(''); // '', 'correct', 'wrong', 'failed'
  const [attemptCount, setAttemptCount] = useState(1);

  useEffect(() => {
    let isAlreadyDone = false;
    try {
      isAlreadyDone =
        completedTaskIds.includes(taskId) ||
        localStorage.getItem(`task_completed_${taskId}`) === 'true';
    } catch {}

    if (isAlreadyDone) {
      setSelected(config.correctOptionIds);
      setStatus('correct');
    } else {
      setSelected([]);
      setStatus('');
      setAttemptCount(1);
    }
  }, [taskId, completedTaskIds, config.correctOptionIds]);

  const isLocked = status === 'correct' || status === 'failed';
  const isImageGrid = config.options.some((option) => option.image);
  // LMS: 4 image answers -> 2 columns, 6 (or 9) image answers -> 3 columns
  const gridCols = isImageGrid && config.options.length >= 6 && config.options.length % 3 === 0 ? 3 : 2;

  const toggleOption = (optionId) => {
    if (isLocked) return;
    setSelected((prev) => {
      if (!config.multiple) return [optionId];
      return prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId];
    });
    if (status === 'wrong') setStatus('');
  };

  const handleReset = () => {
    if (status === 'correct') return;
    setSelected([]);
    setStatus('');
  };

  const handleAnswer = () => {
    if (!selected.length || isLocked) return;

    const isCorrect = sameSet(selected, config.correctOptionIds);

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
      activityType: 'image-choice-quiz-task',
      answer: { selectedOptionIds: selected },
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
        console.warn('[ImageChoiceQuizTask] backend attempt error:', err);
      });
    } catch (err) {
      console.warn('[ImageChoiceQuizTask] attempt send error:', err);
    }

    if (isCorrect) {
      setStatus('correct');
      try {
        playLmsSound(LMS_SOUND_TYPES.COMPLETE_ACTIVITY);
      } catch {}

      saveTaskCompletionToSupabase({
        courseId,
        lessonId,
        pageId,
        taskId,
        isCompleted: true,
      });

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

    if (attemptCount >= MAX_ATTEMPTS) {
      setStatus('failed');
    } else {
      setStatus('wrong');
      setAttemptCount((prev) => prev + 1);
    }
  };

  const getOptionState = (optionId) => {
    const isSelected = selected.includes(optionId);
    if (status === 'correct' && isSelected) return 'is-correct';
    if (status === 'failed' && config.correctOptionIds.includes(optionId)) return 'is-correct';
    if ((status === 'wrong' || status === 'failed') && isSelected) return 'is-wrong';
    if (isSelected) return 'is-selected';
    return '';
  };

  return (
    <div className="icq-stage">
      {onPrevTask && (
        <button
          type="button"
          className="icq-nav-arrow icq-nav-prev"
          onClick={onPrevTask}
          aria-label="Previous Task"
        >
          ‹
        </button>
      )}

      <div className={`icq-layout ${gridCols === 3 ? 'is-wide' : ''}`}>
        <div className="icq-left">
          <article className="icq-card">
            {config.image ? (
              <div className="icq-image-wrap">
                <img src={config.image} alt={config.imageAlt} className="icq-image" />
              </div>
            ) : null}

            <h2 className={`icq-title ${status === 'correct' ? 'is-correct' : ''}`}>
              {config.title}
            </h2>

            {config.description ? (
              <p className="icq-description">{config.description}</p>
            ) : null}

            {status ? (
              <div className={`icq-feedback icq-feedback--${status}`} role="status" aria-live="polite">
                {status === 'correct' && 'Correct!'}
                {status === 'wrong' && `Not quite right. Attempt: ${attemptCount}/${MAX_ATTEMPTS}`}
                {status === 'failed' && 'The correct answer is highlighted.'}
              </div>
            ) : null}
          </article>

          <div className="icq-actions">
            <button
              type="button"
              className="icq-btn icq-btn-reset"
              onClick={handleReset}
              disabled={status === 'correct' || selected.length === 0}
              aria-label="Reset"
              title="Reset"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <polyline points="3 3 3 9 9 9" />
              </svg>
            </button>

            <button
              type="button"
              className="icq-btn icq-btn-answer"
              onClick={handleAnswer}
              disabled={!selected.length || isLocked}
            >
              ANSWER
            </button>
          </div>
        </div>

        <div
          className={`icq-options ${isImageGrid ? 'is-image-grid' : ''}`}
          style={isImageGrid ? { '--icq-cols': gridCols } : undefined}
          role={config.multiple ? 'group' : 'radiogroup'}
        >
          {config.options.map((option) => {
            const optionState = getOptionState(option.id);
            const isSelected = selected.includes(option.id);

            return (
              <button
                type="button"
                key={option.id}
                className={`icq-option ${option.image ? 'has-image' : ''} ${optionState}`}
                onClick={() => toggleOption(option.id)}
                role={config.multiple ? 'checkbox' : 'radio'}
                aria-checked={isSelected}
                disabled={isLocked}
              >
                <span
                  className={`icq-option-control ${config.multiple ? 'is-checkbox' : 'is-radio'} ${isSelected ? 'is-on' : ''}`}
                  aria-hidden="true"
                />
                <span className="icq-option-body">
                  {option.image ? (
                    <img src={option.image} alt={option.alt} className="icq-option-image" />
                  ) : null}
                  {option.text ? <span className="icq-option-text">{option.text}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {onNextTask && (
        <button
          type="button"
          className="icq-nav-arrow icq-nav-next"
          onClick={onNextTask}
          aria-label="Next Task"
        >
          ›
        </button>
      )}
    </div>
  );
}
