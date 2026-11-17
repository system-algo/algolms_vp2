import React, { useState, useEffect } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { saveTaskCompletionToSupabase } from '../lib/supabaseProgress';
import './CoordinateInputTask.css';

const ITEMS = [
  {
    id: 'emerald',
    name: 'Emerald',
    icon: '/courses/VP2/M2-Control-Structures/pages/VP2_M2L1_4/images/emerald.png',
    correctX: 5,
    correctY: -5,
  },
  {
    id: 'chest',
    name: 'Treasure Chest',
    icon: '/courses/VP2/M2-Control-Structures/pages/VP2_M2L1_4/images/chest.png',
    correctX: 8,
    correctY: 6,
  },
  {
    id: 'crystal',
    name: 'Blue Crystal',
    icon: '/courses/VP2/M2-Control-Structures/pages/VP2_M2L1_4/images/crystal.png',
    correctX: -4,
    correctY: 4,
  },
];

export default function CoordinateInputTask({
  task,
  onTaskCompleted,
  onNextTask,
  onPrevTask,
  completedTaskIds = [],
}) {
  const taskId = task?.id || task?.taskId || 'VP2_M2L1_4_2';

  const [values, setValues] = useState({
    emerald: { x: '', y: '' },
    chest: { x: '', y: '' },
    crystal: { x: '', y: '' },
  });

  const [fieldStatuses, setFieldStatuses] = useState({});
  const [status, setStatus] = useState('');
  const [attemptCount, setAttemptCount] = useState(1);

  // Restore if previously completed
  useEffect(() => {
    let isAlreadyDone = false;
    try {
      if (
        completedTaskIds.includes(taskId) ||
        localStorage.getItem(`task_completed_${taskId}`) === 'true'
      ) {
        isAlreadyDone = true;
      }
    } catch {}

    if (isAlreadyDone) {
      setValues({
        emerald: { x: '5', y: '-5' },
        chest: { x: '8', y: '6' },
        crystal: { x: '-4', y: '4' },
      });
      setStatus('correct');
    }
  }, [taskId, completedTaskIds]);

  const handleChange = (itemId, axis, val) => {
    setValues((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [axis]: val,
      },
    }));
    // clear error for this field
    setFieldStatuses((prev) => ({
      ...prev,
      [`${itemId}_${axis}`]: '',
    }));
  };

  const handleReset = () => {
    setValues({
      emerald: { x: '', y: '' },
      chest: { x: '', y: '' },
      crystal: { x: '', y: '' },
    });
    setFieldStatuses({});
    setStatus('');
  };

  const handleCheck = () => {
    const nextStatuses = {};
    let allCorrect = true;

    ITEMS.forEach((item) => {
      const xVal = parseInt(String(values[item.id]?.x || '').trim(), 10);
      const yVal = parseInt(String(values[item.id]?.y || '').trim(), 10);

      const isXCorrect = xVal === item.correctX;
      const isYCorrect = yVal === item.correctY;

      nextStatuses[`${item.id}_x`] = isXCorrect ? 'is-correct' : 'is-wrong';
      nextStatuses[`${item.id}_y`] = isYCorrect ? 'is-correct' : 'is-wrong';

      if (!isXCorrect || !isYCorrect) {
        allCorrect = false;
      }
    });

    setFieldStatuses(nextStatuses);

    if (allCorrect) {
      setStatus('correct');
      try {
        playLmsSound(LMS_SOUND_TYPES.COMPLETE_ACTIVITY);
      } catch {}

      saveTaskCompletionToSupabase({
        courseId: 'VP2',
        lessonId: 'M2-Control-Structures',
        pageId: 'VP2_M2L1_4',
        taskId,
        isCompleted: true,
      });

      try {
        localStorage.setItem(`task_completed_${taskId}`, 'true');
      } catch {}

      onTaskCompleted?.({
        completionType: 'correct',
        isCorrect: true,
        score: 1,
        maxScore: 1,
      });
    } else {
      setStatus('wrong');
      setAttemptCount((prev) => Math.min(2, prev + 1));
    }
  };

  return (
    <div className="coord-input-stage">
      {onPrevTask && (
        <button
          className="coord-nav-arrow coord-nav-prev"
          onClick={onPrevTask}
          aria-label="Previous Task"
        >
          ‹
        </button>
      )}

      <div className="coord-card-container">
        <div className="coord-card">
          <div className="coord-header">
            <div className={`coord-title ${status === 'correct' ? 'is-correct' : ''}`}>
              {status === 'correct' ? (
                <>
                  <span className="coord-check-badge">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span>Part 1. My correct solution</span>
                </>
              ) : (
                <span>Part 1. Coordinates</span>
              )}
            </div>

            <div className="coord-attempt">
              Attempt: {attemptCount}/2
            </div>
          </div>

          {/* Floating actions on the right of the card */}
          <div className="coord-floating-actions">
            <button
              className="coord-action-btn coord-btn-check"
              onClick={handleCheck}
              title="Check Answer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7a3eed"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              className="coord-action-btn coord-btn-reset"
              onClick={handleReset}
              title="Reset"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7a3eed"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>

          <div className="coord-body">
            <div className="coord-grid-col">
              <img
                src="/courses/VP2/M2-Control-Structures/pages/VP2_M2L1_4/images/coordinate_grid.png"
                alt="Coordinate Grid"
                className="coord-grid-img"
              />
            </div>

            <div className="coord-inputs-col">
              {ITEMS.map((item) => (
                <div className="coord-row" key={item.id}>
                  <div className="coord-item-icon">
                    <img src={item.icon} alt={item.name} />
                  </div>
                  <div className="coord-pill">
                    <span className="coord-label">X:</span>
                    <input
                      type="text"
                      className={`coord-field ${fieldStatuses[`${item.id}_x`] || ''}`}
                      value={values[item.id]?.x || ''}
                      onChange={(e) => handleChange(item.id, 'x', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCheck();
                      }}
                    />
                    <span className="coord-semicolon">;</span>
                    <span className="coord-label">Y:</span>
                    <input
                      type="text"
                      className={`coord-field ${fieldStatuses[`${item.id}_y`] || ''}`}
                      value={values[item.id]?.y || ''}
                      onChange={(e) => handleChange(item.id, 'y', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCheck();
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {onNextTask && (
        <button
          className="coord-nav-arrow coord-nav-next"
          onClick={onNextTask}
          aria-label="Next Task"
        >
          ›
        </button>
      )}
    </div>
  );
}
