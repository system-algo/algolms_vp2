import React, { useEffect, useMemo, useState } from 'react';
import '../components/lms-activity-frame.css';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const STYLE_ID = 'category-dragdrop-task-inline-style';

const CATEGORY_DRAGDROP_STYLE = `
.category-dragdrop-stage {
  position: relative;
  width: 100vw;
  min-height: calc(100vh - 130px);
  margin-left: calc(50% - 50vw);
  margin-top: -4px;
  padding: 120px 0 90px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #8b3ff2 0%, #7b2fe6 100%);
  overflow: hidden;
}

.category-dragdrop-card-shell {
  position: relative;
  width: min(1180px, calc(100vw - 280px));
  min-height: 520px;
  margin: 0 auto;
  padding: 38px 42px 38px;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 12px;
  color: #131827;
}


.category-dragdrop-side-button {
  position: fixed;
  top: 60%;
  transform: translateY(-50%);
  z-index: 20;
  width: 58px;
  height: 66px;
  border: 0;
  border-radius: 13px;
  background: #ffdb22;
  color: #172033;
  font-size: 54px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-dragdrop-side-left {
  left: 8px;
}

.category-dragdrop-side-right {
  right: 8px;
}

.category-dragdrop-header {
  margin-bottom: 28px;
}

.category-dragdrop-part-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.category-dragdrop-info-icon {
  width: 21px;
  height: 21px;
  border-radius: 999px;
  background: #8b3ff2;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  line-height: 21px;
  text-align: center;
  font-family: Arial, sans-serif;
  flex: 0 0 auto;
}

.category-dragdrop-part-title {
  color: #8b3ff2;
  font-size: 19px;
  font-weight: 800;
}

.category-dragdrop-title {
  max-width: 940px;
  font-size: 24px;
  line-height: 1.25;
  font-weight: 800;
  color: #111827;
}

.category-dragdrop-helper {
  margin-top: 10px;
  font-size: 17px;
  line-height: 1.35;
  color: #111827;
  font-weight: 700;
}

.category-dragdrop-reference {
  margin-top: 14px;
  margin-bottom: 24px;
}

.category-dragdrop-reference-image {
  display: block;
  max-width: min(520px, 100%);
  width: auto;
  height: auto;
  border-radius: 6px;
  user-select: none;
  pointer-events: none;
}

.category-dragdrop-pool {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 28px;
  row-gap: 18px;
  margin-bottom: 34px;
  align-items: start;
}

.category-dragdrop-card {
  min-height: 68px;
  height: auto;
  padding: 13px 22px;
  border: 2px solid #cfd5dd;
  background: #ffffff;
  border-radius: 5px;
  font-size: 18px;
  line-height: 1.28;
  color: #1f2937;
  box-sizing: border-box;
  cursor: grab;
  display: flex;
  align-items: center;
  user-select: none;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.category-dragdrop-card:active {
  cursor: grabbing;
}

.category-dragdrop-card:hover {
  border-color: #8b3ff2;
}

.category-dragdrop-card-image-card {
  min-height: 98px;
  padding: 10px;
  justify-content: center;
  align-items: center;
}

.category-dragdrop-card-image {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  pointer-events: none;
  user-select: none;
}

.category-dragdrop-card-placeholder {
  background: #eef1f4;
  color: transparent;
  border-color: #cfd5dd;
  box-shadow: none;
  cursor: default;
}

.category-dragdrop-card-placeholder .category-dragdrop-card-image {
  opacity: 0;
}

.category-dragdrop-card-dragging {
  opacity: 0.45;
}

.category-dragdrop-card-correct {
  border-color: #22c55e;
  background: #f0fdf4;
}

.category-dragdrop-card-wrong {
  border-color: #ef4444;
  background: #fef2f2;
}

.category-dragdrop-divider {
  width: 100%;
  height: 1px;
  background: #d9dde3;
  margin-bottom: 30px;
}

.category-dragdrop-categories {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 24px;
}

.category-dragdrop-category {
  min-width: 0;
}

.category-dragdrop-category-title {
  font-size: 18px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 16px;
}

.category-dragdrop-dropzone {
  min-height: 150px;
  background: #eef0f3;
  border-radius: 7px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
}

.category-dragdrop-dropzone:hover {
  background: #e8ebef;
}

.category-dragdrop-dropzone .category-dragdrop-card {
  width: 100%;
  background: #ffffff;
}

.category-dragdrop-missing {
  font-size: 17px;
  line-height: 1.35;
  color: #111827;
}

.category-dragdrop-feedback {
  margin-top: 24px;
  padding: 14px 18px;
  border-radius: 12px;
  background: #ffffff;
  color: #2d1464;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.35;
  border: 1px solid #d0d5dd;
}

.category-dragdrop-feedback.is-success {
  color: #027a48;
  border-color: #22c55e;
  background: #f0fdf4;
}

.category-dragdrop-feedback.is-error {
  color: #b42318;
  border-color: #ef4444;
  background: #fef2f2;
}

@media (max-width: 1100px) {
  .category-dragdrop-card-shell {
    width: calc(100vw - 120px);
  }

  .category-dragdrop-pool {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .category-dragdrop-stage {
    padding-top: 90px;
  }

  .category-dragdrop-card-shell {
    width: calc(100vw - 48px);
    padding: 28px 26px;
  }

  .category-dragdrop-pool {
    grid-template-columns: 1fr;
    column-gap: 0;
  }

  .category-dragdrop-categories {
    grid-template-columns: 1fr;
    row-gap: 22px;
  }

  .category-dragdrop-actions {
    right: 12px;
  }

  .category-dragdrop-attempt {
    display: none;
  }

  .category-dragdrop-title {
    font-size: 21px;
  }
}
`;

