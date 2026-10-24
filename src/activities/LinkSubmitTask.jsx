import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_CONFIG = {
  title: 'Submit your answer in the field below',
  description: '',
  requirementTitle: 'Submit your answer',
  requirementBody: 'Submit your answer',
  teacherText: 'Tasks will be checked by the teacher',
  placeholder: '',
  allowMultiple: true,
  panelDefaultOpen: true,
  requirementDefaultOpen: true,
};

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toLines(value, fallback = '') {
  const source = value ?? fallback;

  if (Array.isArray(source)) {
    return source
      .flatMap((item) => String(item || '').split(/\r?\n/))
      .map(normalizeText)
      .filter(Boolean);
  }

  return String(source || '')
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(Boolean);
}

function getBool(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function getCurrentRouteKey() {
  try {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('course') || 'catalog';
    const lessonId = params.get('lesson') || 'course-home';
    const pageId = params.get('page') || 'page';

    return `${courseId}:${lessonId}:${pageId}`;
  } catch {
    return 'catalog:course-home:page';
  }
}

function getManualActivityMapUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('course');
    const lessonId = params.get('lesson');
    const pageId = params.get('page');

    if (!courseId || !lessonId || !pageId) return '';

    return `/manual-activity-maps/${encodeURIComponent(courseId)}/${encodeURIComponent(
      lessonId
    )}/${encodeURIComponent(pageId)}.activity-map.json`;
  } catch {
    return '';
  }
}

function getTaskId(task) {
  return task?.id || task?.taskId || task?.key || task?.title || 'link-submit-task';
}

function getLocalStorageKey(task) {
  return `lms-replica:${getCurrentRouteKey()}:${getTaskId(task)}:link-submit`;
}

function safeParseArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getLinkSubmitConfig(task) {
  const config =
    task?.linkSubmit ||
    task?.renderer?.linkSubmit ||
    task?.frameConfig?.linkSubmit ||
    task?.renderer?.frameConfig?.linkSubmit ||
    {};

  const title = normalizeText(config.title) || DEFAULT_CONFIG.title;
  const descriptionLines = toLines(config.description, DEFAULT_CONFIG.description);

  const requirementTitle =
    normalizeText(config.requirementTitle) ||
    normalizeText(config.taskLabel) ||
    normalizeText(task?.title) ||
    DEFAULT_CONFIG.requirementTitle;

  const requirementBodyLines = toLines(
    config.requirementBody || config.requirementText,
    requirementTitle || DEFAULT_CONFIG.requirementBody
  );

  const panelTitle =
    normalizeText(config.panelTitle) ||
    requirementTitle;

  const requirements = Array.isArray(config.requirements) && config.requirements.length
    ? config.requirements.map((item) => ({
        title: normalizeText(item?.title) || requirementTitle,
        bodyLines: toLines(item?.body || item?.text || item?.description, ''),
        defaultOpen: getBool(item?.defaultOpen, false),
      }))
    : [
        {
          title: requirementTitle,
          bodyLines: requirementBodyLines,
          defaultOpen: getBool(
            config.requirementDefaultOpen,
            DEFAULT_CONFIG.requirementDefaultOpen
          ),
        },
      ];

  return {
    title,
    descriptionLines,
    panelTitle,
    requirementTitle,
    requirementBodyLines,
    requirements,
    teacherText: normalizeText(config.teacherText) || DEFAULT_CONFIG.teacherText,
    placeholder: config.placeholder ?? DEFAULT_CONFIG.placeholder,
    allowMultiple: getBool(config.allowMultiple, DEFAULT_CONFIG.allowMultiple),
    panelDefaultOpen: getBool(config.panelDefaultOpen, DEFAULT_CONFIG.panelDefaultOpen),
    requirementDefaultOpen: getBool(
      config.requirementDefaultOpen,
      DEFAULT_CONFIG.requirementDefaultOpen
    ),
  };
}

function isValidSubmittedLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function PaperPlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.8 11.2 20.1 4.4c.6-.3 1.2.3.9.9l-6.7 16.3c-.3.7-1.3.6-1.5-.1l-1.7-6.2-6.2-1.7c-.7-.2-.8-1.2-.1-1.5Zm7.6 2 1.4 5.1 4.8-11.8L5.8 11.3l5.1 1.4 4.4-4.4-3.9 4.9Z" />
    </svg>
  );
}

