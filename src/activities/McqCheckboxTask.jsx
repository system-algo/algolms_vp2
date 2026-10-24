import { useEffect, useMemo, useState } from 'react';
import LmsActivityFrame from '../components/LmsActivityFrame.jsx';
import {
  getMcqData,
  loadLocalTaskState,
  saveLocalTaskState,
} from '../lib/taskExtractors.js';
import './McqCheckboxTask.css';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
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

function getTaskIdFromProps({ task, fullTask }) {
  return String(
    fullTask?.id ||
      fullTask?.taskId ||
      fullTask?.taskKey ||
      fullTask?.key ||
      task?.taskId ||
      task?.id ||
      task?.taskKey ||
      task?.key ||
      '',
  ).trim();
}

function getChoiceId(choice) {
  if (typeof choice === 'string') return choice;

  return String(
    choice?.id ||
      choice?.value ||
      choice?.text ||
      choice?.label ||
      choice?.title ||
      choice?.imageSrc ||
      choice?.image ||
      choice?.src ||
      choice?.url ||
      '',
  ).trim();
}

function getChoiceText(choice) {
  if (typeof choice === 'string') return choice;

  return String(
    choice?.text ||
      choice?.label ||
      choice?.title ||
      choice?.caption ||
      '',
  );
}

function getChoiceImage(choice) {
  if (typeof choice === 'string') return '';

  return String(
    choice?.imageSrc ||
      choice?.image ||
      choice?.src ||
      choice?.imageUrl ||
      choice?.url ||
      '',
  );
}

function getChoiceAlt(choice, fallbackText = '') {
  if (typeof choice === 'string') return fallbackText;

  return String(
    choice?.imageAlt ||
      choice?.alt ||
      choice?.ariaLabel ||
      fallbackText ||
      '',
  );
}


function normalizeQuestionImage(image, index) {
  if (typeof image === 'string') {
    return {
      src: image,
      alt: '',
      id: `question-image-${index + 1}`,
    };
  }

  return {
    src: image?.src || image?.imageSrc || image?.image || image?.url || '',
    alt: image?.alt || image?.imageAlt || '',
    id: image?.id || `question-image-${index + 1}`,
  };
}

function normalizeSide(source, fallbackData = {}) {
  const side =
    source?.side ||
    source?.sidebar ||
    source?.sideCard ||
    source?.leftPanel ||
    fallbackData?.side ||
    fallbackData?.sidebar ||
    fallbackData?.sideCard ||
    fallbackData?.leftPanel ||
    null;

  if (!side) return null;

  return {
    title: side.title || '',
    description: side.description || side.text || '',
    code: side.code || side.programCode || side.sourceCode || '',
  };
}

function normalizeManualMcq(manualMcq, fallbackData = {}) {
  if (!manualMcq?.options?.length) return null;

  return {
    ...fallbackData,
    title: manualMcq.title || fallbackData.title || '',
    prompt: manualMcq.prompt || manualMcq.question || fallbackData.prompt || '',
    attempt: manualMcq.attempt || fallbackData.attempt || 'Attempt: 1/2',
    images: manualMcq.images || manualMcq.questionImages || fallbackData.images || [],
    questionHtml: manualMcq.questionHtml || fallbackData.questionHtml || '',
    choices: manualMcq.options || [],
    correctChoices: manualMcq.correctChoices || manualMcq.answerKey || [],
    multiple: manualMcq.multiple ?? false,
    layout: manualMcq.layout || fallbackData.layout || '',
    side: normalizeSide(manualMcq, fallbackData),
  };
}

function buildFallbackTaskKey(taskId, data) {
  if (taskId) return taskId;

  const title = normalizeText(data?.title || 'mcq-checkbox-task');
  const choicesText = (data?.choices || [])
    .map((choice) => getChoiceId(choice))
    .filter(Boolean)
    .join('|');

  return `${title}:${choicesText}`;
}

function getStorageKey(taskKey) {
  const { courseId, lessonId, pageId } = getRouteContext();

  return `lms-mcq-checkbox:${courseId}:${lessonId}:${pageId}:${taskKey}`;
}