function useInlineCategoryDragdropStyle() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CATEGORY_DRAGDROP_STYLE;
    document.head.appendChild(style);
  }, []);
}

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

function hasCategoryData(data) {
  return (
    data &&
    Array.isArray(data.items) &&
    data.items.length > 0 &&
    Array.isArray(data.categories) &&
    data.categories.length > 0
  );
}

function getDataFromTask(task) {
  return (
    task?.categoryDragdrop ||
    task?.categoryDragDrop ||
    task?.activity ||
    null
  );
}

function getManualMapUrl() {
  const { courseId, lessonId, pageId } = getRouteContext();

  if (!courseId || !lessonId || !pageId) return '';

  return `/manual-activity-maps/${encodeURIComponent(courseId)}/${encodeURIComponent(
    lessonId,
  )}/${encodeURIComponent(pageId)}.activity-map.json`;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `item-${index + 1}`,
        text: item,
        image: '',
        alt: item,
        correctCategoryId: '',
        isExtra: false,
      };
    }

    return {
      ...item,
      id: String(item.id || item.key || `item-${index + 1}`),
      text: item.text || item.title || item.label || item.value || '',
      image: item.image || item.img || item.src || '',
      alt:
        item.alt ||
        item.text ||
        item.title ||
        item.label ||
        item.value ||
        `Item ${index + 1}`,
      correctCategoryId:
        item.correctCategoryId ||
        item.correctCategory ||
        item.categoryId ||
        item.answer ||
        '',
      isExtra: Boolean(item.isExtra),
    };
  });
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return [];

  return categories.map((category, index) => {
    if (typeof category === 'string') {
      return {
        id: `category-${index + 1}`,
        title: category,
      };
    }

    return {
      ...category,
      id: String(category.id || category.key || `category-${index + 1}`),
      title: category.title || category.text || category.label || '',
    };
  });
}

function buildCategoryAssignments(placements) {
  return Object.entries(placements).reduce((acc, [itemId, categoryId]) => {
    if (categoryId) {
      acc[itemId] = categoryId;
    }

    return acc;
  }, {});
}

function getFeedbackFromResult(result) {
  if (!result) return '';

  const feedback = result.feedback || '';

  if (typeof result.score === 'number' && typeof result.maxScore === 'number') {
    return `${feedback} (${result.score}/${result.maxScore})`;
  }

  return feedback;
}

