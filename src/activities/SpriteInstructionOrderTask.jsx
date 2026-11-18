import React, { useState, useEffect, useRef } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { saveTaskCompletionToSupabase } from '../lib/supabaseProgress.js';
import './SpriteInstructionOrderTask.css';

const INSTRUCTION_CARDS = [
  {
    id: 'card_backdrop',
    image: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/step_card_backdrop.png',
    label: 'Choose a Backdrop',
    slotIndex: 0,
  },
  {
    id: 'card_sprite1',
    image: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/step_card_sprite1.png',
    label: 'Sprite 1 Selection',
    slotIndex: 1,
  },
  {
    id: 'card_library',
    image: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/step_card_sprite_library.png',
    label: 'Choose from Sprite Library',
    slotIndex: 2,
    correctStep: 2, // Step 2: Pick a sprite from library
  },
  {
    id: 'card_stage',
    image: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/step_card_stage_sprite.png',
    label: 'Sprite appears on Stage',
    slotIndex: 3,
    correctStep: 3, // Step 3: Sprite appears on stage
  },
  {
    id: 'card_choose_btn',
    image: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/step_card_choose_sprite.png',
    label: 'Click Choose a Sprite button',
    slotIndex: 4,
    correctStep: 1, // Step 1: Hover/click Choose a Sprite cat icon
  },
];

const CORRECT_ORDER = {
  1: 'card_choose_btn',
  2: 'card_library',
  3: 'card_stage',
};

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
    'session-sprite-instruction'
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

let activeDragCardId = null;
let activeDragFromCol = null;

