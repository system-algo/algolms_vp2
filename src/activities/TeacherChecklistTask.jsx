import { useEffect, useMemo, useState } from 'react';

const STYLE_ID = 'teacher-checklist-task-style';

const CSS = `
.teacher-checklist-page {
  width: 100vw;
  min-height: calc(100vh - 80px);
  margin-left: calc(50% - 50vw);
  background: #eef0f5;
  color: #1f2933;
  font-family: Inter, Arial, sans-serif;
}

.teacher-checklist-topbar {
  height: 56px;
  background: #0f1724;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.teacher-checklist-logo {
  position: absolute;
  left: 16px;
  top: 10px;
  width: 34px;
  height: 34px;
  background: #fff;
  color: #0f1724;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 22px;
  clip-path: polygon(0 0, 100% 0, 100% 78%, 60% 78%, 50% 100%, 40% 78%, 0 78%);
}

.teacher-checklist-counter {
  width: 42px;
  height: 42px;
  border: 2px solid rgba(255,255,255,0.45);
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.08);
}

.teacher-checklist-tabs {
  height: 38px;
  background: #fff;
  border-bottom: 1px solid #d9dce4;
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 0 14px;
  position: sticky;
  top: 0;
  z-index: 5;
}

.teacher-checklist-tab {
  height: 38px;
  border: 0;
  background: transparent;
  color: #1f2933;
  font-size: 15px;
  cursor: pointer;
  padding: 0;
  position: relative;
}

.teacher-checklist-tab.is-active {
  color: #7b2fe6;
}

.teacher-checklist-tab.is-active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 8px 8px 0 0;
  background: #7b2fe6;
}

.teacher-checklist-paperclip {
  color: #b9bdc8;
  font-size: 15px;
  transform: rotate(-18deg);
  margin-left: -12px;
}

.teacher-checklist-download {
  margin-left: auto;
  height: 28px;
  border: 0;
  border-radius: 7px;
  padding: 0 17px;
  color: #fff;
  background: #842eea;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(132, 46, 234, 0.22);
}

.teacher-checklist-download:disabled {
  opacity: 0.45;
  cursor: default;
}

.teacher-checklist-content {
  padding: 15px 14px 56px;
}

.teacher-checklist-title-card {
  background: #fff;
  border-radius: 10px;
  min-height: 64px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  margin-bottom: 14px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.teacher-checklist-title {
  margin: 0;
  font-size: 22px;
  line-height: 1.3;
  font-weight: 800;
}

.teacher-checklist-divider {
  height: 3px;
  background: #c4c7ce;
  margin: 0 0 16px;
}

.teacher-checklist-check-note {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #6b7280;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 12px;
}

.teacher-checklist-info {
  width: 18px;
  height: 18px;
  border: 1.6px solid #8a9099;
  border-radius: 50%;
  color: #6b7280;
  display: inline-grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
}

.teacher-checklist-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.teacher-checklist-item {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}

.teacher-checklist-item-head {
  width: 100%;
  min-height: 61px;
  border: 0;
  background: #fff;
  display: grid;
  grid-template-columns: 36px 1fr 26px;
  align-items: center;
  column-gap: 12px;
  padding: 0 13px;
  text-align: left;
  cursor: pointer;
}

.teacher-checklist-item-head.no-toggle {
  cursor: default;
}

.teacher-checklist-box {
  width: 25px;
  height: 25px;
  border-radius: 4px;
  border: 2px solid #e2e5ec;
  background: #f2f3f6;
  display: grid;
  place-items: center;
  color: #842eea;
  font-size: 18px;
  line-height: 1;
  font-weight: 900;
  flex: 0 0 auto;
}

.teacher-checklist-box.is-checked {
  border-color: #842eea;
  background: #f4eaff;
}

.teacher-checklist-item-title {
  font-size: 15px;
  line-height: 1.45;
  color: #151b26;
}

.teacher-checklist-item.is-open .teacher-checklist-item-title,
.teacher-checklist-item.is-required .teacher-checklist-item-title {
  font-weight: 800;
}

.teacher-checklist-chevron {
  justify-self: end;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  color: #7b2fe6;
  font-size: 22px;
  transition: transform 0.18s ease;
}

.teacher-checklist-item.is-open .teacher-checklist-chevron {
  transform: rotate(180deg);
}

.teacher-checklist-body {
  padding: 0 16px 24px 64px;
  color: #222936;
  font-size: 15px;
  line-height: 1.65;
}

.teacher-checklist-body p {
  margin: 0 0 13px;
}

.teacher-checklist-body strong,
.teacher-checklist-body b {
  font-weight: 800;
}

.teacher-checklist-body code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.95em;
  background: #f3f4f6;
  border-radius: 4px;
  padding: 1px 5px;
}

.teacher-checklist-body ol,
.teacher-checklist-body ul {
  margin: 8px 0 0 18px;
  padding: 0;
}

.teacher-checklist-body li {
  margin: 9px 0;
}

.teacher-checklist-image {
  width: 100%;
  max-height: 270px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
  margin: 5px 0 14px;
  background: #111827;
}

.teacher-checklist-file-panel {
  background: #fff;
  min-height: 420px;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
}

.teacher-checklist-files-title {
  margin: 0 0 18px;
  font-size: 22px;
  font-weight: 800;
}

.teacher-checklist-empty {
  height: 250px;
  display: grid;
  place-items: center;
  color: #9ca3af;
  font-size: 15px;
}

.teacher-checklist-file-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.teacher-checklist-file-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  padding: 14px 16px;
  background: #fff;
  color: inherit;
  text-decoration: none;
}

.teacher-checklist-file-card:hover {
  border-color: #842eea;
}

.teacher-checklist-file-name {
  font-weight: 700;
  font-size: 15px;
}

.teacher-checklist-file-meta {
  color: #7b8190;
  font-size: 13px;
  margin-top: 3px;
}

.teacher-checklist-file-action {
  color: #842eea;
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
}


.teacher-checklist-completion {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.teacher-checklist-completion-note {
  color: #6b7280;
  font-size: 13px;
  font-weight: 650;
}

.teacher-checklist-complete-button {
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  padding: 0 18px;
  background: #842eea;
  color: #ffffff;
  font-size: 14px;
  font-weight: 850;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(132, 46, 234, 0.22);
}

.teacher-checklist-complete-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.teacher-checklist-completion.is-completed
.teacher-checklist-complete-button {
  background: #16a34a;
}

@media (max-width: 720px) {
  .teacher-checklist-tabs {
    padding: 0 10px;
  }

  .teacher-checklist-content {
    padding: 12px 10px 40px;
  }

  .teacher-checklist-item-head {
    grid-template-columns: 30px 1fr 24px;
    column-gap: 9px;
  }

  .teacher-checklist-box {
    width: 22px;
    height: 22px;
  }

  .teacher-checklist-body {
    padding: 0 14px 20px 54px;
  }

  .teacher-checklist-title {
    font-size: 20px;
  }

  .teacher-checklist-download {
    padding: 0 12px;
    font-size: 13px;
  }
}
`;