async function submitCategoryDragdropToBackend(payload) {
  const endpoint = `${API_BASE_URL}/api/activity-attempts`;

  console.log('[CategoryDragdrop] Submit endpoint:', endpoint);
  console.log('[CategoryDragdrop] Submit payload:', payload);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  console.log('[CategoryDragdrop] Response status:', response.status);
  console.log('[CategoryDragdrop] Response text:', text);

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

export default function CategoryDragdropTask(props) {
  useInlineCategoryDragdropStyle();

  const {
    task,
    onPrevTask,
    onNextTask,
  } = props;

  const [manualData, setManualData] = useState(null);
  const [manualTitle, setManualTitle] = useState('');
  const [placements, setPlacements] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const [checkResult, setCheckResult] = useState({});
  const [feedback, setFeedback] = useState('');
  const [backendResult, setBackendResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inlineData = getDataFromTask(task);
  const taskId = getTaskId(task);

  useEffect(() => {
    if (hasCategoryData(inlineData)) return;

    let cancelled = false;

    async function loadManualMap() {
      try {
        const url = getManualMapUrl();
        if (!url) return;

        const response = await fetch(`${url}?t=${Date.now()}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          console.warn('[CategoryDragdropTask] Cannot load manual map:', url);
          return;
        }

        const map = await response.json();
        const tasks = map?.tasks || {};

        let taskConfig = taskId ? tasks[taskId] : null;

        if (!taskConfig) {
          taskConfig = Object.values(tasks).find((item) => {
            const type = String(item?.selectedType || '').toLowerCase();
            return (
              type === 'category-dragdrop' &&
              (item?.categoryDragdrop || item?.categoryDragDrop)
            );
          });
        }

        const data =
          taskConfig?.categoryDragdrop ||
          taskConfig?.categoryDragDrop ||
          null;

        if (!cancelled) {
          setManualData(data);
          setManualTitle(taskConfig?.title || '');
        }
      } catch (error) {
        console.warn('[CategoryDragdropTask] Failed to load manual map:', error);
      }
    }

    loadManualMap();

    return () => {
      cancelled = true;
    };
  }, [inlineData, taskId]);

  const data = hasCategoryData(inlineData)
    ? inlineData
    : manualData || inlineData || {};

  const title = data?.title || manualTitle || task?.title || 'Part 1.';
  const partTitle = data?.partTitle || 'Part 1.';
  const helperText = data?.helperText || task?.helperText || '';
  const attempt = data?.attempt || 'Attempt: 1/2';

  const referenceImage =
    data?.referenceImage ||
    data?.sampleImage ||
    data?.htmlImage ||
    data?.image ||
    '';

  const items = useMemo(() => {
    return normalizeItems(data?.items);
  }, [data]);

  const categories = useMemo(() => {
    return normalizeCategories(data?.categories);
  }, [data]);

  useEffect(() => {
    setPlacements((prev) => {
      const next = {};

      items.forEach((item) => {
        next[item.id] = Object.prototype.hasOwnProperty.call(prev, item.id)
          ? prev[item.id]
          : null;
      });

      return next;
    });

    setCheckResult({});
    setFeedback('');
    setBackendResult(null);
  }, [items]);

  function moveItem(itemId, categoryId) {
    setPlacements((prev) => ({
      ...prev,
      [itemId]: categoryId,
    }));

    setCheckResult({});
    setFeedback('');
    setBackendResult(null);
  }

  function resetActivity() {
    const next = {};
    items.forEach((item) => {
      next[item.id] = null;
    });

    setPlacements(next);
    setCheckResult({});
    setFeedback('');
    setBackendResult(null);
  }

  async function checkActivity() {
    if (isSubmitting) return;

    const requiredItems = items.filter((item) => !item.isExtra);
    const placedRequiredCount = requiredItems.filter((item) => placements[item.id]).length;

    if (placedRequiredCount < requiredItems.length) {
      setFeedback(`Please place all correct items first. ${placedRequiredCount}/${requiredItems.length} done.`);
      return;
    }

    const placedExtraItems = items.filter((item) => item.isExtra && placements[item.id]);

    if (placedExtraItems.length) {
      const nextResult = placedExtraItems.reduce((acc, item) => {
        acc[item.id] = false;
        return acc;
      }, {});

      setCheckResult(nextResult);
      setBackendResult({
        isCorrect: false,
      });
      setFeedback('One name is extra. Leave it in the pool.');
      return;
    }

    const { courseId, lessonId, pageId } = getRouteContext();

    const categoryAssignments = buildCategoryAssignments(placements);

    const payload = {
      sessionId: getSessionId(),
      userId: getUserId(),
      courseId,
      lessonId,
      pageId,
      taskId,
      activityType: 'matching-dragdrop',
      answer: {
        categoryAssignments,
      },
    };

    setIsSubmitting(true);
    setFeedback('Checking...');

    try {
      const responseData = await submitCategoryDragdropToBackend(payload);
      const gradingResult = responseData?.result || responseData;
      const categoryResults = gradingResult?.details?.categoryResults || {};
      const nextFeedback = getFeedbackFromResult(gradingResult);

      setBackendResult(gradingResult);
      setCheckResult(categoryResults);
      setFeedback(nextFeedback);
    } catch (error) {
      console.error('[CategoryDragdropTask] Backend grading failed:', error);
      setFeedback(error?.message || 'Cannot connect to backend grading.');
      setBackendResult({
        isCorrect: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDragStart(event, itemId) {
    setDraggingId(itemId);
    event.dataTransfer.setData('text/plain', itemId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDropToCategory(event, categoryId) {
    event.preventDefault();

    const itemId = event.dataTransfer.getData('text/plain');
    if (!itemId) return;

    moveItem(itemId, categoryId);
    setDraggingId(null);
  }

  function handleDropToPool(event) {
    event.preventDefault();

    const itemId = event.dataTransfer.getData('text/plain');
    if (!itemId) return;

    moveItem(itemId, null);
    setDraggingId(null);
  }

  function getItemsForCategory(categoryId) {
    return items.filter((item) => placements[item.id] === categoryId);
  }

  function getCardCheckClass(item) {
    const result = checkResult[item.id];

    if (result === true) return 'category-dragdrop-card-correct';
    if (result === false) return 'category-dragdrop-card-wrong';

    return '';
  }

  function renderCard(item, isPlaceholder = false) {
    return (
      <div
        key={item.id}
        className={[
          'category-dragdrop-card',
          item.image ? 'category-dragdrop-card-image-card' : '',
          isPlaceholder ? 'category-dragdrop-card-placeholder' : '',
          draggingId === item.id ? 'category-dragdrop-card-dragging' : '',
          !isPlaceholder ? getCardCheckClass(item) : '',
        ]
          .filter(Boolean)
          .join(' ')}
        draggable={!isPlaceholder && !isSubmitting}
        onDragStart={(event) => {
          if (!isPlaceholder) handleDragStart(event, item.id);
        }}
        onDragEnd={handleDragEnd}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.alt || item.text || item.id}
            className="category-dragdrop-card-image"
            draggable={false}
          />
        ) : (
          <span>{item.text}</span>
        )}
      </div>
    );
  }

  return (
    <div className="category-dragdrop-stage">
      
      <div className="category-dragdrop-card-shell">
        <div className="lms-frame__floating-actions">
          <button
            type="button"
            className="lms-fab lms-fab--check"
            onClick={checkActivity}
            disabled={isSubmitting}
            title="Check answer"
          >
            {isSubmitting ? (
              <span className="lms-fab-spinner" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="lms-fab lms-fab--reset"
            onClick={resetActivity}
            disabled={isSubmitting}
            title="Reset answer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <polyline points="3 3 3 8 8 8" />
            </svg>
          </button>
        </div>

        {!items.length || !categories.length ? (
          <div className="category-dragdrop-missing">
            <div className="category-dragdrop-part-row">
              <span className="category-dragdrop-info-icon">i</span>
              <span className="category-dragdrop-part-title">{partTitle}</span>
            </div>

            Missing category-dragdrop data. Check that this task has
            categoryDragdrop.items and categoryDragdrop.categories in the manual
            activity map.
          </div>
        ) : (
          <>
            <div className="category-dragdrop-header">
              <div className="category-dragdrop-part-row">
                <span className="category-dragdrop-info-icon">i</span>
                <span className="category-dragdrop-part-title">{partTitle}</span>
              </div>

              {title && <div className="category-dragdrop-title">{title}</div>}

              {helperText && (
                <div className="category-dragdrop-helper">{helperText}</div>
              )}

              {referenceImage && (
                <div className="category-dragdrop-reference">
                  <img
                    src={referenceImage}
                    alt="Reference"
                    className="category-dragdrop-reference-image"
                    draggable={false}
                  />
                </div>
              )}
            </div>

            <div
              className="category-dragdrop-pool"
              onDragOver={handleDragOver}
              onDrop={handleDropToPool}
            >
              {items.map((item) => {
                const isPlaced = placements[item.id] !== null;
                return renderCard(item, isPlaced);
              })}
            </div>

            <div className="category-dragdrop-divider" />

            <div className="category-dragdrop-categories">
              {categories.map((category) => {
                const categoryItems = getItemsForCategory(category.id);

                return (
                  <div key={category.id} className="category-dragdrop-category">
                    <div className="category-dragdrop-category-title">
                      {category.title}
                    </div>

                    <div
                      className="category-dragdrop-dropzone"
                      onDragOver={handleDragOver}
                      onDrop={(event) =>
                        handleDropToCategory(event, category.id)
                      }
                    >
                      {categoryItems.map((item) => renderCard(item))}
                    </div>
                  </div>
                );
              })}
            </div>

            {feedback ? (
              <div
                className={[
                  'category-dragdrop-feedback',
                  backendResult?.isCorrect ? 'is-success' : 'is-error',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {feedback}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}