function loadSavedMcqState(taskKey) {
  if (!taskKey) return null;
  return loadLocalTaskState(getStorageKey(taskKey), null);
}

function saveSavedMcqState(taskKey, state) {
  if (!taskKey) return;
  saveLocalTaskState(getStorageKey(taskKey), state);
}

async function submitMcqToBackend(payload) {
  const endpoint = `${API_BASE_URL}/api/activity-attempts`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

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

function getFeedbackFromResult(result) {
  if (!result) return '';

  const feedback = result.feedback || '';

  if (typeof result.score === 'number' && typeof result.maxScore === 'number') {
    return `${feedback} (${result.score}/${result.maxScore})`;
  }

  return feedback;
}

function getStatusClass(result, status) {
  if (result?.isCorrect === true) return 'is-correct';
  if (result?.isCorrect === false) return 'is-incorrect';
  if (status) return 'is-neutral';
  return '';
}

function getFeedbackTitle(result, isSubmitting) {
  if (isSubmitting) return 'Checking your answer...';
  if (result?.isCorrect === true) return 'Correct!';
  if (result?.isCorrect === false) return 'Not quite right';
  return 'Please check your answer';
}

function getFeedbackIcon(result, isSubmitting) {
  if (isSubmitting) return '…';
  if (result?.isCorrect === true) return '✓';
  if (result?.isCorrect === false) return '!';
  return 'i';
}

function McqSideCard({ side }) {
  if (!side?.title && !side?.description && !side?.code) return null;

  return (
    <aside className="mcq-side-card">
      {side?.title ? <h2 className="mcq-side-title">{side.title}</h2> : null}

      {side?.description ? (
        <p className="mcq-side-description">{side.description}</p>
      ) : null}

      {side?.code ? (
        <pre className="mcq-side-code">
          <code>{side.code}</code>
        </pre>
      ) : null}
    </aside>
  );
}

export default function McqCheckboxTask({
  task,
  fullTask,
  pageInstance,
  onPrevTask,
  onNextTask,
}) {
  const taskId = getTaskIdFromProps({ task, fullTask });
  const stateId = task?.stateId || task?.id;

  const taskRenderer = taskId
    ? pageInstance?.taskRenderers?.[taskId]
    : null;

  const stateRenderer =
    stateId && taskRenderer?.states
      ? taskRenderer.states[stateId]
      : null;

  const manualMcq =
    stateRenderer?.mcqCheckbox ||
    stateRenderer?.frameConfig ||
    taskRenderer?.mcqCheckbox ||
    taskRenderer?.frameConfig ||
    fullTask?.mcqCheckbox ||
    fullTask?.frameConfig ||
    task?.mcqCheckbox ||
    task?.frameConfig;

  const capturedTask = useMemo(() => {
    return {
      ...(fullTask || {}),
      ...(task || {}),
      states:
        taskRenderer?.states ||
        fullTask?.states ||
        task?.states ||
        {},
    };
  }, [fullTask, task, taskRenderer]);

  const capturedData = useMemo(() => {
    return getMcqData(capturedTask);
  }, [capturedTask]);

  const extractedData = useMemo(() => {
    if (manualMcq?.options?.length) {
      return normalizeManualMcq(manualMcq, capturedData);
    }

    return getMcqData(fullTask || task);
  }, [manualMcq, capturedData, fullTask, task]);

  const data = useMemo(() => {
    const rawImages =
      extractedData?.images?.length
        ? extractedData.images
        : capturedData?.images || [];

    return {
      ...capturedData,
      ...extractedData,
      images: rawImages
        .map(normalizeQuestionImage)
        .filter((image) => image.src),
      title: extractedData?.title || capturedData?.title || '',
      prompt: extractedData?.prompt || capturedData?.prompt || '',
      attempt: extractedData?.attempt || capturedData?.attempt || 'Attempt: 1/2',
      questionHtml: extractedData?.questionHtml || capturedData?.questionHtml || '',
      choices:
        extractedData?.choices?.length
          ? extractedData.choices
          : capturedData?.choices || [],
      correctChoices:
        extractedData?.correctChoices?.length
          ? extractedData.correctChoices
          : capturedData?.correctChoices || [],
      multiple: extractedData?.multiple ?? capturedData?.multiple ?? false,
      layout: extractedData?.layout || capturedData?.layout || '',
      side:
        normalizeSide(extractedData, capturedData) ||
        normalizeSide(fullTask, task) ||
        normalizeSide(task, fullTask),
    };
  }, [capturedData, extractedData, fullTask, task]);

  const taskKey = useMemo(() => {
    return buildFallbackTaskKey(taskId, data);
  }, [taskId, data]);

  const hasImageChoices = useMemo(() => {
    return (
      data.layout === 'image-grid' ||
      (data.choices || []).some((choice) => Boolean(getChoiceImage(choice)))
    );
  }, [data.layout, data.choices]);

  const hasSide = Boolean(
    data.side?.title ||
    data.side?.description ||
    data.side?.code,
  );

  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendResult, setBackendResult] = useState(null);

  useEffect(() => {
    const saved = loadSavedMcqState(taskKey);

    setSelected(saved?.selected || []);
    setStatus(saved?.status || '');
    setBackendResult(saved?.backendResult || null);
  }, [taskKey]);

  function saveCurrentState(
    nextSelected,
    nextStatus,
    nextBackendResult = backendResult,
  ) {
    saveSavedMcqState(taskKey, {
      selected: nextSelected,
      status: nextStatus,
      backendResult: nextBackendResult,
    });
  }

  function toggleChoice(choice) {
    const choiceId = getChoiceId(choice);

    if (!choiceId || isSubmitting) return;

    const nextSelected = data.multiple
      ? selected.includes(choiceId)
        ? selected.filter((item) => item !== choiceId)
        : [...selected, choiceId]
      : [choiceId];

    setSelected(nextSelected);
    setStatus('');
    setBackendResult(null);
    saveCurrentState(nextSelected, '', null);
  }

  async function checkAnswer() {
    if (!selected.length) {
      const nextStatus = data.multiple
        ? 'Choose at least one answer before checking.'
        : 'Choose an answer before checking.';

      setStatus(nextStatus);
      saveCurrentState(selected, nextStatus, backendResult);
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
      activityType: 'mcq-checkbox',
      answer: {
        selectedOptionIds: selected,
      },
    };

    setIsSubmitting(true);
    setStatus('Checking...');

    try {
      const responseData = await submitMcqToBackend(payload);
      const gradingResult = responseData?.result || responseData;
      const nextStatus =
        gradingResult?.isCorrect === true
          ? getFeedbackFromResult(gradingResult) || 'Your answer is correct.'
          : 'Some selected answers are incorrect. Try again.';

      setBackendResult(gradingResult);
      setStatus(nextStatus);
      saveCurrentState(selected, nextStatus, gradingResult);
    } catch (error) {
      console.error('[McqCheckboxTask] Backend grading failed:', error);

      const errorMessage =
        error?.message ||
        'Cannot connect to backend grading. Please try again.';

      setStatus(errorMessage);
      saveCurrentState(selected, errorMessage, backendResult);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetAnswer() {
    setSelected([]);
    setStatus('');
    setBackendResult(null);
    saveCurrentState([], '', null);
  }


  const correctOptionIds = Array.isArray(
    backendResult?.details?.correctOptionIds,
  )
    ? backendResult.details.correctOptionIds.map(String)
    : [];

  const hasBackendCheck = correctOptionIds.length > 0;
  const isCorrectResult = backendResult?.isCorrect === true;
  const isIncorrectResult = backendResult?.isCorrect === false;
  const hasResult = isCorrectResult || isIncorrectResult;

  const statusClass = getStatusClass(backendResult, status);
  const feedbackTitle = getFeedbackTitle(backendResult, isSubmitting);
  const feedbackIcon = getFeedbackIcon(backendResult, isSubmitting);

  return (
    <LmsActivityFrame
      title={data.title}
      onPrevTask={onPrevTask}
      onNextTask={onNextTask}
      onCheck={checkAnswer}
      isCheckDisabled={isSubmitting || selected.length === 0}
      isCheckLoading={isSubmitting}
      onReset={resetAnswer}
      isResetDisabled={isSubmitting || selected.length === 0}
    >
      <div className={`mcq-layout ${hasSide ? 'has-side' : 'no-side'}`}>
        {hasSide ? <McqSideCard side={data.side} /> : null}

        <article className="mcq-card">
          <header className="mcq-question-header">
            <div>
              <span className="mcq-attempt-badge">{data.attempt}</span>
              <h1 className="mcq-question-title">{data.title}</h1>
            </div>

            <span className="mcq-selection-rule">
              {data.multiple ? 'Select all correct answers' : 'Select one answer'}
            </span>
          </header>

          {data.prompt ? (
            <p className="mcq-question-prompt">{data.prompt}</p>
          ) : null}

          {data.images.length > 0 ? (
            <div className="mcq-question-images">
              {data.images.slice(0, 3).map((image) => (
                <img
                  key={image.id || image.src}
                  src={image.src}
                  alt={image.alt || ''}
                />
              ))}
            </div>
          ) : null}

          {data.questionHtml ? (
            <div
              className="mcq-question-html"
              dangerouslySetInnerHTML={{ __html: data.questionHtml }}
            />
          ) : null}

          <div
            className={[
              'mcq-choice-list',
              hasImageChoices
                ? 'mcq-choice-list--images'
                : 'mcq-choice-list--text',
            ].join(' ')}
          >
            {data.choices.map((choice) => {
              const choiceId = getChoiceId(choice);
              const choiceText = getChoiceText(choice);
              const choiceImage = getChoiceImage(choice);
              const choiceAlt = getChoiceAlt(choice, choiceText);
              const isSelected = selected.includes(choiceId);

              const isCorrectOption =
                isCorrectResult && isSelected;

              const isWrongOption =
                isIncorrectResult &&
                isSelected &&
                (
                  hasBackendCheck
                    ? !correctOptionIds.includes(choiceId)
                    : true
                );

              const optionClasses = [
                'mcq-choice',
                choiceImage ? 'mcq-choice--image' : 'mcq-choice--text',
                isSelected ? 'is-selected' : '',
                hasResult ? 'is-checked' : '',
                isCorrectOption ? 'is-correct' : '',
                isWrongOption ? 'is-wrong' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={`${taskKey}:${choiceId}`}
                  type="button"
                  className={optionClasses}
                  onClick={() => toggleChoice(choice)}
                  disabled={isSubmitting}
                  aria-pressed={isSelected}
                >
                  <span
                    className={[
                      'mcq-choice-control',
                      data.multiple
                        ? 'mcq-choice-control--checkbox'
                        : 'mcq-choice-control--radio',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {isCorrectOption ? '✓' : isWrongOption ? '×' : isSelected ? '✓' : ''}
                  </span>

                  <span className="mcq-choice-body">
                    {choiceImage ? (
                      <img
                        className="mcq-choice-image"
                        src={choiceImage}
                        alt={choiceAlt}
                      />
                    ) : null}

                    {choiceText ? (
                      <span className="mcq-choice-text">
                        {choiceText}
                      </span>
                    ) : null}
                  </span>

                  {isCorrectOption ? (
                    <span className="mcq-choice-result-label mcq-choice-result-label--correct">
                      Correct
                    </span>
                  ) : null}

                  {isWrongOption ? (
                    <span className="mcq-choice-result-label mcq-choice-result-label--wrong">
                      Your answer
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mcq-answer-summary">
            <span>
              {selected.length === 0
                ? 'No answer selected'
                : `${selected.length} answer${selected.length === 1 ? '' : 's'} selected`}
            </span>
          </div>

          {status || isSubmitting ? (
            <div
              className={[
                'mcq-feedback',
                statusClass,
                isSubmitting ? 'is-loading' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="status"
              aria-live="polite"
            >
              <span className="mcq-feedback-icon" aria-hidden="true">
                {feedbackIcon}
              </span>

              <div className="mcq-feedback-content">
                <strong>{feedbackTitle}</strong>
                <p>{status || 'Checking your answer...'}</p>
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </LmsActivityFrame>
  );
}