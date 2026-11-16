import React, { useState, useEffect, useRef } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { saveTaskCompletionToSupabase } from '../lib/supabaseProgress.js';
import './ScratchInterfaceLabelTask.css';

const SLOTS = [
  {
    id: 'costumes',
    title: 'Costumes',
    correctLabelId: 'lbl_costumes',
    left: '2.10%',
    top: '2.39%',
    width: '25.00%',
    height: '10.76%',
  },
  {
    id: 'command_palette',
    title: 'Command block palette',
    correctLabelId: 'lbl_cmd_palette',
    left: '2.10%',
    top: '46.02%',
    width: '25.00%',
    height: '10.76%',
  },
  {
    id: 'command_list',
    title: 'Command list',
    correctLabelId: 'lbl_cmd_list',
    left: '8.92%',
    top: '87.05%',
    width: '25.00%',
    height: '10.76%',
  },
  {
    id: 'sprite_properties',
    title: 'Sprite properties',
    correctLabelId: 'lbl_sprite_props',
    left: '36.71%',
    top: '27.09%',
    width: '25.87%',
    height: '11.35%',
  },
  {
    id: 'scene',
    title: 'Scene',
    correctLabelId: 'lbl_scene',
    left: '82.17%',
    top: '21.31%',
    width: '9.79%',
    height: '4.78%',
    isTeal: true,
  },
  {
    id: 'program_script',
    title: 'Program (script)',
    correctLabelId: 'lbl_program_script',
    left: '30.07%',
    top: '60.36%',
    width: '25.00%',
    height: '11.35%',
  },
  {
    id: 'spritelist',
    title: 'Spritelist',
    correctLabelId: 'lbl_spritelist',
    left: '37.76%',
    top: '87.05%',
    width: '25.00%',
    height: '10.76%',
  },
  {
    id: 'add_sprite',
    title: 'Add a sprite',
    correctLabelId: 'lbl_add_sprite',
    left: '71.68%',
    top: '59.36%',
    width: '25.00%',
    height: '10.96%',
  },
  {
    id: 'add_background',
    title: 'Add a background',
    correctLabelId: 'lbl_add_bg',
    left: '66.61%',
    top: '87.05%',
    width: '25.00%',
    height: '10.76%',
  },
];

const LABELS = [
  { id: 'lbl_costumes', text: 'Costumes', targetId: 'costumes' },
  { id: 'lbl_cmd_palette', text: 'Command block palette', targetId: 'command_palette' },
  { id: 'lbl_cmd_list', text: 'Command list', targetId: 'command_list' },
  { id: 'lbl_sprite_props', text: 'Sprite properties', targetId: 'sprite_properties' },
  { id: 'lbl_scene', text: 'Scene', targetId: 'scene', isTeal: true },
  { id: 'lbl_program_script', text: 'Program (script)', targetId: 'program_script' },
  { id: 'lbl_spritelist', text: 'Spritelist', targetId: 'spritelist' },
  { id: 'lbl_add_sprite', text: 'Add a sprite', targetId: 'add_sprite' },
  { id: 'lbl_add_bg', text: 'Add a background', targetId: 'add_background' },
];

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
    'session-scratch-interface-label'
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

let activeDragLabelId = null;
let activeDragFromSlotId = null;

