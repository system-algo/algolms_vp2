import React, { useState, useEffect } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { saveTaskCompletionToSupabase } from '../lib/supabaseProgress';
import './CoordinateDragDropTask.css';

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
    'session-coord-drag'
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

const ITEMS = [
  {
    id: 'diamond',
    name: 'Diamond',
    icon: '/courses/VP2/M2-Control-Structures/pages/VP2_M2L1_4/images/diamond.png',
    targetX: 3,
    targetY: -1,
  },
  {
    id: 'emerald',
    name: 'Emerald',
    icon: '/courses/VP2/M2-Control-Structures/pages/VP2_M2L1_4/images/emerald.png',
    targetX: -3,
    targetY: -1,
  },
  {
    id: 'crystal',
    name: 'Blue Crystal',
    icon: '/courses/VP2/M2-Control-Structures/pages/VP2_M2L1_4/images/crystal.png',
    targetX: -3,
    targetY: -7,
  },
];

const GRID_DOTS = [
  {
    id: 'dot_neg3_neg1',
    x: -3,
    y: -1,
    leftPct: 25.59,
    topPct: 59.15,
    expectedItem: 'emerald',
  },
  {
    id: 'dot_3_neg1',
    x: 3,
    y: -1,
    leftPct: 54.92,
    topPct: 59.15,
    expectedItem: 'diamond',
  },
  {
    id: 'dot_neg3_neg7',
    x: -3,
    y: -7,
    leftPct: 25.59,
    topPct: 87.72,
    expectedItem: 'crystal',
  },
  {
    id: 'dot_3_neg7',
    x: 3,
    y: -7,
    leftPct: 54.92,
    topPct: 87.72,
    expectedItem: null,
  },
];

