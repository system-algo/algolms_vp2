import { useEffect, useMemo, useState } from 'react';
import './MatchingDragdropTask.css';
import LmsActivityFrame from '../components/LmsActivityFrame.jsx';
import {
  getMatchingData,
  loadLocalTaskState,
  saveLocalTaskState,
} from '../lib/taskExtractors.js';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function preserveText(value) {
  return String(value || '').trim();
}

function getImageSrc(value) {
  if (!value || typeof value === 'string') return '';

  return String(
    value.imageSrc ||
    value.image ||
    value.src ||
    value.imageUrl ||
    value.url ||
    '',
  ).trim();
}

function getImageAlt(value) {
  if (!value || typeof value === 'string') return '';

  return String(
    value.imageAlt ||
    value.alt ||
    value.ariaLabel ||
    value.text ||
    value.label ||
    value.title ||
    '',
  ).trim();
}

function getRouteContext() {
  const params = new URLSearchParams(window.location.search);

  return {
    courseId: params.get('course') || '',
    lessonId: params.get('lesson') || '',
    pageId: params.get('page') || '',
  };
}

function createFallbackId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSessionId() {
  const params = new URLSearchParams(window.location.search);
  const querySessionId = params.get('sessionId') || params.get('session');

  if (querySessionId) {
    localStorage.setItem('lms-session-id', querySessionId);
    return querySessionId;
  }

  let sessionId = localStorage.getItem('lms-session-id');

  if (!sessionId) {
    sessionId = `session-${createFallbackId()}`;
    localStorage.setItem('lms-session-id', sessionId);
  }

  return sessionId;
}

function getUserId() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get('userId') ||
    localStorage.getItem('lms-user-id') ||
    localStorage.getItem('lms_student_email') ||
    'tim.tran@algo.edu.vn'
  );
}

function getTaskId(task) {
  return String(
    task?.id ||
    task?.taskId ||
    task?.taskKey ||
    task?.key ||
    task?.manualTaskId ||
    task?.mapTaskId ||
    task?.sourceTaskId ||
    task?.rawTaskId ||
    '',
  ).trim();
}

function getTaskRendererConfig(pageInstance, task) {
  const taskId = getTaskId(task);

  if (!taskId) return null;

  const taskRenderer = pageInstance?.taskRenderers?.[taskId] || null;

  return (
    taskRenderer?.matchingDragdrop ||
    taskRenderer?.matchingDragDrop ||
    taskRenderer?.matching ||
    taskRenderer?.data ||
    task?.matchingDragdrop ||
    task?.matchingDragDrop ||
    task?.matching ||
    null
  );
}

function toItem(rawItem, index) {
  if (typeof rawItem === 'string') {
    return {
      id: `item-${index + 1}`,
      text: rawItem,
      imageSrc: '',
      imageAlt: '',
      showText: true,
    };
  }

  const text = preserveText(
    rawItem?.text ||
    rawItem?.label ||
    rawItem?.title ||
    rawItem?.code ||
    '',
  );

  const imageSrc = getImageSrc(rawItem);

  return {
    id: String(rawItem?.id || rawItem?.itemId || `item-${index + 1}`),
    text,
    imageSrc,
    imageAlt: getImageAlt(rawItem),
    showText: rawItem?.showText ?? rawItem?.caption ?? true,
  };
}

function toTarget(rawTarget, index, answerKey = {}) {
  if (typeof rawTarget === 'string') {
    const id = `target-${index + 1}`;

    return {
      id,
      text: rawTarget,
      imageSrc: '',
      imageAlt: '',
      correctItemId: answerKey[id] || '',
      showText: true,
    };
  }

  const id = String(rawTarget?.id || rawTarget?.targetId || `target-${index + 1}`);
  const imageSrc = getImageSrc(rawTarget);

  return {
    id,
    text: preserveText(
      rawTarget?.text ||
      rawTarget?.label ||
      rawTarget?.definition ||
      rawTarget?.title ||
      rawTarget?.caption ||
      '',
    ),
    imageSrc,
    imageAlt: getImageAlt(rawTarget),
    correctItemId: String(
      rawTarget?.correctItemId ||
      rawTarget?.correct ||
      rawTarget?.answer ||
      answerKey[id] ||
      '',
    ),
    showText: rawTarget?.showText ?? rawTarget?.caption ?? !imageSrc,
  };
}