export default function ScratchInterfaceLabelTask(props) {
  const { task, completedTaskIds = [], onTaskCompleted, onNextTask, tasks = [], taskIndex = 2 } = props;

  const currentTaskId = String(task?.id || task?.taskId || 'VP2_M1L1_4_3');

  // slotAssignments: { [slotId]: labelId | null }
  const [slotAssignments, setSlotAssignments] = useState(() => {
    // Initial state: Scene is pre-filled like in the Algorithmics sample screenshot, or empty
    const initial = {};
    SLOTS.forEach((slot) => {
      initial[slot.id] = slot.id === 'scene' ? 'lbl_scene' : null;
    });
    return initial;
  });

  const [selectedLabelId, setSelectedLabelId] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'correct' | 'incorrect' | null
  const [feedbackText, setFeedbackText] = useState('');
  const [attemptCount, setAttemptCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetSpinning, setIsResetSpinning] = useState(false);

  const draggedRef = useRef(null);

  // Restore completion status from localStorage or props
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`scratch_label_completed_${currentTaskId}`);
      if (saved === 'true' || completedTaskIds.includes(currentTaskId)) {
        // Pre-fill all correct
        const allCorrect = {};
        SLOTS.forEach((slot) => {
          allCorrect[slot.id] = slot.correctLabelId;
        });
        setSlotAssignments(allCorrect);
        setSubmissionStatus('correct');
        setFeedbackText('Correct! You correctly identified all the elements of the Scratch interface.');
      }
    } catch {}
  }, [currentTaskId, completedTaskIds]);

  // Which labels are placed in a slot
  const placedLabelIds = Object.values(slotAssignments).filter(Boolean);

  // HTML5 Drag and Drop Handlers
  const handleDragStartFromPool = (e, labelId) => {
    activeDragLabelId = labelId;
    activeDragFromSlotId = null;
    draggedRef.current = { labelId, fromSlotId: null };

    try {
      e.dataTransfer.setData('text/plain', labelId);
      e.dataTransfer.effectAllowed = 'move';
    } catch {}
    setSelectedLabelId(labelId);
  };

  const handleDragStartFromSlot = (e, labelId, slotId) => {
    activeDragLabelId = labelId;
    activeDragFromSlotId = slotId;
    draggedRef.current = { labelId, fromSlotId: slotId };

    try {
      e.dataTransfer.setData('text/plain', labelId);
      e.dataTransfer.effectAllowed = 'move';
    } catch {}
  };

  const handleDragEnd = () => {
    activeDragLabelId = null;
    activeDragFromSlotId = null;
    draggedRef.current = null;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.dataTransfer.dropEffect = 'move';
    } catch {}
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropOnSlot = (e, targetSlotId) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;

    const labelId =
      activeDragLabelId ||
      draggedRef.current?.labelId ||
      e.dataTransfer.getData('text/plain');

    if (!labelId) return;

    const fromSlotId = activeDragFromSlotId || draggedRef.current?.fromSlotId;

    setSlotAssignments((prev) => {
      const next = { ...prev };
      // If label was in another slot, clear it
      if (fromSlotId && fromSlotId !== targetSlotId) {
        next[fromSlotId] = null;
      } else {
        // Also remove if anywhere else
        Object.keys(next).forEach((sId) => {
          if (next[sId] === labelId) next[sId] = null;
        });
      }

      // If target slot already had a label, swap or replace
      next[targetSlotId] = labelId;
      return next;
    });

    activeDragLabelId = null;
    activeDragFromSlotId = null;
    draggedRef.current = null;
    setSelectedLabelId(null);
    setSubmissionStatus(null);
    setFeedbackText('');
  };

  // Drop back to pool tray
  const handleDropOnPool = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;

    const labelId =
      activeDragLabelId ||
      draggedRef.current?.labelId ||
      e.dataTransfer.getData('text/plain');

    if (!labelId) return;

    setSlotAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sId) => {
        if (next[sId] === labelId) next[sId] = null;
      });
      return next;
    });

    activeDragLabelId = null;
    activeDragFromSlotId = null;
    draggedRef.current = null;
    setSelectedLabelId(null);
    setSubmissionStatus(null);
    setFeedbackText('');
  };

  // Click-to-place interactions
  const handlePoolLabelClick = (labelId) => {
    if (isSubmitting) return;

    if (selectedLabelId === labelId) {
      setSelectedLabelId(null);
    } else {
      setSelectedLabelId(labelId);
    }
  };

  const handleSlotClick = (slotId) => {
    if (isSubmitting) return;

    const existingLabelId = slotAssignments[slotId];

    // If a label is selected from the pool, place it here
    if (selectedLabelId) {
      setSlotAssignments((prev) => {
        const next = { ...prev };
        // Remove selected label from any other slot
        Object.keys(next).forEach((sId) => {
          if (next[sId] === selectedLabelId) next[sId] = null;
        });
        next[slotId] = selectedLabelId;
        return next;
      });
      setSelectedLabelId(null);
      setSubmissionStatus(null);
      setFeedbackText('');
      return;
    }

    // If slot has a label and nothing is selected, return it to pool
    if (existingLabelId) {
      setSlotAssignments((prev) => ({
        ...prev,
        [slotId]: null,
      }));
      setSubmissionStatus(null);
      setFeedbackText('');
    }
  };

  const handleReset = () => {
    if (isSubmitting) return;

    setIsResetSpinning(true);
    setTimeout(() => setIsResetSpinning(false), 500);

    const resetState = {};
    SLOTS.forEach((slot) => {
      resetState[slot.id] = slot.id === 'scene' ? 'lbl_scene' : null;
    });
    setSlotAssignments(resetState);
    setSelectedLabelId(null);
    setSubmissionStatus(null);
    setFeedbackText('');
    activeDragLabelId = null;
    activeDragFromSlotId = null;
    draggedRef.current = null;

    try {
      localStorage.removeItem(`scratch_label_completed_${currentTaskId}`);
    } catch {}
  };

  // Check answers
  const submitAttempt = async () => {
    // Check if at least the 8 main slots are filled
    const unfilledSlots = SLOTS.filter((s) => !slotAssignments[s.id]);
    if (unfilledSlots.length > 0) {
      setFeedbackText('Please place all labels into the slots before checking.');
      setSubmissionStatus('incorrect');
      return;
    }

    setIsSubmitting(true);

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course') || 'VP2';
    const lessonId = urlParams.get('lesson') || 'M1-Visual-Programming-Basics';
    const pageId = urlParams.get('page') || 'VP2_M1L1_4';

    let allCorrect = true;
    SLOTS.forEach((slot) => {
      if (slotAssignments[slot.id] !== slot.correctLabelId) {
        allCorrect = false;
      }
    });

    const payload = {
      sessionId: getSessionId(),
      userId: getUserId(),
      courseId,
      lessonId,
      pageId,
      taskId: currentTaskId,
      activityType: 'scratch-interface-label',
      answer: {
        slotAssignments,
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
          allCorrect = gradingResult.isCorrect;
        }
      }
    } catch (err) {
      console.warn('[ScratchInterfaceLabelTask] Backend submission fallback:', err);
    }

    // Save to Supabase
    if (allCorrect) {
      setSubmissionStatus('correct');
      setFeedbackText('Correct! You correctly identified all the elements of the Scratch interface.');
      playLmsSound(LMS_SOUND_TYPES.COMPLETE_ACTIVITY);

      await saveTaskCompletionToSupabase({
        courseId,
        lessonId,
        pageId,
        taskId: currentTaskId,
        activityType: 'scratch-interface-label',
      });

      try {
        localStorage.setItem(`scratch_label_completed_${currentTaskId}`, 'true');
      } catch {}

      if (typeof onTaskCompleted === 'function') {
        onTaskCompleted({
          taskId: currentTaskId,
          isCorrect: true,
          completed: true,
          score: 1,
          maxScore: 1,
          activityType: 'scratch-interface-label',
          autoTransition: true,
        });
      }
    } else {
      playLmsSound(LMS_SOUND_TYPES.WRONG);
      setSubmissionStatus('incorrect');
      setFeedbackText('Some labels are not in the correct place. Review the red highlighted slots and try again!');
      setAttemptCount((prev) => prev + 1);
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

  const isAllFilled = SLOTS.every((s) => Boolean(slotAssignments[s.id]));
  const isLastTask = taskIndex >= tasks.length - 1;

  const getSlotStatus = (slot) => {
    if (submissionStatus === 'correct') return 'is-correct';
    if (submissionStatus === 'incorrect') {
      if (slotAssignments[slot.id]) {
        return slotAssignments[slot.id] === slot.correctLabelId ? 'is-correct' : 'is-wrong';
      }
    }
    return '';
  };

  return (
    <div className="scratch-label-page">
      <div className="scratch-label-container">
        {/* Main Floating White Card */}
        <div className="scratch-label-card-shell">
          {/* Card Top Header */}
          <div className="scratch-label-header">
            <div className="scratch-label-title-group">
              {submissionStatus === 'correct' ? (
                <div className="scratch-label-solution-badge">
                  <svg className="scratch-label-check-icon" width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" fill="#16a34a" />
                    <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="scratch-label-solution-text">Part 1. My correct solution</span>
                </div>
              ) : (
                <div className="scratch-label-prompt-badge">
                  <span className="scratch-label-info-icon">i</span>
                  <span className="scratch-label-prompt-text">Part 1. Label the Scratch interface</span>
                </div>
              )}
            </div>

            <div className="scratch-label-attempt-badge">
              Attempt: {attemptCount}/2
            </div>
          </div>

          {/* Card Body: Left Diagram & Right Pool */}
          <div className="scratch-label-body">
            {/* Left Diagram Workspace */}
            <div className="scratch-label-diagram-panel">
              <div className="scratch-label-diagram-wrapper">
                <img
                  src="/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/scratch_interface_original.png"
                  alt="Scratch interface diagram with callout slots"
                  className="scratch-label-base-image"
                  draggable={false}
                />

                {/* 9 Interactive Callout Drop Slots */}
                {SLOTS.map((slot) => {
                  const assignedLabelId = slotAssignments[slot.id];
                  const label = LABELS.find((l) => l.id === assignedLabelId);
                  const slotStatus = getSlotStatus(slot);

                  return (
                    <div
                      key={slot.id}
                      className={`scratch-label-slot ${assignedLabelId ? 'has-label' : 'empty'} ${slotStatus}`}
                      style={{
                        left: slot.left,
                        top: slot.top,
                        width: slot.width,
                        height: slot.height,
                      }}
                      onClick={() => handleSlotClick(slot.id)}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDrop={(e) => handleDropOnSlot(e, slot.id)}
                      title={label ? `"${label.text}" (drag or click to remove)` : `Drop label for ${slot.title} here`}
                    >
                      {label ? (
                        <div
                          className={`scratch-label-badge placed ${label.isTeal || slot.isTeal ? 'teal' : 'purple'}`}
                          draggable={!isSubmitting}
                          onDragStart={(e) => handleDragStartFromSlot(e, label.id, slot.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <span className="scratch-label-badge-text">{label.text}</span>
                        </div>
                      ) : (
                        <div className="scratch-label-slot-placeholder">
                          <span className="scratch-label-slot-dot" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pool Tray */}
            <div
              className="scratch-label-pool-panel"
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDrop={handleDropOnPool}
            >
              <div className="scratch-label-pool-header">
                <span className="scratch-label-pool-title">Labels to place</span>
                <span className="scratch-label-pool-hint">
                  {selectedLabelId ? 'Click a slot on the left to place' : 'Drag or click a label to place'}
                </span>
              </div>

              <div className="scratch-label-pool-list">
                {LABELS.map((label) => {
                  const isPlaced = placedLabelIds.includes(label.id);
                  const isSelected = selectedLabelId === label.id;

                  return (
                    <div
                      key={label.id}
                      className={`scratch-label-badge pool ${label.isTeal ? 'teal' : 'purple'} ${
                        isPlaced ? 'is-placed' : ''
                      } ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handlePoolLabelClick(label.id)}
                      draggable={!isPlaced && !isSubmitting}
                      onDragStart={(e) => handleDragStartFromPool(e, label.id)}
                      onDragEnd={handleDragEnd}
                      title={isPlaced ? 'Already placed in a slot (click slot to return)' : 'Drag or click to place'}
                    >
                      <span className="scratch-label-badge-text">{label.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feedback & Bottom Controls */}
          {feedbackText && (
            <div className={`scratch-label-feedback ${submissionStatus || ''}`}>
              {feedbackText}
            </div>
          )}

          <div className="scratch-label-actions">
            <button
              type="button"
              className="scratch-label-reset-btn"
              onClick={handleReset}
              disabled={isSubmitting}
              title="Reset labels"
              aria-label="Reset labels"
            >
              <svg
                className={`scratch-label-reset-icon ${isResetSpinning ? 'spin' : ''}`}
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
              className={`scratch-label-answer-btn ${
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
                : 'CHECK'}
            </button>
          </div>

          {/* Floating Right Tab Buttons Matching Algorithmics LMS Shell */}
          <div className="scratch-label-side-tabs">
            <button
              type="button"
              className={`scratch-label-tab-btn check ${submissionStatus === 'correct' ? 'checked' : isAllFilled ? 'ready' : ''}`}
              onClick={handleAnswerOrNext}
              disabled={(!isAllFilled && submissionStatus !== 'correct') || isSubmitting}
              title={submissionStatus === 'correct' ? 'Completed' : 'Check solution'}
              aria-label="Check solution"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>

            <button
              type="button"
              className="scratch-label-tab-btn reload"
              onClick={handleReset}
              disabled={isSubmitting}
              title="Reset task"
              aria-label="Reset task"
            >
              <svg
                className={isResetSpinning ? 'spin' : ''}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
