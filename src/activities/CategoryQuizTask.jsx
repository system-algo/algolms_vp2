import React, { useEffect, useMemo, useState } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { saveTaskCompletionToSupabase } from '../lib/supabaseProgress';
import './ImageChoiceQuizTask.css';
import './CategoryQuizTask.css';

/*
 * LMS "Test yourself" sorting question (Algorithmics quiz3 category layout):
 *   - left: white card with bold title + description, reset + ANSWER below
 *   - right top: white panel with the cards to sort (images or text)
 *   - right bottom: one white box per category, cards are dropped into them
 *
 * Data comes from task.categoryQuizTask in the page manifest:
 * {
 *   title, description,
 *   items: [{ id, image?, text?, alt? }],
 *   categories: [{ id, title }],
 *   answer: { [itemId]: categoryId }
 * }
 *
 * Cards can be dragged, or tapped and then a category tapped (touch friendly).
 */

const MAX_ATTEMPTS = 2;
const POOL = '__pool__';

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
    'session-category-quiz'
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
    task?.categoryQuizTask ||
    task?.renderer?.categoryQuizTask ||
    task?.states?.[0]?.categoryQuizTask ||
    {};

  return {
    title: raw.title || task?.title || '',
    description: raw.description || '',
    items: (raw.items || []).map((item, index) => ({
      id: String(item.id || `item-${index + 1}`),
      image: item.image || '',
      text: item.text || '',
      alt: item.alt || item.text || '',
    })),
    categories: (raw.categories || []).map((category, index) => ({
      id: String(category.id || `category-${index + 1}`),
      title: category.title || '',
    })),
    answer: raw.answer || {},
  };
}

function emptyPlacement(items) {
  return Object.fromEntries(items.map((item) => [item.id, POOL]));
}

