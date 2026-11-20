import React, { useEffect, useMemo, useState } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { submitQuizAttempt } from '../lib/quizGradingApi';
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
 *   answer: { [itemId]: categoryId },
 *   layout: 'categories' | 'match'   // match: categories = [{ id, image }], one card each
 * }
 *
 * Cards can be dragged, or tapped and then a category tapped (touch friendly).
 */

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
      image: category.image || '',
      alt: category.alt || category.title || '',
    })),
    // 'match': one card per category slot, categories shown as images (LMS quiz3 matching)
    layout: raw.layout === 'match' ? 'match' : 'categories',
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
  const [status, setStatus] = useState(''); // '', 'correct', 'wrong', 'missing', 'error'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [checked, setChecked] = useState({}); // itemId -> 'is-correct' | 'is-wrong'
  const [hasUserReset, setHasUserReset] = useState(false);

  useEffect(() => {
    setHasUserReset(false);
  }, [taskId]);

  useEffect(() => {
    if (hasUserReset) return;

    let isAlreadyDone = false;
    try {
      isAlreadyDone =
        completedTaskIds.includes(taskId);
    } catch {}

    if (isAlreadyDone) {
      setPlacement(emptyPlacement(config.items));
      setChecked({});
      setStatus('correct');
    } else {
      setPlacement(emptyPlacement(config.items));
      setChecked({});
      setStatus('');
    }
    setPickedId(null);
  }, [taskId, completedTaskIds, config, hasUserReset]);

  const isLocked = status === 'correct';
  const allPlaced = config.items.every((item) => placement[item.id] && placement[item.id] !== POOL);
  const hasPlaced = config.items.some((item) => placement[item.id] && placement[item.id] !== POOL);

  const isMatch = config.layout === 'match';

  const moveItem = (itemId, target) => {
    if (isLocked || isSubmitting || !itemId) return;
    setPlacement((prev) => {
      const next = { ...prev, [itemId]: target };
      if (isMatch && target !== POOL) {
        // a slot holds one card: send the previous card back to the list
        Object.keys(next).forEach((otherId) => {
          if (otherId !== itemId && next[otherId] === target) next[otherId] = POOL;
        });
      }
      return next;
    });
    setChecked((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    if (status && status !== 'correct') {
      setStatus('');
      setFeedbackMessage('');
    }
    setPickedId(null);
  };

  const handleCardClick = (itemId) => {
    if (isLocked || isSubmitting) return;
    setPickedId((prev) => (prev === itemId ? null : itemId));
  };

  const handleZoneClick = (target) => {
    if (pickedId) moveItem(pickedId, target);
  };

  const dropProps = (target) => ({
    onDragOver: (event) => {
      if (isLocked || isSubmitting) return;
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
    if (isSubmitting) return;
    setHasUserReset(true);
    setPlacement(emptyPlacement(config.items));
    setChecked({});
    setPickedId(null);
    setStatus('');
    setFeedbackMessage('');
  };

  const handleAnswer = async () => {
    if (!allPlaced || isLocked || isSubmitting) return;

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
      answer: { placements: { ...placement } },
    };

    setIsSubmitting(true);
    setFeedbackMessage('');
    try {
      const result = await submitQuizAttempt(getBackendUrl(), payload);
      if (result.isCorrect === true && result.status === 'correct') {
        setChecked(Object.fromEntries(config.items.map((item) => [item.id, 'is-correct'])));
        setStatus('correct');
        onTaskCompleted?.({
          taskId,
          completionType: 'correct',
          isCorrect: true,
          score: Number(result.score ?? 1),
          maxScore: Number(result.maxScore ?? 1),
        });
      } else if (result.isCorrect === false) {
        const itemResults = result.details?.itemResults || {};
        setChecked(Object.fromEntries(config.items.map((item) => [
          item.id, itemResults[item.id] === true ? 'is-correct' : 'is-wrong',
        ])));
        setStatus('wrong');
      } else {
        setChecked({});
        setStatus('missing');
        setFeedbackMessage('Answer not yet available in Supabase. Please contact your teacher.');
      }
    } catch (error) {
      setChecked({});
      setStatus('error');
      setFeedbackMessage(error.message || 'Cannot check your answer now. Please try again.');
    } finally {
      setIsSubmitting(false);
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
      draggable={!isLocked && !isSubmitting}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', item.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onClick={(event) => {
        event.stopPropagation();
        handleCardClick(item.id);
      }}
      disabled={isLocked || isSubmitting}
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

      <div className={`icq-layout cq-layout ${isMatch ? 'is-match' : ''}`}>
        <div className="icq-left">
          <article className="icq-card cq-side-card">
            <h2 className={`icq-title cq-title ${status === 'correct' ? 'is-correct' : ''}`}>{config.title}</h2>
            {config.description ? <p className="cq-description">{config.description}</p> : null}

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
              disabled={isSubmitting || (!hasPlaced && !status)}
              aria-label="Reset"
              title="Reset"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <polyline points="3 3 3 9 9 9" />
              </svg>
            </button>
            <button type="button" className="icq-btn icq-btn-answer" onClick={handleAnswer} disabled={!allPlaced || isLocked || isSubmitting}>
              {isSubmitting ? 'CHECKING...' : 'ANSWER'}
            </button>
          </div>
        </div>

        {isMatch ? (
          <div className="cq-match">
            <div className={`cq-match-pool ${dragOver === POOL ? 'is-over' : ''}`} {...dropProps(POOL)}>
              {poolItems.map(renderCard)}
            </div>

            <div className="cq-match-panel">
              {config.categories.map((category) => {
                const placed = config.items.filter((item) => placement[item.id] === category.id);
                return (
                  <div key={category.id} className="cq-match-row">
                    <div
                      className={`cq-match-slot ${dragOver === category.id ? 'is-over' : ''} ${pickedId ? 'is-target' : ''}`}
                      {...dropProps(category.id)}
                    >
                      {placed.map(renderCard)}
                    </div>
                    {category.image ? (
                      <img className="cq-match-image" src={category.image} alt={category.alt} />
                    ) : (
                      <div className="cq-match-label">{category.title}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {onNextTask && (
        <button type="button" className="icq-nav-arrow icq-nav-next" onClick={onNextTask} aria-label="Next Task">
          ›
        </button>
      )}
    </div>
  );
}
