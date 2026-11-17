import React, { useEffect, useMemo, useState } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { saveTaskCompletionToSupabase } from '../lib/supabaseProgress.js';
import './MarsBotQuizTask.css';
import './TestYourselfTask.css';

/*
 * "Test yourself" tasks that are not plain single/multiple choice.
 * Same look as MarsBotQuizTask (question card on the left, answer area on the right).
 *
 * mode "input"  -> task.testInput  = { prompt, description, image, segments: [ "text" | { id, answer, answers[] } | { br: true } ] }
 * mode "match"  -> task.testMatch  = { prompt, description, image, items: [{ id, image?, text? }],
 *                                      targets: [{ id, image?, text?, answer: itemId }] }
 */

function getBackendUrl() {
  return String(
    sessionStorage.getItem('lms_backend_url') ||
    localStorage.getItem('lms_backend_url') ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'https://algo-lms-backend.onrender.com'
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
    'session-test-yourself'
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

function normalizeAnswer(value) {
  return String(value ?? '').replace(/\s+/g, '').replace(',', '.').toLowerCase();
}

function storageKey(taskId) {
  return `test_yourself_completed_${taskId}`;
}

function isStoredDone(taskId, completedTaskIds) {
  try {
    return completedTaskIds.includes(taskId) || localStorage.getItem(storageKey(taskId)) === 'true';
  } catch {
    return completedTaskIds.includes(taskId);
  }
}

function sendAttempt({ taskId, activityType, answer, isCorrect, task }) {
  const urlParams = new URLSearchParams(window.location.search);
  const payload = {
    sessionId: getSessionId(),
    userId: getUserId(),
    courseId: urlParams.get('course') || task?.courseId || 'VP2',
    lessonId: urlParams.get('lesson') || task?.lessonId || '',
    pageId: urlParams.get('page') || task?.pageId || '',
    taskId,
    activityType,
    answer,
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
    }).catch((err) => console.warn('[TestYourselfTask] attempt error:', err));
  } catch (err) {
    console.warn('[TestYourselfTask] attempt send error:', err);
  }

  return payload;
}

function ResetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a156f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function getInputCorrectValues(segments) {
  const values = {};
  segments.forEach((segment) => {
    if (segment && typeof segment === 'object' && segment.id) {
      const answers = Array.isArray(segment.answers) ? segment.answers : [segment.answer];
      values[segment.id] = String(answers[0] ?? '');
    }
  });
  return values;
}

function getMatchCorrectPlacement(targets) {
  const placement = {};
  targets.forEach((target) => {
    placement[target.id] = target.answer;
  });
  return placement;
}