export default function LinkSubmitTask({
  task,
  onTaskCompleted,
}) {
  const taskId = useMemo(() => getTaskId(task), [task]);
  const manualMapUrl = useMemo(() => getManualActivityMapUrl(), []);

  const [manualLinkSubmit, setManualLinkSubmit] = useState(null);

  useEffect(() => {
    if (!manualMapUrl || !taskId) return;

    let cancelled = false;

    fetch(manualMapUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((manualMap) => {
        if (cancelled) return;

        const config = manualMap?.tasks?.[taskId]?.linkSubmit || null;
        setManualLinkSubmit(config);
      })
      .catch(() => {
        if (!cancelled) {
          setManualLinkSubmit(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [manualMapUrl, taskId]);

  const taskWithManualConfig = useMemo(() => {
    if (!manualLinkSubmit) return task;

    return {
      ...task,
      linkSubmit: manualLinkSubmit,
    };
  }, [task, manualLinkSubmit]);

  const data = useMemo(
    () => getLinkSubmitConfig(taskWithManualConfig),
    [taskWithManualConfig]
  );

  const storageKey = useMemo(
    () => getLocalStorageKey(taskWithManualConfig),
    [taskWithManualConfig]
  );

  const answersKey = `${storageKey}:answers`;
  const draftKey = `${storageKey}:draft`;
  const panelKey = `${storageKey}:panel-open`;
  const requirementOpenKey = `${storageKey}:requirement-open`;

  const [submitError, setSubmitError] = useState('');

  const [inputValue, setInputValue] = useState(() => {
    try {
      return localStorage.getItem(draftKey) || '';
    } catch {
      return '';
    }
  });

  const [savedValues, setSavedValues] = useState(() => {
    try {
      const savedArray = safeParseArray(localStorage.getItem(answersKey));

      if (savedArray.length) return savedArray;

      const legacySubmitted = localStorage.getItem(`${storageKey}:submitted`) === '1';
      const legacyValue = localStorage.getItem(storageKey) || '';

      if (legacySubmitted && legacyValue.trim()) {
        const migrated = [legacyValue.trim()];
        localStorage.setItem(answersKey, JSON.stringify(migrated));
        localStorage.removeItem(storageKey);
        localStorage.removeItem(`${storageKey}:submitted`);
        return migrated;
      }

      return [];
    } catch {
      return [];
    }
  });

  const [taskPanelOpen, setTaskPanelOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(panelKey);
      return saved === null ? true : saved === '1';
    } catch {
      return true;
    }
  });

  const [requirementOpen, setRequirementOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(requirementOpenKey);

      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore localStorage errors
    }

    const initialOpen = {};

    (data.requirements || []).forEach((requirement, index) => {
      initialOpen[index] =
        typeof requirement.defaultOpen === 'boolean'
          ? requirement.defaultOpen
          : data.requirementDefaultOpen;
    });

    return initialOpen;
  });

  useEffect(() => {
    try {
      if (localStorage.getItem(panelKey) === null) {
        setTaskPanelOpen(data.panelDefaultOpen);
      }

      if (localStorage.getItem(requirementOpenKey) === null) {
        setRequirementOpen(data.requirementDefaultOpen);
      }
    } catch {
      setTaskPanelOpen(data.panelDefaultOpen);
      setRequirementOpen(data.requirementDefaultOpen);
    }
  }, [data.panelDefaultOpen, data.requirementDefaultOpen, panelKey, requirementOpenKey]);

  function saveDraft(nextValue) {
    try {
      localStorage.setItem(draftKey, nextValue);
    } catch {
      // ignore localStorage errors
    }
  }

  function saveAnswers(nextValues) {
    setSavedValues(nextValues);

    try {
      localStorage.setItem(answersKey, JSON.stringify(nextValues));
    } catch {
      // ignore localStorage errors
    }
  }

  function handleChange(event) {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    setSubmitError('');
    saveDraft(nextValue);
  }

  function handleSubmit() {
    const nextValue = inputValue.trim();

    if (!nextValue) {
      setSubmitError('Enter a link first.');
      return;
    }

    if (!isValidSubmittedLink(nextValue)) {
      setSubmitError('Enter a valid http:// or https:// link.');
      return;
    }

    const nextValues = data.allowMultiple
      ? [...savedValues, nextValue]
      : [nextValue];

    saveAnswers(nextValues);
    setInputValue('');
    setSubmitError('');
    saveDraft('');

    onTaskCompleted?.({
      completionType: 'submitted',
      needsReview: true,
      feedback: 'Link submitted.',
      metadata: {
        submittedLinks: nextValues,
      },
    });
  }

  function handleRemoveAnswer(indexToRemove) {
    saveAnswers(savedValues.filter((_, index) => index !== indexToRemove));
  }

  function toggleTaskPanel() {
    setTaskPanelOpen((current) => {
      const next = !current;

      try {
        localStorage.setItem(panelKey, next ? '1' : '0');
      } catch {
        // ignore localStorage errors
      }

      return next;
    });
  }

  function openTaskPanel() {
    setTaskPanelOpen(true);

    try {
      localStorage.setItem(panelKey, '1');
    } catch {
      // ignore localStorage errors
    }
  }

  function handleSideSubmit() {
    if (inputValue.trim()) {
      handleSubmit();
    }

    openTaskPanel();
  }

  function handleSideReset() {
    setInputValue('');
    setSavedValues([]);

    try {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(answersKey);
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}:submitted`);
    } catch {
      // ignore localStorage errors
    }
  }

  function toggleRequirementOpen(index) {
    setRequirementOpen((current) => {
      const next = {
        ...current,
        [index]: !current?.[index],
      };

      try {
        localStorage.setItem(requirementOpenKey, JSON.stringify(next));
      } catch {
        // ignore localStorage errors
      }

      return next;
    });
  }

  return (
    <section className={`lsu-stage ${taskPanelOpen ? 'is-panel-open' : ''}`}>
      <style>{styles}</style>

      <button
        type="button"
        className={`lsu-purple-tab ${taskPanelOpen ? 'is-open' : ''}`}
        onClick={toggleTaskPanel}
        aria-label={taskPanelOpen ? 'Close task panel' : 'Open task panel'}
        title={taskPanelOpen ? 'Close task panel' : 'Open task panel'}
      >
        <span className="lsu-purple-tab-line" />
        <span className="lsu-purple-tab-arrow">{taskPanelOpen ? '›' : '‹'}</span>
      </button>

      <div className="lsu-card">
        <div className="lsu-main">
          <h1>{data.title}</h1>

          {data.descriptionLines.length > 0 ? (
            <p>
              {data.descriptionLines.map((line, index) => (
                <React.Fragment key={`${line}-${index}`}>
                  {line}
                  {index < data.descriptionLines.length - 1 ? <br /> : null}
                </React.Fragment>
              ))}
            </p>
          ) : null}

          <div className="lsu-input-row">
            <input
              value={inputValue}
              onChange={handleChange}
              placeholder={data.placeholder}
              aria-label={data.requirementTitle}
              spellCheck={false}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
            />

            <button
              type="button"
              className={`lsu-submit-btn ${inputValue.trim() ? 'is-active' : ''}`}
              onClick={handleSubmit}
              title="Submit"
              aria-label="Submit"
            >
              <PaperPlaneIcon />
            </button>
          </div>

          {submitError ? (
            <div
              role="alert"
              style={{
                marginTop: 8,
                color: '#b42318',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {submitError}
            </div>
          ) : null}

          {savedValues.length > 0 ? (
            <div className="lsu-saved-list">
              {savedValues.map((value, index) => (
                <div className="lsu-saved-row" key={`${value}-${index}`}>
                  <span className="lsu-saved-value">{value}</span>

                  <button
                    type="button"
                    className="lsu-clear-btn"
                    onClick={() => handleRemoveAnswer(index)}
                    title="Remove submitted answer"
                    aria-label="Remove submitted answer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="lsu-side-actions" aria-label={data.teacherText}>
          <button
            type="button"
            className="lsu-side-btn is-check"
            title={data.teacherText}
            aria-label={data.teacherText}
            onClick={handleSideSubmit}
          >
            ✓
          </button>

          <button
            type="button"
            className="lsu-side-btn"
            title="Reset"
            aria-label="Reset"
            onClick={handleSideReset}
          >
            ↻
          </button>
        </div>
      </div>

      <aside className={`lsu-task-panel ${taskPanelOpen ? 'is-open' : ''}`}>
        <div className="lsu-task-panel-header">
          <button
            type="button"
            className="lsu-task-panel-close"
            onClick={toggleTaskPanel}
            aria-label="Close task panel"
            title="Close task panel"
          >
            ×
          </button>

          <div className="lsu-task-panel-title">{data.panelTitle}</div>
        </div>

        <div className="lsu-panel-divider" />

        <div className="lsu-panel-check-title">
          {data.teacherText}
          <span className="lsu-info-icon">i</span>
        </div>

        <div className="lsu-panel-card-list">
          {data.requirements.map((requirement, index) => (
            <div className="lsu-panel-card" key={`${requirement.title}-${index}`}>
              <button
                type="button"
                className="lsu-panel-card-head"
                onClick={() => toggleRequirementOpen(index)}
                aria-expanded={Boolean(requirementOpen[index])}
              >
                <span className="lsu-panel-checkbox" />
                <strong>{requirement.title}</strong>

                {requirement.bodyLines.length > 0 ? (
                  <span className="lsu-panel-chevron">
                    {requirementOpen[index] ? '⌃' : '⌄'}
                  </span>
                ) : (
                  <span />
                )}
              </button>

              {requirementOpen[index] && requirement.bodyLines.length > 0 ? (
                <div className="lsu-panel-card-body">
                  {requirement.bodyLines.map((line, bodyIndex) => (
                    <div className="lsu-panel-body-text" key={`${line}-${bodyIndex}`}>
                      {line}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

const styles = `
.lsu-stage {
  position: relative;
  width: 100vw;
  min-height: calc(100vh - 130px);
  margin-left: calc(50% - 50vw);
  margin-top: -4px;
  padding: clamp(190px, 24vh, 245px) 0 110px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #8b3ff2 0%, #7b2fe6 100%);
  overflow: hidden;
  color: #111827;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.lsu-stage.is-panel-open {
  padding-right: 440px;
}

.lsu-card {
  position: relative;
  width: min(870px, calc(100vw - 520px));
  min-height: 196px;
  margin: 0 auto;
  padding: 31px 30px 30px;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 5px;
  box-shadow: 0 2px 0 rgba(15, 23, 42, 0.04);
  transition: width 0.2s ease, transform 0.2s ease;
}

.lsu-stage.is-panel-open .lsu-card {
  width: min(820px, calc(100vw - 610px));
}

.lsu-main {
  width: 100%;
  padding-right: 10px;
}

.lsu-main h1 {
  margin: 0 0 18px;
  color: #111827;
  font-size: 16px;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.lsu-main p {
  max-width: 800px;
  margin: 0 0 24px;
  color: #111827;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 400;
}

.lsu-panel-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lsu-input-row {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid #e1e5eb;
  border-radius: 5px;
  overflow: hidden;
  background: #ffffff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.lsu-input-row:focus-within {
  border-color: #8b3ff2;
  box-shadow: 0 0 0 2px rgba(139, 63, 242, 0.14);
}

.lsu-input-row input {
  flex: 1;
  height: 36px;
  padding: 0 12px;
  border: none;
  outline: none;
  background: transparent;
  color: #111827;
  font-size: 14px;
  font-family: inherit;
}

.lsu-submit-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0;
  background: #f3effd;
  color: #c4b5f0;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

.lsu-submit-btn svg {
  width: 17px;
  height: 17px;
  fill: currentColor;
}

.lsu-submit-btn.is-active,
.lsu-submit-btn:hover {
  background: #8b3ff2;
  color: #ffffff;
}

.lsu-submit-btn:active {
  transform: scale(0.94);
}

.lsu-saved-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.lsu-saved-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 7px 10px 7px 12px;
  border: 1px solid #e1e5eb;
  border-radius: 5px;
  background: #f1f2f5;
}

.lsu-saved-value {
  flex: 1;
  font-size: 14px;
  color: #374151;
  word-break: break-all;
}

.lsu-clear-btn {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #fee2e2;
  color: #ef4444;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
  line-height: 1;
}

.lsu-clear-btn:hover {
  background: #fca5a5;
}

.lsu-side-actions {
  position: absolute;
  top: 23px;
  right: -13px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 3;
}

.lsu-side-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #8b3ff2;
  border-radius: 8px;
  background: #ffffff;
  color: #b7bed0;
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  transition: color 0.15s ease;
}

.lsu-side-btn:hover {
  color: #8b3ff2;
}

.lsu-purple-tab {
  position: absolute;
  top: 50%;
  right: 0;
  z-index: 8;
  width: 42px;
  height: 94px;
  padding: 0;
  transform: translateY(-50%);
  border: none;
  border-radius: 14px 0 0 14px;
  background: rgba(255, 255, 255, 0.18);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lsu-purple-tab.is-open {
  right: 440px;
}

.lsu-purple-tab-line {
  position: absolute;
  right: 0;
  top: 10px;
  bottom: 10px;
  width: 5px;
  border-radius: 999px;
  background: #ffffff;
}

.lsu-purple-tab-arrow {
  color: #ffffff;
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
}

.lsu-task-panel {
  position: absolute;
  top: 0;
  right: -440px;
  z-index: 7;
  width: 440px;
  min-height: 100%;
  padding: 18px;
  box-sizing: border-box;
  background: #eef0f4;
  color: #111827;
  transition: right 0.2s ease;
  box-shadow: -10px 0 30px rgba(15, 23, 42, 0.15);
}

.lsu-task-panel.is-open {
  right: 0;
}

.lsu-task-panel-header {
  position: relative;
  min-height: 64px;
  padding: 22px 52px 22px 18px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.08);
  box-sizing: border-box;
}

.lsu-task-panel-close {
  position: absolute;
  top: 13px;
  right: 13px;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 999px;
  background: #f1f2f5;
  color: #8b909c;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
  line-height: 1;
}

.lsu-task-panel-title {
  max-width: 330px;
  color: #111827;
  font-size: 20px;
  line-height: 1.22;
  font-weight: 800;
}

.lsu-panel-divider {
  height: 4px;
  margin: 16px 0 18px;
  border-radius: 999px;
  background: #c9cbd2;
}

.lsu-panel-check-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  color: #60646f;
  font-size: 12px;
  line-height: 1.3;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.055em;
}

.lsu-info-icon {
  width: 17px;
  height: 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #8b909c;
  border-radius: 999px;
  color: #8b909c;
  font-size: 11px;
  font-weight: 800;
  text-transform: none;
}

.lsu-panel-card {
  background: #ffffff;
  border-radius: 9px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.lsu-panel-card-head {
  width: 100%;
  min-height: 64px;
  padding: 18px 16px;
  display: grid;
  grid-template-columns: 28px 1fr 24px;
  align-items: center;
  gap: 10px;
  border: none;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.lsu-panel-checkbox {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: #f1f2f5;
  border: 1px solid #e1e3e8;
}

.lsu-panel-card-head strong {
  color: #111827;
  font-size: 15px;
  line-height: 1.25;
  font-weight: 700;
}

.lsu-panel-chevron {
  color: #8b3ff2;
  font-size: 20px;
  font-weight: 900;
  text-align: center;
  line-height: 1;
}

.lsu-panel-card-body {
  padding: 0 16px 24px 54px;
}

.lsu-panel-body-text {
  color: #111827;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 400;
}

@media (max-width: 1200px) {
  .lsu-stage,
  .lsu-stage.is-panel-open {
    padding-right: 0;
  }

  .lsu-card,
  .lsu-stage.is-panel-open .lsu-card {
    width: min(870px, calc(100vw - 220px));
  }

  .lsu-task-panel {
    width: 390px;
    right: -390px;
  }

  .lsu-purple-tab.is-open {
    right: 390px;
  }
}

@media (max-width: 820px) {
  .lsu-stage {
    padding-top: 130px;
  }

  .lsu-card,
  .lsu-stage.is-panel-open .lsu-card {
    width: calc(100vw - 48px);
    padding: 26px 24px 28px;
  }

  .lsu-side-actions {
    right: -8px;
  }

  .lsu-task-panel {
    width: 86vw;
    right: -86vw;
  }

  .lsu-purple-tab.is-open {
    right: 86vw;
  }
}
`;