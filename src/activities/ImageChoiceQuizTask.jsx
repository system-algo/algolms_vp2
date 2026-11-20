import React, { useEffect, useMemo, useState } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { submitQuizAttempt } from '../lib/quizGradingApi';
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


  return {
    title: raw.title || task?.title || '',
    description: raw.description || raw.question || '',
    image: raw.image || '',
    imageAlt: raw.imageAlt || raw.title || '',
    multiple: Boolean(raw.multiple),
    options,
  };
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
  const [status, setStatus] = useState(''); // '', 'correct', 'wrong', 'missing', 'error'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [hasUserReset, setHasUserReset] = useState(false);

  // A change of task starts from a clean local form. Do not prefill the
  // manifest's bundled correct answer or trust a shared localStorage flag.
  useEffect(() => {
    setHasUserReset(false);
    setSelected([]);
    setStatus('');
    setFeedbackMessage('');
  }, [taskId]);

  // Completion comes from the user-scoped course progress provided by the LMS.
  // Do not reset the student's submitted selection when that progress arrives.
  useEffect(() => {
    if (!hasUserReset && completedTaskIds.includes(taskId)) {
      setStatus('correct');
    }
  }, [taskId, completedTaskIds, hasUserReset]);

  const isLocked = status === 'correct';
  const isImageGrid = config.options.some((option) => option.image);
  // LMS: 2 image answers -> 1 column, 4 -> 2 columns, 6 (or 9) -> 3 columns
  let gridCols = 2;
  if (config.options.length <= 2) gridCols = 1;
  else if (config.options.length >= 6 && config.options.length % 3 === 0) gridCols = 3;

  const toggleOption = (optionId) => {
    if (isLocked || isSubmitting) return;
    setSelected((prev) => {
      if (!config.multiple) return [optionId];
      return prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId];
    });
    if (status && status !== 'correct') {
      setStatus('');
      setFeedbackMessage('');
    }
  };

  const handleReset = () => {
    if (isSubmitting) return;
    setHasUserReset(true);
    setSelected([]);
    setStatus('');
    setFeedbackMessage('');
  };

  const handleAnswer = async () => {
    if (!selected.length || isLocked || isSubmitting) return;

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
      answer: { selectedOptionIds: [...selected] },
    };

    setIsSubmitting(true);
    setFeedbackMessage('');
    try {
      const result = await submitQuizAttempt(getBackendUrl(), payload);

      if (result.isCorrect === true && result.status === 'correct') {
        setStatus('correct');
        onTaskCompleted?.({
          taskId,
          completionType: 'correct',
          isCorrect: true,
          score: Number(result.score ?? 1),
          maxScore: Number(result.maxScore ?? 1),
        });
      } else if (result.isCorrect === false) {
        setStatus('wrong');
      } else {
        setStatus('missing');
        setFeedbackMessage('Answer not yet available in Supabase. Please contact your teacher.');
      }
    } catch (error) {
      setStatus('error');
      setFeedbackMessage(error.message || 'Cannot check your answer now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOptionState = (optionId) => {
    const isSelected = selected.includes(optionId);
    if (status === 'correct' && isSelected) return 'is-correct';
    if (status === 'wrong' && isSelected) return 'is-wrong';
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
                {status === 'wrong' && 'Not quite right.'}
                {(status === 'missing' || status === 'error') && feedbackMessage}
              </div>
            ) : null}
          </article>

          <div className="icq-actions">
            <button
              type="button"
              className="icq-btn icq-btn-reset"
              onClick={handleReset}
              disabled={isSubmitting || (selected.length === 0 && !status)}
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
              disabled={!selected.length || isLocked || isSubmitting}
            >
              {isSubmitting ? 'CHECKING...' : 'ANSWER'}
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
                disabled={isLocked || isSubmitting}
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