function buildDataFromConfig(config, fallbackData) {
  const answerKey =
    config?.answerKey ||
    config?.pairs ||
    config?.correctPairs ||
    {};

  const items = Array.isArray(config?.items)
    ? config.items
        .map(toItem)
        .filter((item) => item.text || item.imageSrc)
    : fallbackData.terms.map((term, index) => ({
        id: String(term.id || `item-${index + 1}`),
        text: preserveText(term.text),
        imageSrc: getImageSrc(term),
        imageAlt: getImageAlt(term),
        showText: true,
      })).filter((item) => item.text || item.imageSrc);

  const targets = Array.isArray(config?.targets)
    ? config.targets
        .map((target, index) => toTarget(target, index, answerKey))
        .filter((target) => target.text || target.imageSrc)
    : fallbackData.targets.map((target, index) => ({
        id: String(target.id || `target-${index + 1}`),
        text: preserveText(target.label || target.text),
        imageSrc: getImageSrc(target),
        imageAlt: getImageAlt(target),
        correctItemId: '',
        showText: true,
      })).filter((target) => target.text || target.imageSrc);

  return {
    title: normalizeText(config?.title || fallbackData.title || 'Part 1.'),
    prompt: normalizeText(config?.prompt || fallbackData.prompt || 'Match the items.'),
    helperText: normalizeText(config?.helperText || config?.subtitle || ''),
    attemptsAllowed: Number(config?.attemptsAllowed || config?.attempts || 2),
    items,
    targets,
  };
}

function buildFallbackTaskKey(taskId, data) {
  if (taskId) return taskId;

  const title = normalizeText(data?.title || data?.prompt || 'matching-dragdrop-task');
  const targetsText = (data?.targets || [])
    .map((target) => `${target.id}:${target.text}:${target.imageSrc}`)
    .join('|');

  return `${title}:${targetsText}`;
}

function getStorageKey(taskKey) {
  const { courseId, lessonId, pageId } = getRouteContext();

  return `lms-matching-dragdrop:${courseId}:${lessonId}:${pageId}:${taskKey}`;
}

function loadSavedMatchingState(taskKey) {
  if (!taskKey) return null;

  return loadLocalTaskState(getStorageKey(taskKey), null);
}

function saveSavedMatchingState(taskKey, state) {
  if (!taskKey) return;

  saveLocalTaskState(getStorageKey(taskKey), state);
}

function getFeedbackFromResult(result) {
  if (!result) return '';

  const feedback = result.feedback || '';

  if (typeof result.score === 'number' && typeof result.maxScore === 'number') {
    return `${feedback} (${result.score}/${result.maxScore})`;
  }

  return feedback;
}

async function submitMatchingToBackend(payload) {
  const endpoint = `${API_BASE_URL}/api/activity-attempts`;

  console.log('[MatchingDragdrop] Submit endpoint:', endpoint);
  console.log('[MatchingDragdrop] Submit payload:', payload);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  console.log('[MatchingDragdrop] Response status:', response.status);
  console.log('[MatchingDragdrop] Response text:', text);

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.feedback ||
      data?.error?.message ||
      text ||
      `API error ${response.status}`,
    );
  }

  return data;
}

function getSolvedFromBackend(result) {
  return result?.isCorrect === true;
}

function getCanCheck(attemptsUsed, attemptsAllowed, solved) {
  return attemptsUsed < attemptsAllowed || solved;
}

function MatchingItemContent({ item, classNamePrefix }) {
  const shouldShowText = item.text && item.showText !== false;

  return (
    <>
      {item.imageSrc ? (
        <img
          className={`${classNamePrefix}-image`}
          src={item.imageSrc}
          alt={item.imageAlt || item.text || ''}
          draggable={false}
        />
      ) : null}

      {shouldShowText ? (
        <span className={`${classNamePrefix}-text`}>
          {item.text}
        </span>
      ) : null}
    </>
  );
}

function MatchingTargetContent({ target }) {
  const shouldShowText = target.text && target.showText !== false;

  return (
    <>
      {target.imageSrc ? (
        <img
          className="matching-rule-definition-image"
          src={target.imageSrc}
          alt={target.imageAlt || target.text || ''}
          draggable={false}
        />
      ) : null}

      {shouldShowText ? (
        <span className="matching-rule-definition-text">
          {target.text}
        </span>
      ) : null}
    </>
  );
}