export default function TestYourselfTask(props) {
  const {
    task,
    mode: modeProp,
    completedTaskIds = [],
    onTaskCompleted,
    onNextTask,
    tasks = [],
    taskIndex = 0,
  } = props;

  const mode = modeProp || (task?.testMatch ? 'match' : 'input');
  const config = (mode === 'match' ? task?.testMatch : task?.testInput) || {};
  const taskId = String(task?.id || task?.taskId || '');
  const activityType = mode === 'match' ? 'test-match-task' : 'test-input-task';

  const segments = useMemo(() => (Array.isArray(config.segments) ? config.segments : []), [config]);
  const items = useMemo(() => (Array.isArray(config.items) ? config.items : []), [config]);
  const targets = useMemo(() => (Array.isArray(config.targets) ? config.targets : []), [config]);

  const [values, setValues] = useState({});
  const [placement, setPlacement] = useState({}); // targetId -> itemId
  const [pickedItemId, setPickedItemId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [status, setStatus] = useState(null); // 'correct' | 'incorrect' | null
  const [fieldStatus, setFieldStatus] = useState({});

  useEffect(() => {
    if (isStoredDone(taskId, completedTaskIds)) {
      setValues(getInputCorrectValues(segments));
      setPlacement(getMatchCorrectPlacement(targets));
      setStatus('correct');
    } else {
      setValues({});
      setPlacement({});
      setStatus(null);
    }
    setFieldStatus({});
    setPickedItemId(null);
  }, [taskId, completedTaskIds, segments, targets]);

  const clearFeedback = () => {
    if (status) setStatus(null);
    setFieldStatus({});
  };

  const handleReset = () => {
    setValues({});
    setPlacement({});
    setPickedItemId(null);
    setStatus(null);
    setFieldStatus({});
    try {
      localStorage.removeItem(storageKey(taskId));
    } catch {}
  };

  const inputIds = segments.filter((s) => s && typeof s === 'object' && s.id).map((s) => s.id);
  const hasAnswer =
    mode === 'match'
      ? Object.values(placement).some(Boolean)
      : inputIds.some((id) => String(values[id] || '').trim() !== '');

  const handleCheck = async () => {
    let isCorrect = true;
    const nextFieldStatus = {};
    let answer;

    if (mode === 'match') {
      targets.forEach((target) => {
        const ok = placement[target.id] === target.answer;
        nextFieldStatus[target.id] = ok ? 'is-correct' : 'is-wrong';
        if (!ok) isCorrect = false;
      });
      answer = { placement };
    } else {
      segments.forEach((segment) => {
        if (!segment || typeof segment !== 'object' || !segment.id) return;
        const accepted = (Array.isArray(segment.answers) ? segment.answers : [segment.answer]).map(normalizeAnswer);
        const ok = accepted.includes(normalizeAnswer(values[segment.id]));
        nextFieldStatus[segment.id] = ok ? 'is-correct' : 'is-wrong';
        if (!ok) isCorrect = false;
      });
      answer = { values };
    }

    setFieldStatus(nextFieldStatus);
    const payload = sendAttempt({ taskId, activityType, answer, isCorrect, task });

    if (!isCorrect) {
      setStatus('incorrect');
      return;
    }

    setStatus('correct');
    try {
      playLmsSound(LMS_SOUND_TYPES.COMPLETE_ACTIVITY);
    } catch {}

    saveTaskCompletionToSupabase({
      courseId: payload.courseId,
      lessonId: payload.lessonId,
      pageId: payload.pageId,
      taskId,
      activityType,
    });

    try {
      localStorage.setItem(storageKey(taskId), 'true');
    } catch {}

    onTaskCompleted?.({
      taskId,
      isCorrect: true,
      completed: true,
      score: 1,
      maxScore: 1,
      activityType,
      autoTransition: true,
    });
  };

  const handleAnswerOrNext = () => {
    if (status === 'correct') {
      onNextTask?.();
      return;
    }
    if (!hasAnswer) return;
    handleCheck();
  };

  /* ---------- match helpers ---------- */
  const usedItemIds = new Set(Object.values(placement).filter(Boolean));

  const placeItem = (targetId, itemId) => {
    if (!itemId || status === 'correct') return;
    setPlacement((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === itemId) delete next[key];
      });
      next[targetId] = itemId;
      return next;
    });
    setPickedItemId(null);
    clearFeedback();
  };

  const removeFromTarget = (targetId) => {
    if (status === 'correct') return;
    setPlacement((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    clearFeedback();
  };

  const renderItemContent = (item) =>
    item?.image ? (
      <img src={item.image} alt={item.alt || item.text || ''} draggable={false} />
    ) : (
      <span>{item?.text}</span>
    );

  const isLastTask = taskIndex >= tasks.length - 1;

  const feedbackText =
    status === 'correct'
      ? config.feedbackCorrect || 'Correct! Well done.'
      : status === 'incorrect'
      ? config.feedbackIncorrect || 'Not quite right. Check your answer and try again!'
      : '';

  return (
    <div className="marsbot-quiz-page">
      <div className={`marsbot-quiz-container ty-container ty-mode-${mode}`}>
        <div className="marsbot-question-card">
          {config.image ? (
            <div className={`marsbot-banner ${config.imageTall ? 'ty-banner-tall' : ''}`} style={{ background: config.imageBg || '#ffffff' }}>
              <img src={config.image} alt="" />
            </div>
          ) : null}

          <div className="marsbot-question-body">
            {config.prompt ? <h2 className="marsbot-prompt">{config.prompt}</h2> : null}
            {config.description ? <p className="ty-description">{config.description}</p> : null}
            {feedbackText ? <div className={`marsbot-feedback ${status}`}>{feedbackText}</div> : null}
          </div>

          <div className="marsbot-action-bar">
            <button type="button" className="marsbot-reset-btn" onClick={handleReset} title="Reset" aria-label="Reset">
              <ResetIcon />
            </button>
            <button
              type="button"
              className={`marsbot-answer-btn ${status === 'correct' ? 'next' : hasAnswer ? 'active' : 'disabled'}`}
              onClick={handleAnswerOrNext}
              disabled={!hasAnswer && status !== 'correct'}
            >
              {status === 'correct' ? (isLastTask ? 'Finish' : 'Next') : 'Answer'}
            </button>
          </div>
        </div>

        {mode === 'input' ? (
          <div className="ty-answer-card">
            <div className="ty-sentence">
              {segments.map((segment, index) => {
                if (typeof segment === 'string') {
                  return <span key={index} className="ty-text">{segment}</span>;
                }
                if (segment?.br) {
                  return <span key={index} className="ty-break" />;
                }
                if (segment?.id) {
                  return (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      className={`ty-input ${fieldStatus[segment.id] || ''}`}
                      value={values[segment.id] || ''}
                      disabled={status === 'correct'}
                      aria-label={segment.label || segment.id}
                      style={segment.width ? { width: segment.width } : undefined}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setValues((prev) => ({ ...prev, [segment.id]: nextValue }));
                        clearFeedback();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleAnswerOrNext();
                      }}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>
        ) : (
          <div className="ty-match-area">
            <div className="ty-pool">
              {items.map((item) => {
                const used = usedItemIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`ty-item ${used ? 'is-used' : ''} ${pickedItemId === item.id ? 'is-picked' : ''}`}
                    draggable={!used && status !== 'correct'}
                    role="button"
                    tabIndex={used ? -1 : 0}
                    aria-pressed={pickedItemId === item.id}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', item.id);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => {
                      if (used || status === 'correct') return;
                      setPickedItemId((prev) => (prev === item.id ? null : item.id));
                    }}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && !used) {
                        event.preventDefault();
                        setPickedItemId((prev) => (prev === item.id ? null : item.id));
                      }
                    }}
                  >
                    {!used ? renderItemContent(item) : null}
                  </div>
                );
              })}
            </div>

            <div className="ty-targets">
              {targets.map((target) => {
                const placedItem = items.find((item) => item.id === placement[target.id]);
                return (
                  <div key={target.id} className="ty-target-row">
                    <div
                      className={`ty-slot ${placedItem ? 'is-filled' : ''} ${dragOverTarget === target.id ? 'is-over' : ''} ${fieldStatus[target.id] || ''} ${pickedItemId ? 'is-ready' : ''}`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverTarget(target.id);
                      }}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragOverTarget(null);
                        placeItem(target.id, event.dataTransfer.getData('text/plain'));
                      }}
                      onClick={() => {
                        if (pickedItemId) placeItem(target.id, pickedItemId);
                        else if (placedItem) removeFromTarget(target.id);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={target.text || target.alt || target.id}
                    >
                      {placedItem ? (
                        <div
                          className="ty-item ty-item-placed"
                          draggable={status !== 'correct'}
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/plain', placedItem.id);
                          }}
                        >
                          {renderItemContent(placedItem)}
                        </div>
                      ) : null}
                    </div>
                    <div className={`ty-target-content ${target.image ? 'has-image' : 'has-text'}`}>
                      {target.image ? <img src={target.image} alt={target.alt || ''} /> : <span>{target.text}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