function injectStyles() {
  if (typeof document === 'undefined') return;

  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getData(task) {
  const source =
    task?.teacherChecklist ||
    task?.projectChecklist ||
    task?.checklistTask ||
    task?.renderer?.data ||
    task ||
    {};

  const tasks = normalizeArray(source.tasks || source.items || source.steps).map((item, index) => ({
    id: item.id || `step-${index + 1}`,
    title: item.title || item.text || `Task ${index + 1}`,
    required: item.required ?? index === 0,
    checked: Boolean(item.checked),
    defaultOpen: Boolean(item.defaultOpen),
    details: normalizeArray(item.details || item.content || item.blocks),
  }));

  return {
    title: source.title || task?.title || 'VSC: Project blank',
    taskNumber: source.taskNumber || source.position || task?.position || 1,
    checkNote: source.checkNote || 'TASKS WILL BE CHECKED BY THE TEACHER',
    downloadLabel: source.downloadLabel || 'Download project files',
    downloadUrl: source.downloadUrl || source.fileUrl || '',
    showDownload: source.showDownload !== false,
    showTopbar: source.showTopbar !== false,
    showTabs: source.showTabs !== false,
    showCheckboxes: source.showCheckboxes !== false,
    interactiveCheckboxes: Boolean(source.interactiveCheckboxes),
    files: normalizeArray(source.files),
    tasks,
  };
}

function openUrl(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function renderBlock(block, index) {
  if (typeof block === 'string') {
    return <p key={index}>{block}</p>;
  }

  if (!block) return null;

  if (block.type === 'html') {
    return (
      <div
        key={index}
        dangerouslySetInnerHTML={{ __html: block.html || block.content || '' }}
      />
    );
  }

  if (block.type === 'image') {
    return (
      <img
        key={index}
        className="teacher-checklist-image"
        src={block.src || block.url || block.image}
        alt={block.alt || ''}
      />
    );
  }

  if (block.type === 'list') {
    const Tag = block.ordered ? 'ol' : 'ul';

    return (
      <Tag key={index}>
        {normalizeArray(block.items).map((item, itemIndex) => (
          <li key={itemIndex}>{item}</li>
        ))}
      </Tag>
    );
  }

  if (block.type === 'code') {
    return (
      <pre key={index}>
        <code>{block.text || block.code || ''}</code>
      </pre>
    );
  }

  return <p key={index}>{block.text || block.content || ''}</p>;
}

export default function TeacherChecklistTask({
  task = {},
  onTaskCompleted,
}) {
  useEffect(() => {
    injectStyles();
  }, []);

  const data = useMemo(() => getData(task), [task]);

  const firstOpenId =
    data.tasks.find((item) => item.defaultOpen)?.id ||
    data.tasks.find((item) => item.details.length > 0)?.id ||
    '';

  const [activeTab, setActiveTab] = useState('tasks');
  const [openId, setOpenId] = useState(firstOpenId);
  const [checkedIds, setCheckedIds] = useState(() => {
    return new Set(data.tasks.filter((item) => item.checked).map((item) => item.id));
  });


  const [reviewedIds, setReviewedIds] = useState(() => new Set());
  const [completionSent, setCompletionSent] = useState(false);

  const requiredTasks = data.tasks.filter((item) => item.required);

  const requiredTaskIds = (
    requiredTasks.length > 0
      ? requiredTasks
      : data.tasks
  ).map((item) => item.id);

  const canComplete = data.interactiveCheckboxes
    ? requiredTaskIds.every((taskId) => checkedIds.has(taskId))
    : requiredTaskIds.every((taskId) => reviewedIds.has(taskId));

  function toggleOpen(item) {
    setReviewedIds((current) => {
      if (current.has(item.id)) return current;

      const next = new Set(current);
      next.add(item.id);
      return next;
    });

    if (!item.details.length) return;
    setOpenId((current) => (current === item.id ? '' : item.id));
  }

  function toggleChecked(event, item) {
    event.stopPropagation();

    if (!data.interactiveCheckboxes) return;

    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  function handleCompleteChecklist() {
    if (!canComplete) return;

    setCompletionSent(true);

    onTaskCompleted?.({
      completionType:
        data.interactiveCheckboxes
          ? 'checklist-completed'
          : 'reviewed',
      feedback:
        data.interactiveCheckboxes
          ? 'Required checklist items completed.'
          : 'Checklist instructions reviewed.',
      metadata: {
        checkedIds: Array.from(checkedIds),
        reviewedIds: Array.from(reviewedIds),
        requiredTaskIds,
      },
    });
  }

  return (
    <section className="teacher-checklist-page">
      {data.showTopbar && (
        <div className="teacher-checklist-topbar">
          <div className="teacher-checklist-logo">A</div>
          <div className="teacher-checklist-counter">{data.taskNumber}</div>
        </div>
      )}

      {data.showTabs && (
        <div className="teacher-checklist-tabs">
          <button
            type="button"
            className={`teacher-checklist-tab ${activeTab === 'tasks' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks
          </button>

          <button
            type="button"
            className={`teacher-checklist-tab ${activeTab === 'files' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            Files
          </button>

          <span className="teacher-checklist-paperclip">📎</span>

          {data.showDownload && (
            <button
              type="button"
              className="teacher-checklist-download"
              disabled={!data.downloadUrl}
              onClick={() => openUrl(data.downloadUrl)}
            >
              {data.downloadLabel}
            </button>
          )}
        </div>
      )}

      <div className="teacher-checklist-content">
        {activeTab === 'tasks' && (
          <>
            <div className="teacher-checklist-title-card">
              <h1 className="teacher-checklist-title">{data.title}</h1>
            </div>

            <div className="teacher-checklist-divider" />

            <div className="teacher-checklist-check-note">
              <span>{data.checkNote}</span>
              <span className="teacher-checklist-info">i</span>
            </div>

            <div className="teacher-checklist-list">
              {data.tasks.map((item, index) => {
                const isOpen = openId === item.id;
                const isChecked = checkedIds.has(item.id);
                const hasDetails = item.details.length > 0;

                return (
                  <article
                    key={item.id}
                    className={[
                      'teacher-checklist-item',
                      isOpen ? 'is-open' : '',
                      item.required ? 'is-required' : '',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      className={`teacher-checklist-item-head ${hasDetails ? '' : 'no-toggle'}`}
                      onClick={() => toggleOpen(item)}
                    >
                      {data.showCheckboxes && (
                        <span
                          className={`teacher-checklist-box ${isChecked ? 'is-checked' : ''}`}
                          onClick={(event) => toggleChecked(event, item)}
                        >
                          {isChecked ? '✓' : ''}
                        </span>
                      )}

                      <span className="teacher-checklist-item-title">
                        {index + 1}. {item.title}
                      </span>

                      {hasDetails && <span className="teacher-checklist-chevron">⌄</span>}
                    </button>

                    {isOpen && hasDetails && (
                      <div className="teacher-checklist-body">
                        {item.details.map(renderBlock)}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div
              className={`teacher-checklist-completion ${
                completionSent ? 'is-completed' : ''
              }`}
            >
              <span className="teacher-checklist-completion-note">
                {data.interactiveCheckboxes
                  ? 'Complete all required checklist items.'
                  : 'Open and review all required task instructions.'}
              </span>

              <button
                type="button"
                className="teacher-checklist-complete-button"
                disabled={!canComplete}
                onClick={handleCompleteChecklist}
              >
                {completionSent
                  ? 'Completed ✓'
                  : data.interactiveCheckboxes
                    ? 'Complete checklist'
                    : 'Mark as reviewed'}
              </button>
            </div>
          </>
        )}

        {activeTab === 'files' && (
          <div className="teacher-checklist-file-panel">
            <h2 className="teacher-checklist-files-title">Files</h2>

            {data.files.length === 0 ? (
              <div className="teacher-checklist-empty">No files added yet.</div>
            ) : (
              <div className="teacher-checklist-file-list">
                {data.files.map((file, index) => (
                  <a
                    key={file.id || index}
                    className="teacher-checklist-file-card"
                    href={file.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>
                      <span className="teacher-checklist-file-name">
                        {file.title || file.name || `File ${index + 1}`}
                      </span>
                      {file.description && (
                        <span className="teacher-checklist-file-meta">
                          {file.description}
                        </span>
                      )}
                    </span>

                    <span className="teacher-checklist-file-action">Open</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}