export default function MatchingDragdropTask({
  task,
  pageInstance,
  onPrevTask,
  onNextTask,
}) {
  const taskId = getTaskId(task);

  const fallbackData = useMemo(() => getMatchingData(task), [task]);

  const config = useMemo(
    () => getTaskRendererConfig(pageInstance, task),
    [pageInstance, task],
  );

  const data = useMemo(
    () => buildDataFromConfig(config, fallbackData),
    [config, fallbackData],
  );

  const taskKey = useMemo(() => {
    return buildFallbackTaskKey(taskId, data);
  }, [taskId, data]);

  const [assignments, setAssignments] = useState({});
  const [selectedItemId, setSelectedItemId] = useState('');
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [checkResult, setCheckResult] = useState({});
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendResult, setBackendResult] = useState(null);

  useEffect(() => {
    const saved = loadSavedMatchingState(taskKey);

    setAssignments(saved?.assignments || {});
    setSelectedItemId('');
    setAttemptsUsed(saved?.attemptsUsed || 0);
    setCheckResult(saved?.checkResult || {});
    setFeedback(saved?.feedback || '');
    setBackendResult(saved?.backendResult || null);
  }, [taskKey]);

  function saveCurrentState(nextState) {
    saveSavedMatchingState(taskKey, {
      assignments,
      attemptsUsed,
      checkResult,
      feedback,
      backendResult,
      ...nextState,
    });
  }

  const assignedItemIds = useMemo(() => {
    return new Set(Object.values(assignments).filter(Boolean));
  }, [assignments]);

  const availableItems = data.items.filter((item) => !assignedItemIds.has(item.id));

  const solved = getSolvedFromBackend(backendResult);
  const canCheck = getCanCheck(attemptsUsed, data.attemptsAllowed, solved);

  function findItem(itemId) {
    return data.items.find((item) => item.id === itemId) || null;
  }

  function clearResult(nextAssignments = assignments) {
    setCheckResult({});
    setFeedback('');
    setBackendResult(null);

    saveCurrentState({
      assignments: nextAssignments,
      checkResult: {},
      feedback: '',
      backendResult: null,
    });
  }

  function placeItem(targetId, itemId) {
    if (!targetId || !itemId || isSubmitting) return;

    const next = { ...assignments };

    Object.entries(next).forEach(([existingTargetId, existingItemId]) => {
      if (existingItemId === itemId) {
        delete next[existingTargetId];
      }
    });

    next[targetId] = itemId;

    setAssignments(next);
    setSelectedItemId('');
    clearResult(next);
  }

  function removePlacement(targetId) {
    if (isSubmitting) return;

    const next = { ...assignments };
    delete next[targetId];

    setAssignments(next);
    clearResult(next);
  }

  function handleDragStart(event, itemId) {
    event.dataTransfer.setData('application/x-lms-item', itemId);
    event.dataTransfer.setData('text/plain', itemId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(event, targetId) {
    event.preventDefault();

    const itemId =
      event.dataTransfer.getData('application/x-lms-item') ||
      event.dataTransfer.getData('text/plain');

    placeItem(targetId, itemId);
  }

  function handleTargetClick(targetId) {
    if (!selectedItemId) return;
    placeItem(targetId, selectedItemId);
  }

  function reset() {
    const nextState = {
      assignments: {},
      attemptsUsed: 0,
      checkResult: {},
      feedback: '',
      backendResult: null,
    };

    setAssignments({});
    setSelectedItemId('');
    setAttemptsUsed(0);
    setCheckResult({});
    setFeedback('');
    setBackendResult(null);
    saveCurrentState(nextState);
  }

  async function check() {
    const filledCount = data.targets.filter((target) => assignments[target.id]).length;

    if (filledCount < data.targets.length) {
      const nextFeedback = `Please complete all matches first. ${filledCount}/${data.targets.length} done.`;

      setFeedback(nextFeedback);
      saveCurrentState({ feedback: nextFeedback });
      return;
    }

    const { courseId, lessonId, pageId } = getRouteContext();

    const payload = {
      sessionId: getSessionId(),
      userId: getUserId(),
      courseId,
      lessonId,
      pageId,
      taskId: taskId || taskKey,
      activityType: 'matching-dragdrop',
      answer: {
        assignments,
      },
    };

    setIsSubmitting(true);
    setFeedback('Checking...');

    try {
      const responseData = await submitMatchingToBackend(payload);
      const gradingResult = responseData?.result || responseData;
      const nextFeedback = getFeedbackFromResult(gradingResult);
      const targetResults = gradingResult?.details?.targetResults || {};
      const nextAttemptsUsed = Math.min(attemptsUsed + 1, data.attemptsAllowed);

      setBackendResult(gradingResult);
      setCheckResult(targetResults);
      setAttemptsUsed(nextAttemptsUsed);
      setFeedback(nextFeedback);

      saveCurrentState({
        assignments,
        attemptsUsed: nextAttemptsUsed,
        checkResult: targetResults,
        feedback: nextFeedback,
        backendResult: gradingResult,
      });
    } catch (error) {
      console.error('[MatchingDragdropTask] Backend grading failed:', error);

      const errorMessage = error?.message || 'Cannot connect to backend grading.';

      setFeedback(errorMessage);
      saveCurrentState({ feedback: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <LmsActivityFrame
      title={data.title || data.prompt}
      onPrevTask={onPrevTask}
      onNextTask={onNextTask}
      onCheck={check}
      isCheckDisabled={!canCheck || isSubmitting}
      isCheckLoading={isSubmitting}
      onReset={reset}
      isResetDisabled={isSubmitting}
    >
      <article className="matching-rule-task">
        <div className="matching-rule-card">
          <header className="matching-rule-header">
            <h1>
              <span className="matching-rule-info">i</span>
              {data.title}
            </h1>

            <p>{data.prompt}</p>

            {data.helperText ? <p>{data.helperText}</p> : null}
          </header>

          <div className="matching-rule-workspace">
            <section className="matching-rule-bank" aria-label="Draggable answers">
              {availableItems.length > 0 ? (
                availableItems.map((item) => (
                  <button
                    key={`${taskKey}:${item.id}`}
                    type="button"
                    draggable={!isSubmitting}
                    className={`matching-rule-item ${selectedItemId === item.id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedItemId(item.id)}
                    onDragStart={(event) => handleDragStart(event, item.id)}
                    disabled={isSubmitting}
                  >
                    <MatchingItemContent
                      item={item}
                      classNamePrefix="matching-rule-item-content"
                    />
                  </button>
                ))
              ) : (
                <div className="matching-rule-empty-bank">
                  All names have been placed.
                </div>
              )}
            </section>

            <section className="matching-rule-table" aria-label="Drop targets">
              {data.targets.map((target) => {
                const assignedItem = findItem(assignments[target.id]);
                const result = checkResult[target.id];

                let resultClass = '';

                if (result === true) resultClass = 'is-correct';
                if (result === false) resultClass = 'is-wrong';

                return (
                  <div
                    key={`${taskKey}:${target.id}`}
                    className={`matching-rule-row ${resultClass}`}
                  >
                    <div
                      className={`matching-rule-slot ${assignedItem ? 'is-filled' : ''}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleDrop(event, target.id)}
                      onClick={() => handleTargetClick(target.id)}
                    >
                      {assignedItem ? (
                        <button
                          type="button"
                          draggable={!isSubmitting}
                          className="matching-rule-placed-item"
                          onDragStart={(event) => handleDragStart(event, assignedItem.id)}
                          onClick={(event) => {
                            event.stopPropagation();
                            removePlacement(target.id);
                          }}
                          disabled={isSubmitting}
                          title="Click to remove"
                        >
                          <MatchingItemContent
                            item={assignedItem}
                            classNamePrefix="matching-rule-placed-item-content"
                          />
                        </button>
                      ) : (
                        <span className="matching-rule-placeholder">
                          Drop here
                        </span>
                      )}
                    </div>

                    <div className="matching-rule-definition">
                      <MatchingTargetContent target={target} />
                    </div>
                  </div>
                );
              })}
            </section>
          </div>

          {feedback ? (
            <div
              className={`matching-rule-feedback ${
                backendResult?.isCorrect ? 'is-success' : 'is-error'
              }`}
            >
              <span className="matching-rule-feedback-icon">
                {backendResult?.isCorrect ? '✓' : 'i'}
              </span>
              {feedback}
            </div>
          ) : null}
        </div>
      </article>
    </LmsActivityFrame>
  );
}