export default function SpriteInstructionOrderTask(props) {
  const { task, completedTaskIds = [], onTaskCompleted, onNextTask, tasks = [], taskIndex = 1 } = props;

  const currentTaskId = String(task?.id || task?.taskId || 'VP2_M1L1_4_2');

  const [columns, setColumns] = useState({ 1: null, 2: null, 3: null });
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetSpinning, setIsResetSpinning] = useState(false);

  const draggedCardRef = useRef(null);

  // Determine which cards are placed in columns
  const placedCardIds = Object.values(columns).filter(Boolean);

  // Click card in bank
  const handleBankCardClick = (cardId) => {
    if (isSubmitting) return;

    // If card is already placed in a column, click to remove it from column
    const existingCol = Object.keys(columns).find((col) => columns[col] === cardId);
    if (existingCol) {
      setColumns((prev) => ({ ...prev, [existingCol]: null }));
      setSubmissionStatus(null);
      setFeedbackText('');
      return;
    }

    // Auto-place into first available empty column (1, 2, or 3)
    const firstEmptyCol = [1, 2, 3].find((col) => !columns[col]);
    if (firstEmptyCol) {
      setColumns((prev) => ({ ...prev, [firstEmptyCol]: cardId }));
      setSelectedCardId(null);
      setSubmissionStatus(null);
      setFeedbackText('');
    } else {
      setSelectedCardId((prev) => (prev === cardId ? null : cardId));
    }
  };

  // Click column slot
  const handleColumnClick = (colNum) => {
    if (isSubmitting) return;

    // If a bank card is currently selected, place it here
    if (selectedCardId) {
      setColumns((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((k) => {
          if (updated[k] === selectedCardId) updated[k] = null;
        });
        updated[colNum] = selectedCardId;
        return updated;
      });
      setSelectedCardId(null);
      setSubmissionStatus(null);
      setFeedbackText('');
      return;
    }

    // If column already has a card, clicking it removes it back to bank
    if (columns[colNum]) {
      setColumns((prev) => ({ ...prev, [colNum]: null }));
      setSubmissionStatus(null);
      setFeedbackText('');
    }
  };

  // Drag and drop handlers
  const handleDragStartFromBank = (e, cardId) => {
    activeDragCardId = cardId;
    activeDragFromCol = null;
    draggedCardRef.current = { cardId, source: 'bank' };
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
    if (submissionStatus) {
      setSubmissionStatus(null);
      setFeedbackText('');
    }
  };

  const handleDragStartFromColumn = (e, cardId, colNum) => {
    activeDragCardId = cardId;
    activeDragFromCol = colNum;
    draggedCardRef.current = { cardId, source: 'column', fromCol: colNum };
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
    if (submissionStatus) {
      setSubmissionStatus(null);
      setFeedbackText('');
    }
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      activeDragCardId = null;
      activeDragFromCol = null;
      draggedCardRef.current = null;
    }, 150);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropOnColumn = (e, targetCol) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;

    const cardId =
      activeDragCardId ||
      draggedCardRef.current?.cardId ||
      e.dataTransfer.getData('text/plain');

    if (!cardId) return;

    const fromCol = activeDragFromCol || draggedCardRef.current?.fromCol;

    setColumns((prev) => {
      const updated = { ...prev };
      if (fromCol) {
        const fromColNum = parseInt(fromCol, 10);
        if (fromColNum !== targetCol) {
          const existingInTarget = updated[targetCol];
          updated[fromColNum] = existingInTarget || null;
          updated[targetCol] = cardId;
        }
      } else {
        Object.keys(updated).forEach((k) => {
          if (updated[k] === cardId) updated[k] = null;
        });
        updated[targetCol] = cardId;
      }
      return updated;
    });

    activeDragCardId = null;
    activeDragFromCol = null;
    draggedCardRef.current = null;
    setSelectedCardId(null);
    setSubmissionStatus(null);
    setFeedbackText('');
  };

  // Drop back to bank ("kéo lên trả lại kho")
  const handleDropOnBank = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;

    const cardId =
      activeDragCardId ||
      draggedCardRef.current?.cardId ||
      e.dataTransfer.getData('text/plain');

    if (!cardId) return;

    setColumns((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        if (updated[k] === cardId) updated[k] = null;
      });
      return updated;
    });

    activeDragCardId = null;
    activeDragFromCol = null;
    draggedCardRef.current = null;
    setSelectedCardId(null);
    setSubmissionStatus(null);
    setFeedbackText('');
  };

  const handleReset = () => {
    if (isSubmitting) return;

    setIsResetSpinning(true);
    setTimeout(() => setIsResetSpinning(false), 500);

    setColumns({ 1: null, 2: null, 3: null });
    setSelectedCardId(null);
    setSubmissionStatus(null);
    setFeedbackText('');
    activeDragCardId = null;
    activeDragFromCol = null;
    draggedCardRef.current = null;

    try {
      localStorage.removeItem(`sprite_instruction_completed_${currentTaskId}`);
    } catch {}
  };

  const submitAttempt = async () => {
    // Check if all 3 columns are filled
    if (!columns[1] || !columns[2] || !columns[3]) {
      setFeedbackText('Please place a card in each of the 3 columns before checking.');
      setSubmissionStatus('incorrect');
      return;
    }

    setIsSubmitting(true);

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course') || 'VP2';
    const lessonId = urlParams.get('lesson') || 'M1-Visual-Programming-Basics';
    const pageId = urlParams.get('page') || 'VP2_M1L1_4';

    let isCorrect =
      columns[1] === CORRECT_ORDER[1] &&
      columns[2] === CORRECT_ORDER[2] &&
      columns[3] === CORRECT_ORDER[3];

    let feedback = isCorrect
      ? 'Correct! You created the right instructions to add a sprite.'
      : 'Not quite right. Think about what you click first, second, and what happens last!';

    const payload = {
      sessionId: getSessionId(),
      userId: getUserId(),
      courseId,
      lessonId,
      pageId,
      taskId: currentTaskId,
      activityType: 'sequence-order-task',
      answer: {
        order: [columns[1], columns[2], columns[3]],
        columns,
      },
    };

    const backendUrl = getBackendUrl();
    const endpoint = `${backendUrl}/api/activity-attempts`;

    try {
      const accessToken =
        sessionStorage.getItem('lms_access_token') ||
        localStorage.getItem('lms_access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const gradingResult = data?.result || data?.attempt?.result;
        if (gradingResult && typeof gradingResult.isCorrect === 'boolean') {
          isCorrect = gradingResult.isCorrect;
          if (gradingResult.feedback) feedback = gradingResult.feedback;
        }
      }
    } catch (err) {
      console.warn('[SpriteInstructionOrderTask] Backend submission fallback:', err);
    }

    if (isCorrect) {
      setSubmissionStatus('correct');
      setFeedbackText(feedback || 'Correct! You created the right instructions to add a sprite.');

      await saveTaskCompletionToSupabase({
        courseId,
        lessonId,
        pageId,
        taskId: currentTaskId,
        activityType: 'sequence-order-task',
      });

      try {
        localStorage.setItem(`sprite_instruction_completed_${currentTaskId}`, 'true');
      } catch {}

      if (typeof onTaskCompleted === 'function') {
        onTaskCompleted({
          taskId: currentTaskId,
          isCorrect: true,
          completed: true,
          score: 1,
          maxScore: 1,
          activityType: 'sequence-order-task',
          autoTransition: true,
        });
      }
    } else {
      setSubmissionStatus('incorrect');
      setFeedbackText(feedback || 'Not quite right. Think about what you click first, second, and what happens last!');
    }

    setIsSubmitting(false);
  };

  const handleAnswerOrNext = () => {
    if (submissionStatus === 'correct') {
      if (typeof onNextTask === 'function') {
        onNextTask();
      }
      return;
    }

    submitAttempt();
  };

  const isAllFilled = Boolean(columns[1] && columns[2] && columns[3]);
  const isLastTask = taskIndex >= tasks.length - 1;

  const getColumnStatus = (colNum) => {
    if (submissionStatus === 'correct') return 'is-correct';
    if (submissionStatus === 'incorrect' && isAllFilled) {
      return columns[colNum] === CORRECT_ORDER[colNum] ? 'is-correct' : 'is-wrong';
    }
    return '';
  };

  return (
    <div className="sprite-instruction-page">
      <div className="sprite-instruction-container">
        {/* Left Panel: Prompt and Action Buttons */}
        <div className="sprite-instruction-left-panel">
          <div className="sprite-instruction-prompt-card">
            <h2 className="sprite-instruction-title">
              Create instructions "How to add a sprite"!
            </h2>
            <p className="sprite-instruction-description">
              The first step of the instruction must be added to the first column,
              the second to the second, and so on. Each column should contain only
              one card with an action, and some cards should be extra.
            </p>

            {feedbackText && (
              <div className={`sprite-instruction-feedback ${submissionStatus || ''}`}>
                {feedbackText}
              </div>
            )}
          </div>

          <div className="sprite-instruction-actions">
            <button
              type="button"
              className="sprite-instruction-reset-btn"
              onClick={handleReset}
              disabled={isSubmitting}
              title="Reset order"
              aria-label="Reset order"
            >
              <svg
                className={`sprite-instruction-reset-icon ${isResetSpinning ? 'spin' : ''}`}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e1b4b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>

            <button
              type="button"
              className={`sprite-instruction-answer-btn ${
                submissionStatus === 'correct'
                  ? 'next'
                  : isAllFilled
                  ? 'active'
                  : 'disabled'
              }`}
              onClick={handleAnswerOrNext}
              disabled={(!isAllFilled && submissionStatus !== 'correct') || isSubmitting}
            >
              {isSubmitting
                ? 'Checking...'
                : submissionStatus === 'correct'
                ? isLastTask
                  ? 'Finish'
                  : 'Next'
                : 'ANSWER'}
            </button>
          </div>
        </div>

        {/* Right Panel: Top 3 Sequence Columns & Bottom Card Bank */}
        <div className="sprite-instruction-right-panel">
          {/* Top 3 Sequence Columns (Target dropzones on top, drag up from bank) */}
          <div className="sprite-instruction-columns-grid">
            {[1, 2, 3].map((colNum) => {
              const cardId = columns[colNum];
              const card = INSTRUCTION_CARDS.find((c) => c.id === cardId);
              const colStatus = getColumnStatus(colNum);

              return (
                <div key={colNum} className="sprite-instruction-column">
                  <div className="sprite-instruction-column-header">{colNum}</div>

                  <div
                    className={`sprite-instruction-column-dropzone ${
                      card ? 'has-card' : 'empty'
                    } ${colStatus}`}
                    onClick={() => handleColumnClick(colNum)}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDrop={(e) => handleDropOnColumn(e, colNum)}
                    title={card ? 'Drag to another column, or drag down to bank to return' : `Drop step ${colNum} here`}
                  >
                    {card ? (
                      <div
                        className="sprite-instruction-placed-card"
                        draggable={!isSubmitting}
                        onDragStart={(e) => handleDragStartFromColumn(e, card.id, colNum)}
                        onDragEnd={handleDragEnd}
                      >
                        <img src={card.image} alt={card.label} draggable={false} />
                      </div>
                    ) : (
                      <div className="sprite-instruction-placeholder">
                        <span>Place step {colNum}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Card Bank */}
          <div
            className="sprite-instruction-bank-card"
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDrop={handleDropOnBank}
          >
            <div className="sprite-instruction-bank-grid">
              {INSTRUCTION_CARDS.map((card) => {
                const isPlaced = placedCardIds.includes(card.id);
                const isSelected = selectedCardId === card.id;

                return (
                  <div
                    key={card.id}
                    className={`sprite-instruction-bank-slot ${
                      isPlaced ? 'is-placed' : ''
                    } ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleBankCardClick(card.id)}
                    draggable={!isPlaced && !isSubmitting}
                    onDragStart={(e) => handleDragStartFromBank(e, card.id)}
                    onDragEnd={handleDragEnd}
                    title={isPlaced ? 'Card is in a column (drag or click to return)' : 'Drag up to place in column'}
                  >
                    <div className="sprite-instruction-card-content">
                      <img src={card.image} alt={card.label} draggable={false} />
                    </div>
                  </div>
                );
              })}
              {/* 6th Slot Placeholder matching Algorithmics LMS 2x3 grid */}
              <div className="sprite-instruction-bank-slot is-empty-placeholder" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