export default function CoordinateDragDropTask({
  task,
  onTaskCompleted,
  onNextTask,
  onPrevTask,
  completedTaskIds = [],
}) {
  const taskId = task?.id || task?.taskId || 'VP2_M2L1_4_3';

  // dotPlacements maps dotId -> itemId
  const [dotPlacements, setDotPlacements] = useState({});
  const [status, setStatus] = useState('');
  const [attemptCount, setAttemptCount] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null); // { itemId, sourceDotId }
  const [hoveredDotId, setHoveredDotId] = useState(null);

  // Restore if already completed
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
      setDotPlacements({
        dot_neg3_neg1: 'emerald',
        dot_3_neg1: 'diamond',
        dot_neg3_neg7: 'crystal',
      });
      setStatus('correct');
    }
  }, [taskId, completedTaskIds]);

  // Which items are currently placed on the grid
  const placedItemIds = new Set(Object.values(dotPlacements).filter(Boolean));

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e, itemId, sourceDotId = null) => {
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem({ itemId, sourceDotId });
    setSelectedItem(null);
  };

  const handleDragOver = (e, dotId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoveredDotId !== dotId) {
      setHoveredDotId(dotId);
    }
  };

  const handleDragLeave = (e, dotId) => {
    if (hoveredDotId === dotId) {
      setHoveredDotId(null);
    }
  };

  const placeItemOnDot = (itemId, targetDotId, sourceDotId = null) => {
    setDotPlacements((prev) => {
      const next = { ...prev };

      // If item was already somewhere else on the grid, remove it from old dot
      Object.keys(next).forEach((k) => {
        if (next[k] === itemId) {
          delete next[k];
        }
      });

      // If target dot already had an item, and we dragged from another dot, swap them!
      const previousAtTarget = next[targetDotId];
      if (sourceDotId && previousAtTarget && previousAtTarget !== itemId) {
        next[sourceDotId] = previousAtTarget;
      }

      next[targetDotId] = itemId;
      return next;
    });

    setSelectedItem(null);
    setDraggedItem(null);
    setHoveredDotId(null);
    setStatus('');
  };

  const handleDrop = (e, targetDotId) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain') || draggedItem?.itemId;
    if (!itemId) return;

    placeItemOnDot(itemId, targetDotId, draggedItem?.sourceDotId);
  };

  // --- CLICK-TO-MOVE / TAP HANDLERS ---
  const handleItemClick = (itemId) => {
    if (status === 'correct') return;
    if (selectedItem === itemId) {
      setSelectedItem(null);
    } else {
      setSelectedItem(itemId);
    }
  };

  const handleDotClick = (dotId) => {
    if (status === 'correct') return;

    if (selectedItem) {
      placeItemOnDot(selectedItem, dotId);
    } else if (dotPlacements[dotId]) {
      // Return placed item back to tray
      setDotPlacements((prev) => {
        const next = { ...prev };
        delete next[dotId];
        return next;
      });
      setStatus('');
    }
  };

  const handlePlacedItemClick = (e, dotId) => {
    e.stopPropagation();
    if (status === 'correct') return;

    if (selectedItem) {
      // Place the selected item here
      placeItemOnDot(selectedItem, dotId);
    } else {
      // Remove placed item and return to right tray
      setDotPlacements((prev) => {
        const next = { ...prev };
        delete next[dotId];
        return next;
      });
      setStatus('');
    }
  };

  const handleReset = () => {
    setDotPlacements({});
    setSelectedItem(null);
    setDraggedItem(null);
    setHoveredDotId(null);
    setStatus('');
  };

  // --- SUBMIT / CHECK HANDLER ---
  const handleCheck = async () => {
    // Check answer correctness
    const isDiamondCorrect = dotPlacements.dot_3_neg1 === 'diamond';
    const isEmeraldCorrect = dotPlacements.dot_neg3_neg1 === 'emerald';
    const isCrystalCorrect = dotPlacements.dot_neg3_neg7 === 'crystal';
    const isDistractorEmpty = !dotPlacements.dot_3_neg7;

    const allCorrect =
      isDiamondCorrect &&
      isEmeraldCorrect &&
      isCrystalCorrect &&
      isDistractorEmpty;

    // Send attempt to backend
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course') || task?.courseId || 'VP2';
    const lessonId = urlParams.get('lesson') || task?.lessonId || 'M2-Control-Structures';
    const pageId = urlParams.get('page') || task?.pageId || 'VP2_M2L1_4';

    const payload = {
      sessionId: getSessionId(),
      userId: getUserId(),
      courseId,
      lessonId,
      pageId,
      taskId,
      activityType: 'coordinate-dragdrop-task',
      answer: {
        placements: dotPlacements,
      },
      isCorrect: allCorrect,
      score: allCorrect ? 1 : 0,
      maxScore: 1,
    };

    const backendUrl = getBackendUrl();
    const endpoint = `${backendUrl}/api/activity-attempts`;

    try {
      const accessToken =
        sessionStorage.getItem('lms_access_token') ||
        localStorage.getItem('lms_access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn('[CoordinateDragDropTask] backend attempt error:', err);
      });
    } catch (err) {
      console.warn('[CoordinateDragDropTask] attempt send error:', err);
    }

    if (allCorrect) {
      setStatus('correct');

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
    } else {
      setStatus('wrong');
      setAttemptCount((prev) => Math.min(2, prev + 1));
    }
  };

  return (
    <div className="coord-drag-stage">
      {onPrevTask && (
        <button
          className="coord-drag-nav-arrow coord-drag-nav-prev"
          onClick={onPrevTask}
          aria-label="Previous Task"
        >
          ‹
        </button>
      )}

      <div className="coord-drag-card-container">
        <div className="coord-drag-card">
          {/* Header */}
          <div className="coord-drag-header">
            <div className={`coord-drag-title ${status === 'correct' ? 'is-correct' : ''}`}>
              {status === 'correct' ? (
                <>
                  <span className="coord-drag-check-badge">
                    <svg
                      width="12"
                      height="12"
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
                <>
                  <span className="coord-drag-info-badge">i</span>
                  <span>Part 1.</span>
                </>
              )}
            </div>

            <div className="coord-drag-attempt">
              Attempt: {attemptCount}/2
            </div>
          </div>

          {/* Floating Action Buttons */}
          <div className="coord-drag-floating-actions">
            <button
              className="coord-drag-action-btn coord-drag-btn-check"
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
              className="coord-drag-action-btn coord-drag-btn-reset"
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

          {/* Body */}
          <div className="coord-drag-body">
            {/* Left: Coordinate Grid with Drop Dots */}
            <div className="coord-drag-grid-col">
              <img
                src="/courses/VP2/M2-Control-Structures/pages/VP2_M2L1_4/images/coordinate_grid_dots.png"
                alt="Coordinate Grid"
                className="coord-drag-grid-img"
              />

              {GRID_DOTS.map((dot) => {
                const placedItemId = dotPlacements[dot.id];
                const placedItem = ITEMS.find((it) => it.id === placedItemId);
                const isHovered = hoveredDotId === dot.id;

                return (
                  <React.Fragment key={dot.id}>
                    {/* The target drop dot */}
                    <div
                      className={`coord-drag-dot ${isHovered ? 'is-drag-hover' : ''} ${placedItem ? 'is-has-item' : ''}`}
                      style={{
                        left: `${dot.leftPct}%`,
                        top: `${dot.topPct}%`,
                      }}
                      onDragOver={(e) => handleDragOver(e, dot.id)}
                      onDragLeave={(e) => handleDragLeave(e, dot.id)}
                      onDrop={(e) => handleDrop(e, dot.id)}
                      onClick={() => handleDotClick(dot.id)}
                      title={`Target (X: ${dot.x}, Y: ${dot.y})`}
                    />

                    {/* Placed item on this dot */}
                    {placedItem && (
                      <div
                        className="coord-drag-placed-item"
                        style={{
                          left: `${dot.leftPct}%`,
                          top: `${dot.topPct}%`,
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, placedItem.id, dot.id)}
                        onClick={(e) => handlePlacedItemClick(e, dot.id, placedItem.id)}
                        title={`${placedItem.name} placed at (${dot.x}, ${dot.y}). Click to return.`}
                      >
                        <img src={placedItem.icon} alt={placedItem.name} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Right: Items Tray and Coordinate Pills */}
            <div className="coord-drag-items-col">
              {ITEMS.map((item) => {
                const isPlaced = placedItemIds.has(item.id);
                const isSelected = selectedItem === item.id;

                return (
                  <div className="coord-drag-row" key={item.id}>
                    <div className="coord-drag-slot">
                      {isPlaced ? (
                        <div className="coord-drag-slot-empty" />
                      ) : (
                        <div
                          className={`coord-drag-tray-item ${isSelected ? 'is-selected' : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onClick={() => handleItemClick(item.id)}
                          title={`Drag ${item.name} or click to select`}
                        >
                          <img src={item.icon} alt={item.name} />
                        </div>
                      )}
                    </div>

                    <div className="coord-drag-pill">
                      <span className="coord-drag-axis">X:</span>
                      <span className="coord-drag-val">{item.targetX}</span>
                      <span className="coord-drag-sep">;</span>
                      <span className="coord-drag-axis">Y:</span>
                      <span className="coord-drag-val">{item.targetY}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {onNextTask && (
        <button
          className="coord-drag-nav-arrow coord-drag-nav-next"
          onClick={onNextTask}
          aria-label="Next Task"
        >
          ›
        </button>
      )}
    </div>
  );
}