export default function CategoryQuizTask({
  task,
  onTaskCompleted,
  onNextTask,
  onPrevTask,
  completedTaskIds = [],
}) {
  const taskId = task?.id || task?.taskId || 'category-quiz';
  const config = useMemo(() => getConfig(task), [task]);

  const [placement, setPlacement] = useState(() => emptyPlacement(config.items));
  const [pickedId, setPickedId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [status, setStatus] = useState(''); // '', 'correct', 'wrong', 'failed'
  const [checked, setChecked] = useState({}); // itemId -> 'is-correct' | 'is-wrong'
  const [attemptCount, setAttemptCount] = useState(1);

  useEffect(() => {
    let isAlreadyDone = false;
    try {
      isAlreadyDone =
        completedTaskIds.includes(taskId) ||
        localStorage.getItem(`task_completed_${taskId}`) === 'true';
    } catch {}

    if (isAlreadyDone) {
      setPlacement({ ...emptyPlacement(config.items), ...config.answer });
      setChecked(Object.fromEntries(config.items.map((item) => [item.id, 'is-correct'])));
      setStatus('correct');
    } else {
      setPlacement(emptyPlacement(config.items));
      setChecked({});
      setStatus('');
      setAttemptCount(1);
    }
    setPickedId(null);
  }, [taskId, completedTaskIds, config]);

  const isLocked = status === 'correct' || status === 'failed';
  const allPlaced = config.items.every((item) => placement[item.id] && placement[item.id] !== POOL);
  const hasPlaced = config.items.some((item) => placement[item.id] && placement[item.id] !== POOL);

  const moveItem = (itemId, target) => {
    if (isLocked || !itemId) return;
    setPlacement((prev) => ({ ...prev, [itemId]: target }));
    setChecked((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    if (status === 'wrong') setStatus('');
    setPickedId(null);
  };

  const handleCardClick = (itemId) => {
    if (isLocked) return;
    setPickedId((prev) => (prev === itemId ? null : itemId));
  };

  const handleZoneClick = (target) => {
    if (pickedId) moveItem(pickedId, target);
  };

  const dropProps = (target) => ({
    onDragOver: (event) => {
      if (isLocked) return;
      event.preventDefault();
      setDragOver(target);
    },
    onDragLeave: () => setDragOver((prev) => (prev === target ? null : prev)),
    onDrop: (event) => {
      event.preventDefault();
      setDragOver(null);
      moveItem(event.dataTransfer.getData('text/plain'), target);
    },
    onClick: () => handleZoneClick(target),
  });

  const handleReset = () => {
    if (status === 'correct') return;
    setPlacement(emptyPlacement(config.items));
    setChecked({});
    setPickedId(null);
    if (status !== 'failed') setStatus('');
  };

  const handleAnswer = () => {
    if (!allPlaced || isLocked) return;

    const nextChecked = {};
    let isCorrect = true;
    config.items.forEach((item) => {
      const ok = placement[item.id] === config.answer[item.id];
      nextChecked[item.id] = ok ? 'is-correct' : 'is-wrong';
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
      activityType: 'category-quiz-task',
      answer: { placements: placement },
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
        console.warn('[CategoryQuizTask] backend attempt error:', err);
      });
    } catch (err) {
      console.warn('[CategoryQuizTask] attempt send error:', err);
    }

    setChecked(nextChecked);

    if (isCorrect) {
      setStatus('correct');
      try {
        playLmsSound(LMS_SOUND_TYPES.COMPLETE_ACTIVITY);
      } catch {}

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

    if (attemptCount >= MAX_ATTEMPTS) {
      // show the right solution
      setPlacement({ ...emptyPlacement(config.items), ...config.answer });
      setChecked(Object.fromEntries(config.items.map((item) => [item.id, 'is-correct'])));
      setStatus('failed');
    } else {
      setStatus('wrong');
      setAttemptCount((prev) => prev + 1);
    }
  };

  const renderCard = (item) => (
    <button
      type="button"
      key={item.id}
      className={[
        'cq-card',
        item.image ? 'has-image' : 'is-text',
        pickedId === item.id ? 'is-picked' : '',
        checked[item.id] || '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable={!isLocked}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', item.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onClick={(event) => {
        event.stopPropagation();
        handleCardClick(item.id);
      }}
      disabled={isLocked && !checked[item.id]}
      aria-pressed={pickedId === item.id}
    >
      {item.image ? (
        <img src={item.image} alt={item.alt} className="cq-card-image" draggable={false} />
      ) : (
        <span className="cq-card-text">{item.text}</span>
      )}
    </button>
  );

  const poolItems = config.items.filter((item) => !placement[item.id] || placement[item.id] === POOL);

  return (
    <div className="icq-stage">
      {onPrevTask && (
        <button type="button" className="icq-nav-arrow icq-nav-prev" onClick={onPrevTask} aria-label="Previous Task">
          ‹
        </button>
      )}

      <div className="icq-layout cq-layout">
        <div className="icq-left">
          <article className="icq-card cq-side-card">
            <h2 className={`icq-title cq-title ${status === 'correct' ? 'is-correct' : ''}`}>{config.title}</h2>
            {config.description ? <p className="cq-description">{config.description}</p> : null}

            {status ? (
              <div className={`icq-feedback icq-feedback--${status}`} role="status" aria-live="polite">
                {status === 'correct' && 'Correct!'}
                {status === 'wrong' && `Not quite right. Attempt: ${attemptCount}/${MAX_ATTEMPTS}`}
                {status === 'failed' && 'Here is the correct solution.'}
              </div>
            ) : null}
          </article>

          <div className="icq-actions">
            <button
              type="button"
              className="icq-btn icq-btn-reset"
              onClick={handleReset}
              disabled={isLocked || !hasPlaced}
              aria-label="Reset"
              title="Reset"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <polyline points="3 3 3 9 9 9" />
              </svg>
            </button>
            <button type="button" className="icq-btn icq-btn-answer" onClick={handleAnswer} disabled={!allPlaced || isLocked}>
              ANSWER
            </button>
          </div>
        </div>

        <div className="cq-right">
          <div className={`cq-pool ${dragOver === POOL ? 'is-over' : ''}`} {...dropProps(POOL)}>
            {poolItems.map(renderCard)}
          </div>

          <div className="cq-categories" style={{ '--cq-cols': config.categories.length || 1 }}>
            {config.categories.map((category) => (
              <div
                key={category.id}
                className={`cq-category ${dragOver === category.id ? 'is-over' : ''} ${pickedId ? 'is-target' : ''}`}
                {...dropProps(category.id)}
              >
                <div className="cq-category-title">{category.title}</div>
                <div className="cq-category-items">
                  {config.items.filter((item) => placement[item.id] === category.id).map(renderCard)}
                </div>
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
