import { useEffect, useMemo, useRef, useState } from 'react';
import { runPythonCode } from '../lib/pythonRuntime.js';
import LmsActivityFrame from '../components/LmsActivityFrame.jsx';
import {
  loadLocalTaskState,
  saveLocalTaskState,
} from '../lib/taskExtractors.js';

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  '',
).replace(/\/+$/, '');
const SESSION_STORAGE_KEY = 'algolms_session_id';

const PYTHON_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
]);

const PYTHON_BUILTINS = new Set([
  'abs',
  'all',
  'any',
  'bin',
  'bool',
  'chr',
  'dict',
  'dir',
  'enumerate',
  'filter',
  'float',
  'format',
  'input',
  'int',
  'len',
  'list',
  'map',
  'max',
  'min',
  'open',
  'print',
  'range',
  'randint',
  'round',
  'set',
  'sorted',
  'str',
  'sum',
  'tuple',
  'type',
]);

const EMBEDDED_STYLES = `
.ide-programming-task {
  width: min(1480px, calc(100vw - 130px));
  min-height: 620px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(680px, 1fr) 14px 380px;
  background: #eef2f7;
  border-radius: 2px;
  overflow: hidden;
}

.ide-programming-task.is-right-collapsed {
  grid-template-columns: minmax(680px, 1fr) 14px 0;
}

.ide-programming-task.is-right-collapsed .ide-programming-right {
  display: none;
}

.ide-programming-task.is-fullscreen {
  width: calc(100vw - 24px);
  min-height: calc(100vh - 170px);
}

.ide-programming-left {
  min-width: 0;
  background: #e9edf3;
  display: flex;
  flex-direction: column;
}

.ide-programming-splitter {
  position: relative;
  background: #8d3ff2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ide-splitter-button {
  width: 12px;
  height: 48px;
  border: 0;
  border-radius: 999px;
  background: #ffffff;
  color: #8d3ff2;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: 0 1px 4px rgba(16, 24, 40, 0.25);
}

.ide-splitter-button:hover {
  background: #f5efff;
}

.ide-programming-task.is-right-collapsed .ide-splitter-button {
  transform: rotate(180deg);
}

.ide-programming-toolbar {
  height: 54px;
  background: #eef2f7;
  border-bottom: 1px solid #d5dae2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 0 24px;
}

.ide-toolbar-button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  background: #8d3ff2;
  color: white;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ide-toolbar-button:hover {
  filter: brightness(1.05);
}

.ide-toolbar-button:active {
  transform: translateY(1px);
}

.ide-toolbar-button.is-soft {
  background: #c8b6f4;
}

.ide-programming-editor-wrap {
  flex: 1;
  min-height: 540px;
  background: #eef2f7;
  display: flex;
  align-items: stretch;
  padding: 0;
  overflow: hidden;
}

.ide-line-numbers {
  width: 72px;
  padding-top: 12px;
  color: #35658f;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 24px;
  text-align: right;
  user-select: none;
  overflow: hidden;
  flex: 0 0 72px;
}

.ide-line-number {
  display: block;
  height: 24px;
  padding-right: 18px;
}

.ide-code-layer {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 540px;
}

.ide-code-highlight,
.ide-code-textarea {
  position: absolute;
  inset: 0;
  width: 100%;
  min-height: 540px;
  margin: 0;
  padding: 12px 18px 40px 0;
  border: 0;
  outline: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 24px;
  tab-size: 4;
  white-space: pre;
  box-sizing: border-box;
}

.ide-code-highlight {
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
  background: transparent;
}

.ide-code-textarea {
  z-index: 2;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: #172554;
  overflow: auto;
  -webkit-text-fill-color: transparent;
}

.ide-code-textarea::selection {
  background: rgba(141, 63, 242, 0.28);
}

.ide-code-textarea::placeholder {
  color: rgba(21, 32, 51, 0.35);
  -webkit-text-fill-color: rgba(21, 32, 51, 0.35);
}

.ide-code-line {
  height: 24px;
  min-height: 24px;
}

.ide-token {
  color: #172033;
}

.ide-token.keyword {
  color: #2459ff;
}

.ide-token.builtin {
  color: #0094ff;
}

.ide-token.string {
  color: #c0392b;
}

.ide-token.number {
  color: #00a86b;
}

.ide-token.comment {
  color: #138a25;
}

.ide-token.operator {
  color: #172033;
}

.ide-token.punctuation {
  color: #7c3aed;
}

.ide-token.variable {
  color: #172033;
}

.ide-output-panel {
  border-top: 1px solid #d5dae2;
  background: #f8fafc;
  padding: 10px 18px 14px 72px;
  color: #334155;
  font-size: 13px;
  line-height: 1.45;
}

.ide-output-panel strong {
  display: block;
  margin-bottom: 4px;
}

.ide-output-panel pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

.ide-programming-right {
  background: #eef2f7;
  padding: 18px 18px 24px 18px;
  overflow: auto;
}

.ide-side-title {
  margin: 0 0 16px;
  padding: 20px 18px;
  background: white;
  border-radius: 10px;
  color: #101828;
  font-size: 24px;
  font-weight: 800;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
}

.ide-side-divider {
  height: 4px;
  background: #c8ccd4;
  border-radius: 999px;
  margin: 0 0 16px;
}

.ide-side-section-label {
  margin: 0 0 12px;
  color: #7a8494;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ide-instruction-card,
.ide-tip-card,
.ide-answer-key-card {
  background: white;
  border-radius: 10px;
  margin-bottom: 14px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
}

.ide-card-header {
  width: 100%;
  border: 0;
  background: transparent;
  color: #101828;
  padding: 16px 18px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.ide-card-header strong {
  font-size: 15px;
  line-height: 1.35;
}

.ide-card-chevron {
  flex: 0 0 auto;
  font-size: 18px;
  line-height: 1;
  color: #475467;
  transform: translateY(2px);
}

.ide-card-body {
  padding: 0 18px 16px;
  color: #101828;
  font-size: 15px;
  line-height: 1.45;
}

.ide-card-body p {
  margin: 0 0 12px;
}

.ide-card-body p:last-child {
  margin-bottom: 0;
}

.ide-task-preview-image {
  margin: 0 0 14px;
  border: 1px solid #d7dbe3;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.ide-task-preview-image img {
  display: block;
  width: 100%;
  height: auto;
}

.ide-tip-card {
  border: 1px solid #c5cbd5;
}

.ide-tip-card .ide-card-header {
  padding: 14px 16px;
}

.ide-tip-card .ide-card-body {
  padding: 0 16px 14px;
  color: #273244;
  font-size: 14px;
}

.ide-status-note {
  margin-top: 12px;
  color: #6b7280;
  font-size: 13px;
}

.ide-answer-key-code {
  margin: 0;
  border: 1px solid #d7dbe3;
  border-radius: 8px;
  background: #f8fafc;
  overflow: auto;
  max-height: 420px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  line-height: 22px;
}

.ide-answer-key-line {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  min-height: 22px;
}

.ide-answer-key-line-number {
  padding: 0 10px;
  color: #64748b;
  text-align: right;
  user-select: none;
  border-right: 1px solid #e2e8f0;
  background: #eef2f7;
}

.ide-answer-key-line-code {
  padding: 0 12px;
  white-space: pre;
}

.ide-answer-key-empty,
.ide-answer-key-error {
  margin: 0;
  color: #b42318;
  font-size: 14px;
  line-height: 1.45;
}

.ide-programming-task.is-dark .ide-programming-left,
.ide-programming-task.is-dark .ide-programming-editor-wrap {
  background: #20262b;
}

.ide-programming-task.is-dark .ide-programming-toolbar {
  background: #20262b;
  border-bottom-color: #111827;
}

.ide-programming-task.is-dark .ide-line-numbers {
  color: rgba(210, 215, 225, 0.58);
}

.ide-programming-task.is-dark .ide-code-textarea {
  caret-color: #5ee7ff;
}

.ide-programming-task.is-dark .ide-token {
  color: #d4d7df;
}

.ide-programming-task.is-dark .ide-token.keyword {
  color: #56a8ff;
}

.ide-programming-task.is-dark .ide-token.builtin {
  color: #27b7ff;
}

.ide-programming-task.is-dark .ide-token.string {
  color: #ffae33;
}

.ide-programming-task.is-dark .ide-token.number {
  color: #4fe28a;
}

.ide-programming-task.is-dark .ide-token.comment {
  color: #59b85a;
}

.ide-programming-task.is-dark .ide-token.operator {
  color: #d4d7df;
}

.ide-programming-task.is-dark .ide-token.punctuation {
  color: #c77dff;
}

.ide-programming-task.is-dark .ide-output-panel {
  background: #151a1f;
  color: #d4d7df;
  border-top-color: #0f172a;
}

.ide-programming-task.is-dark .ide-answer-key-code {
  background: #151a1f;
  border-color: #0f172a;
}

.ide-programming-task.is-dark .ide-answer-key-line-number {
  background: #20262b;
  color: rgba(210, 215, 225, 0.58);
  border-right-color: #0f172a;
}

.ide-output-terminal {
  display: block;
  margin: 0;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

.ide-stdin-input {
  display: inline-block;
  width: min(320px, 70%);
  min-width: 90px;
  margin: 0;
  padding: 0 0 0 2px;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  caret-color: currentColor;
}

.ide-stdin-input::selection {
  background: rgba(141, 63, 242, 0.28);
}

.ide-programming-task.is-dark .ide-stdin-input {
  color: #d4d7df;
}

@media (max-width: 1100px) {
  .ide-programming-task {
    width: calc(100vw - 48px);
    grid-template-columns: 1fr;
  }

  .ide-programming-task.is-right-collapsed {
    grid-template-columns: 1fr;
  }

  .ide-programming-left {
    border-right: 0;
    border-bottom: 0;
  }

  .ide-programming-splitter {
    display: none;
  }
}
`;

function getTaskId(task) {
  return String(task?.id || task?.taskId || 'ide-programming-task').trim();
}

function getStateId(state) {
  return String(state?.id || state?.stateId || '').trim();
}

function cleanString(value) {
  return String(value || '').trim();
}

function getSessionId() {
  try {
    // Prefer the student's email (provided by the classroom platform)
    const studentEmail = localStorage.getItem('lms_student_email');
    if (studentEmail) return studentEmail;

    const existing = localStorage.getItem(SESSION_STORAGE_KEY);

    if (existing) return existing;

    const next =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function getRuntimeIds(pageInstance, task, state) {
  let courseId = '';
  let lessonId = '';
  let pageId = '';

  try {
    const params = new URLSearchParams(window.location.search);

    courseId = params.get('course') || params.get('courseId') || '';
    lessonId = params.get('lesson') || params.get('lessonId') || '';
    pageId = params.get('page') || params.get('pageId') || '';
  } catch {
    // Ignore and use fallback below.
  }

  const ideConfig = task?.ideProgramming || state?.ideProgramming || {};

  return {
    courseId:
      courseId ||
      task?.courseId ||
      ideConfig?.courseId ||
      pageInstance?.courseId ||
      pageInstance?.course?.id ||
      pageInstance?.course ||
      '',
    lessonId:
      lessonId ||
      task?.lessonId ||
      ideConfig?.lessonId ||
      pageInstance?.lessonId ||
      pageInstance?.lesson?.id ||
      pageInstance?.lesson ||
      '',
    pageId:
      pageId ||
      task?.pageId ||
      ideConfig?.pageId ||
      pageInstance?.pageId ||
      pageInstance?.page?.id ||
      pageInstance?.id ||
      '',
  };
}

function getInputValues(task, state) {
  const sources = [
    state?.ideProgramming,
    task?.ideProgramming,
    state,
    task,
  ];

  for (const source of sources) {
    const value =
      source?.inputValues ??
      source?.inputs ??
      source?.testInputs ??
      source?.testInput ??
      source?.stdin;

    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }

    if (typeof value === 'string') {
      return value
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n');
    }
  }

  return [];
}

function getPythonTimeoutMs(task, state) {
  return Number(
    state?.ideProgramming?.pythonTimeoutMs ||
      task?.ideProgramming?.pythonTimeoutMs ||
      state?.pythonTimeoutMs ||
      task?.pythonTimeoutMs ||
      state?.timeoutMs ||
      task?.timeoutMs ||
      5000
  );
}

function getSubmitEndpoint(task, state) {
  return cleanString(
    state?.ideProgramming?.submitEndpoint ||
      task?.ideProgramming?.submitEndpoint ||
      state?.submitEndpoint ||
      task?.submitEndpoint ||
      '/api/activity-attempts'
  );
}

function getAnswerKeyEndpoint(task, state) {
  return cleanString(
    state?.ideProgramming?.answerKeyEndpoint ||
      task?.ideProgramming?.answerKeyEndpoint ||
      state?.answerKeyEndpoint ||
      task?.answerKeyEndpoint ||
      '/api/admin/answer-keys'
  );
}

function unwrapBackendPayload(payload) {
  if (!payload) return null;

  if (payload.ok === true && payload.data) return payload.data;
  if (payload.data?.attempt || payload.data?.progress || payload.data?.result) return payload.data;

  return payload;
}

function getBackendError(payload) {
  return (
    payload?.error?.message ||
    payload?.message ||
    payload?.error ||
    'Request failed.'
  );
}

function normalizeCode(value) {
  return String(value ?? '').replace(/\r/g, '').replace(/\t/g, '    ');
}

function normalizeAnswerKeySource(value) {
  return normalizeCode(value).trimEnd();
}

function getAnswerKeySourceFromObject(source) {
  if (!source || typeof source !== 'object') return '';

  const answerKeyJson =
    source.answer_key ||
    source.answerKey ||
    source.answer_key_json ||
    source.answerKeyJson ||
    source;

  return normalizeAnswerKeySource(
    source.answer_key_source ||
      source.answerKeySource ||
      source.sourceCode ||
      source.source_code ||
      source.solutionCode ||
      source.solution_code ||
      source.expectedCode ||
      source.expected_code ||
      source.code ||
      source.solution ||
      source.answer ||
      answerKeyJson?.sourceCode ||
      answerKeyJson?.source_code ||
      answerKeyJson?.answerKeySource ||
      answerKeyJson?.answer_key_source ||
      answerKeyJson?.solutionCode ||
      answerKeyJson?.solution_code ||
      answerKeyJson?.expectedCode ||
      answerKeyJson?.expected_code ||
      answerKeyJson?.code ||
      answerKeyJson?.solution ||
      answerKeyJson?.answer ||
      ''
  );
}

function getAnswerKeyLanguageFromObject(source) {
  if (!source || typeof source !== 'object') return 'python';

  const answerKeyJson =
    source.answer_key ||
    source.answerKey ||
    source.answer_key_json ||
    source.answerKeyJson ||
    source;

  return cleanString(
    source.language ||
      source.answer_key_language ||
      source.answerKeyLanguage ||
      answerKeyJson?.language ||
      'python'
  ) || 'python';
}

function findMatchingAnswerKeyRow(rows, taskId) {
  if (!Array.isArray(rows)) return null;

  const normalizedTaskId = cleanString(taskId);

  return rows.find((row) => {
    const rowTaskId = cleanString(row?.task_id || row?.taskId);
    return rowTaskId === normalizedTaskId;
  }) || rows[0] || null;
}

function extractAnswerKeyFromPayload(payload, taskId) {
  const data = payload?.data || payload;

  if (!data) {
    return {
      source: '',
      language: 'python',
    };
  }

  if (Array.isArray(data?.answerKeys)) {
    const row = findMatchingAnswerKeyRow(data.answerKeys, taskId);

    return {
      source: getAnswerKeySourceFromObject(row),
      language: getAnswerKeyLanguageFromObject(row),
    };
  }

  if (Array.isArray(payload?.answerKeys)) {
    const row = findMatchingAnswerKeyRow(payload.answerKeys, taskId);

    return {
      source: getAnswerKeySourceFromObject(row),
      language: getAnswerKeyLanguageFromObject(row),
    };
  }

  if (Array.isArray(data)) {
    const row = findMatchingAnswerKeyRow(data, taskId);

    return {
      source: getAnswerKeySourceFromObject(row),
      language: getAnswerKeyLanguageFromObject(row),
    };
  }

  const direct =
    data.answerKey ||
    data.answer_key ||
    data.record ||
    data.answerKeyRecord ||
    data.answer_key_record ||
    data;

  return {
    source: getAnswerKeySourceFromObject(direct),
    language: getAnswerKeyLanguageFromObject(direct),
  };
}

async function submitIdeSource({
  pageInstance,
  task,
  state,
  code,
  runtimeStatus,
}) {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_API_URL. Add VITE_API_URL=http://localhost:<backend-port> in .env.');
  }

  const taskId = getTaskId(task);
  const { courseId, lessonId, pageId } = getRuntimeIds(pageInstance, task, state);

  if (!courseId || !lessonId || !pageId || !taskId) {
    throw new Error('Missing courseId, lessonId, pageId, or taskId.');
  }

  const endpoint = getSubmitEndpoint(task, state);
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const sourceCode = normalizeCode(code);
  const clientSavedAt = new Date().toISOString();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId: getSessionId(),
      userId: task?.userId || pageInstance?.userId || localStorage.getItem('lms_student_email') || 'tim.tran@algo.edu.vn',
      courseId,
      lessonId,
      pageId,
      taskId,
      activityType: 'ide-programming',
      action: 'save_source',
      runMode: 'run',
      language: 'python',
      sourceCode,
      runtimeStatus: runtimeStatus || 'ran',
      clientSavedAt,
      answer: {
        code: sourceCode,
        submittedCode: sourceCode,
        sourceCode,
        language: 'python',
        runMode: 'run',
        runtimeStatus: runtimeStatus || 'ran',
        clientSavedAt,
      },
    }),
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(getBackendError(payload));
  }

  if (payload?.ok === false) {
    throw new Error(getBackendError(payload));
  }

  const data = unwrapBackendPayload(payload);

  if (!data) {
    return payload || { ok: true };
  }

  return data;
}

async function fetchAnswerKey({
  pageInstance,
  task,
  state,
}) {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_API_URL. Add VITE_API_URL=http://localhost:<backend-port> in .env.');
  }

  const taskId = getTaskId(task);
  const { courseId, lessonId, pageId } = getRuntimeIds(pageInstance, task, state);

  if (!courseId || !lessonId || !pageId || !taskId) {
    throw new Error('Missing courseId, lessonId, pageId, or taskId.');
  }

  const endpoint = getAnswerKeyEndpoint(task, state);
  const url = new URL(
    endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  );

  url.searchParams.set('courseId', courseId);
  url.searchParams.set('lessonId', lessonId);
  url.searchParams.set('pageId', pageId);
  url.searchParams.set('taskId', taskId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(getBackendError(payload));
  }

  if (payload?.ok === false) {
    throw new Error(getBackendError(payload));
  }

  const parsed = extractAnswerKeyFromPayload(payload, taskId);

  if (!parsed.source) {
    throw new Error('Answer key not found for this task.');
  }

  return parsed;
}

function getManualMapUrl(pageInstance, task) {
  return (
    pageInstance?.manualActivityMap?.url ||
    pageInstance?.manualActivityMapUrl ||
    task?.manualActivityMapUrl ||
    task?.activityMapUrl ||
    ''
  );
}

function findManualTask(manualMap, taskId) {
  if (!manualMap || !taskId) return null;

  if (manualMap?.tasks?.[taskId]) {
    return manualMap.tasks[taskId];
  }

  if (Array.isArray(manualMap?.tasks)) {
    return manualMap.tasks.find((item) => {
      const id = String(item?.id || item?.taskId || '').trim();
      return id === taskId;
    }) || null;
  }

  if (manualMap?.[taskId]) {
    return manualMap[taskId];
  }

  return null;
}

function findManualState(manualTask, stateId) {
  if (!manualTask || !stateId) return null;

  const states = manualTask.states;

  if (Array.isArray(states)) {
    return states.find((item) => {
      const id = String(item?.id || item?.stateId || '').trim();
      return id === stateId;
    }) || null;
  }

  if (states && typeof states === 'object') {
    const direct = states[stateId];

    if (direct) {
      return {
        id: direct?.id || direct?.stateId || stateId,
        stateId: direct?.stateId || direct?.id || stateId,
        ...direct,
      };
    }

    return Object.entries(states)
      .map(([id, value]) => ({
        id: value?.id || value?.stateId || id,
        stateId: value?.stateId || value?.id || id,
        ...value,
      }))
      .find((item) => {
        const id = String(item?.id || item?.stateId || '').trim();
        return id === stateId;
      }) || null;
  }

  return null;
}

function mergeIdeProgrammingOverride(task, state, manualTask) {
  if (!manualTask) {
    return { task, state, hasManualOverride: false };
  }

  const stateId = getStateId(state);
  const manualState = findManualState(manualTask, stateId);
  const manualIde = manualTask.ideProgramming || {};
  const manualStateIde = manualState?.ideProgramming || {};

  const mergedState = state
    ? {
        ...state,
        ...(manualState || {}),
        id: state.id || state.stateId || manualState?.id || manualState?.stateId,
        stateId: state.stateId || state.id || manualState?.stateId || manualState?.id,
        title:
          manualStateIde.title ||
          manualState?.title ||
          state?.title,
        selectedType:
          manualState?.selectedType ||
          state?.selectedType,
        ideProgramming: {
          ...(state?.ideProgramming || {}),
          ...manualStateIde,
        },
      }
    : state;

  const mergedTaskBase = {
    ...task,
    ...manualTask,
    id: task?.id || task?.taskId || manualTask?.id || manualTask?.taskId,
    taskId: task?.taskId || task?.id || manualTask?.taskId || manualTask?.id,
    selectedType: manualTask?.selectedType || task?.selectedType,
    title:
      manualIde.title ||
      manualTask?.title ||
      task?.title,
    description:
      manualIde.description ||
      manualTask?.description ||
      task?.description,
    question:
      manualIde.question ||
      manualTask?.question ||
      task?.question,
    instructions:
      manualIde.instructions ||
      manualTask?.instructions ||
      task?.instructions,
    tips:
      manualIde.tips ||
      manualTask?.tips ||
      task?.tips,
    ideProgramming: {
      ...(task?.ideProgramming || {}),
      ...manualIde,
    },
  };

  const mergedTask = {
    ...mergedTaskBase,
    states: mergedState ? [mergedState] : mergedTaskBase.states,
  };

  return {
    task: mergedTask,
    state: mergedState,
    hasManualOverride: true,
  };
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n\s+\n/g, '\n')
    .trim();
}

function getImageSrc(image) {
  if (!image) return '';

  if (typeof image === 'string') return image;

  return (
    image.localSrc ||
    image.publicSrc ||
    image.src ||
    image.url ||
    image.href ||
    image.path ||
    image.file ||
    image.filename ||
    image.screenshot ||
    image.preview ||
    image.image ||
    ''
  );
}

function normalizeImage(image) {
  const src = getImageSrc(image);

  if (!src) return null;

  return {
    src,
    alt: image?.alt || image?.title || '',
    width: image?.naturalWidth || image?.width || image?.rect?.w || 0,
    height: image?.naturalHeight || image?.height || image?.rect?.h || 0,
  };
}

function collectImagesFromSource(source, output = []) {
  if (!source || typeof source !== 'object') return output;

  const directCandidates = [
    source.image,
    source.screenshot,
    source.previewImage,
    source.captureImage,
    source.mainImage,
    source.preview,
  ];

  directCandidates.forEach((candidate) => {
    const image = normalizeImage(candidate);
    if (image) output.push(image);
  });

  const arrayKeys = [
    'images',
    'screenshots',
    'captures',
    'capturedScreens',
    'stateScreenshots',
    'assets',
    'previews',
  ];

  arrayKeys.forEach((key) => {
    const value = source[key];

    if (!Array.isArray(value)) return;

    value.forEach((item) => {
      const image = normalizeImage(item);
      if (image) output.push(image);
    });
  });

  return output;
}

function getAllStates(task, state) {
  const states = [];

  if (state) states.push(state);

  if (Array.isArray(task?.states)) {
    task.states.forEach((item) => {
      if (item && item !== state) states.push(item);
    });
  }

  return states;
}

function getCaptureImages(task, state) {
  const images = [];

  collectImagesFromSource(task, images);
  collectImagesFromSource(task?.ideProgramming, images);
  collectImagesFromSource(task?.renderer?.ideProgramming, images);

  getAllStates(task, state).forEach((item) => {
    collectImagesFromSource(item, images);
    collectImagesFromSource(item?.ideProgramming, images);
    collectImagesFromSource(item?.renderer?.ideProgramming, images);
  });

  const seen = new Set();

  return images
    .filter((image) => {
      if (!image?.src) return false;

      const key = image.src;
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const areaA = Number(a.width || 0) * Number(a.height || 0);
      const areaB = Number(b.width || 0) * Number(b.height || 0);

      return areaB - areaA;
    });
}

function collectStrings(value, output = [], depth = 0) {
  if (depth > 10 || value == null) return output;

  if (typeof value === 'string') {
    const text = stripHtml(value);
    if (text) output.push(text);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output, depth + 1));
    return output;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, output, depth + 1));
  }

  return output;
}

function getCodeFromSource(source) {
  if (!source) return '';

  const direct =
    source.initialCode ||
    source.code ||
    source.codeText ||
    source.startCode ||
    source.defaultCode ||
    source.placeholderCode ||
    '';

  if (direct) return normalizeCode(direct);

  if (Array.isArray(source.codeBlocks)) {
    const found = source.codeBlocks.find((block) => {
      const raw =
        block?.code ||
        block?.text ||
        block?.value ||
        block?.content ||
        block?.innerText ||
        block?.textContent ||
        '';

      return String(raw || '').trim();
    });

    if (found) {
      return normalizeCode(
        found.code ||
          found.text ||
          found.value ||
          found.content ||
          found.innerText ||
          found.textContent ||
          '',
      );
    }
  }

  return '';
}

function getInitialCode(task, state) {
  const sources = [
    task?.ideProgramming,
    state?.ideProgramming,
    task?.renderer?.ideProgramming,
    state?.renderer?.ideProgramming,
    state,
    task,
  ];

  for (const source of sources) {
    const code = getCodeFromSource(source);
    if (code) return code;
  }

  return '';
}

function getTitle(task, state) {
  return (
    task?.ideProgramming?.title ||
    state?.ideProgramming?.title ||
    task?.title ||
    state?.title ||
    'Write a program'
  );
}

function getQuestion(task, state) {
  return (
    task?.ideProgramming?.question ||
    state?.ideProgramming?.question ||
    task?.question ||
    state?.question ||
    ''
  );
}

function getInstructions(task, state) {
  const manualInstructions =
    task?.ideProgramming?.instructions ||
    state?.ideProgramming?.instructions ||
    task?.instructions ||
    state?.instructions ||
    [];

  if (Array.isArray(manualInstructions) && manualInstructions.length) {
    return manualInstructions.map(stripHtml).filter(Boolean);
  }

  if (typeof manualInstructions === 'string' && manualInstructions.trim()) {
    return [stripHtml(manualInstructions)];
  }

  const strings = collectStrings({
    taskPrompt: task?.prompt,
    statePrompt: state?.prompt,
    description: task?.description || state?.description,
    question: getQuestion(task, state),
  });

  return strings.filter(Boolean);
}

function normalizeTip(tip) {
  if (typeof tip === 'string') {
    const text = stripHtml(tip);
    const [title, ...bodyLines] = text.split('\n');

    return {
      title: title || '',
      body: bodyLines.join('\n').trim(),
      image: '',
    };
  }

  if (tip && typeof tip === 'object') {
    const title = stripHtml(tip.title || tip.heading || tip.name || '');
    const body = stripHtml(tip.body || tip.text || tip.description || tip.content || '');
    const image = getImageSrc(
      tip.image ||
        tip.screenshot ||
        tip.previewImage ||
        tip.captureImage ||
        tip.mainImage ||
        tip.preview ||
        '',
    );

    return {
      title,
      body,
      image,
    };
  }

  return null;
}

function getTips(task, state) {
  const tips =
    task?.ideProgramming?.tips ||
    state?.ideProgramming?.tips ||
    task?.tips ||
    state?.tips ||
    [];

  if (Array.isArray(tips)) {
    return tips.map(normalizeTip).filter(Boolean);
  }

  if (typeof tips === 'string' && tips.trim()) {
    return [normalizeTip(tips)].filter(Boolean);
  }

  return [];
}

function getLineCount(value) {
  return Math.max(1, String(value || '').split('\n').length);
}

function tokenizePythonLine(line) {
  return (
    String(line).match(
      /(#.*$)|("(?:\\.|[^"])*"|'(?:\\.|[^'])*')|(\s+)|([A-Za-z_][A-Za-z0-9_]*)|(\d+(?:\.\d+)?)|(==|!=|<=|>=|\+=|-=|\*=|\/=|\/\/=|\*\*=|[+\-*/%=<>])|([()[\]{},.:]([()[\]{},.:])|(\S)/g,
    ) || []
  );
}

function getTokenClass(token, nextToken = '') {
  if (/^\s+$/.test(token)) return '';
  if (/^#/.test(token)) return 'comment';
  if (/^(['"]).*\1$/.test(token)) return 'string';
  if (/^\d+(\.\d+)?$/.test(token)) return 'number';
  if (PYTHON_KEYWORDS.has(token)) return 'keyword';
  if (PYTHON_BUILTINS.has(token) || nextToken === '(') return 'builtin';
  if (/^(==|!=|<=|>=|\+=|-=|\*=|\/=|\/\/=|\*\*=|[+\-*/%=<>])$/.test(token)) return 'operator';
  if (/^[()[\]{},.:]$/.test(token)) return 'punctuation';
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) return 'variable';
  return '';
}

function renderHighlightedTokens(line, lineIndex, keyPrefix = 'line') {
  const tokens = tokenizePythonLine(line);

  return tokens.map((token, index) => {
    const className = getTokenClass(token, tokens[index + 1] || '');

    if (!className) {
      return <span key={`${keyPrefix}-${lineIndex}-${index}`}>{token}</span>;
    }

    return (
      <span key={`${keyPrefix}-${lineIndex}-${index}`} className={`ide-token ${className}`}>
        {token}
      </span>
    );
  });
}

function renderHighlightedLine(line, lineIndex) {
  return (
    <div key={lineIndex} className="ide-code-line">
      {renderHighlightedTokens(line, lineIndex, 'editor')}
    </div>
  );
}

function renderAnswerKeyLine(line, lineIndex) {
  return (
    <div key={`answer-key-${lineIndex}`} className="ide-answer-key-line">
      <span className="ide-answer-key-line-number">{lineIndex + 1}</span>
      <span className="ide-answer-key-line-code">
        {renderHighlightedTokens(line, lineIndex, 'answer-key')}
      </span>
    </div>
  );
}

export default function IdeProgrammingTask({
  task,
  state,
  pageInstance,
  onPrevTask,
  onNextTask,
  onPrevState,
  onNextState,
  onTaskCompleted,
}) {
  const taskId = getTaskId(task);
  const [manualTaskConfig, setManualTaskConfig] = useState(null);

  useEffect(() => {
    const manualMapUrl = getManualMapUrl(pageInstance, task);

    if (!manualMapUrl || !taskId) {
      setManualTaskConfig(null);
      return undefined;
    }

    let cancelled = false;

    fetch(`${manualMapUrl}?t=${Date.now()}`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((manualMap) => {
        if (cancelled) return;
        setManualTaskConfig(findManualTask(manualMap, taskId));
      })
      .catch(() => {
        if (!cancelled) setManualTaskConfig(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pageInstance, task, taskId]);

  const {
    task: effectiveTask,
    state: effectiveState,
  } = useMemo(
    () => mergeIdeProgrammingOverride(task, state, manualTaskConfig),
    [task, state, manualTaskConfig],
  );

  const title = useMemo(() => getTitle(effectiveTask, effectiveState), [effectiveTask, effectiveState]);
  const question = useMemo(() => getQuestion(effectiveTask, effectiveState), [effectiveTask, effectiveState]);
  const instructions = useMemo(() => getInstructions(effectiveTask, effectiveState), [effectiveTask, effectiveState]);
  const tips = useMemo(() => getTips(effectiveTask, effectiveState), [effectiveTask, effectiveState]);
  const captureImages = useMemo(() => {
    const originalImages = getCaptureImages(task, state);
    if (originalImages.length > 0) return originalImages;

    return getCaptureImages(effectiveTask, effectiveState);
  }, [task, state, effectiveTask, effectiveState]);
  const initialCode = useMemo(() => getInitialCode(effectiveTask, effectiveState), [effectiveTask, effectiveState]);

  const effectiveTaskId = getTaskId(effectiveTask);

const storageKey = `${effectiveTaskId}:${effectiveState?.id || effectiveState?.stateId || 'main'}:ide-code-v4`;
  const saved = useMemo(() => loadLocalTaskState(storageKey, null), [storageKey]);

  const [code, setCode] = useState(() => saved?.code ?? initialCode);
  const [status, setStatus] = useState(() => saved?.status || '');
  const [output, setOutput] = useState(() => saved?.output || '');
  const [isRunning, setIsRunning] = useState(false);
  const [isSavingSource, setIsSavingSource] = useState(false);
  const [stdinValue, setStdinValue] = useState('');
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(true);
  const [isAnswerKeyOpen, setIsAnswerKeyOpen] = useState(false);
  const [isLoadingAnswerKey, setIsLoadingAnswerKey] = useState(false);
  const [answerKeySource, setAnswerKeySource] = useState('');
  const [answerKeyLanguage, setAnswerKeyLanguage] = useState('python');
  const [answerKeyError, setAnswerKeyError] = useState('');
  const [openTips, setOpenTips] = useState(() => new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const editorRef = useRef(null);
  const highlightRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const undoStackRef = useRef([]);
  const stdinResolverRef = useRef(null);
  const stdinInputRef = useRef(null);
  const outputBufferRef = useRef(saved?.output || '');

  const nextAction = onNextState || onNextTask;
  const prevAction = onPrevState || onPrevTask;

  useEffect(() => {
    const nextSaved = loadLocalTaskState(storageKey, null);

    setCode(initialCode);
    setStatus(nextSaved?.status || '');
    setOutput(nextSaved?.output || '');
    outputBufferRef.current = nextSaved?.output || '';
    setStdinValue('');
    setIsWaitingForInput(false);
    setAnswerKeySource('');
    setAnswerKeyLanguage('python');
    setAnswerKeyError('');
    setIsAnswerKeyOpen(false);
    stdinResolverRef.current = null;
    undoStackRef.current = [];
  }, [storageKey, initialCode]);

  useEffect(() => {
    saveLocalTaskState(storageKey, {
      code,
      status,
      output,
    });
  }, [storageKey, code, status, output]);

  function syncScroll(event) {
    const scrollTop = event.currentTarget.scrollTop;
    const scrollLeft = event.currentTarget.scrollLeft;

    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }

    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  }

  function updateCode(nextCode) {
    undoStackRef.current.push(code);

    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }

    setCode(nextCode);
    setStatus('');
  }

  function undo() {
    const previous = undoStackRef.current.pop();

    if (previous == null) return;

    setCode(previous);
    setStatus('Undo applied.');
    editorRef.current?.focus();
  }

  function reset() {
    undoStackRef.current.push(code);
    setCode(initialCode);
    setTerminalOutput('');
    setStatus('');
    setStdinValue('');
    setIsWaitingForInput(false);
    stdinResolverRef.current = null;
    editorRef.current?.focus();
  }

  async function save() {
    if (isRunning || isSavingSource || isWaitingForInput) return;

    setIsSavingSource(true);
    setStatus('Saving source...');

    try {
      await submitIdeSource({
        pageInstance,
        task: effectiveTask,
        state: effectiveState,
        code,
        runtimeStatus: 'saved',
      });

      setStatus('Source saved.');

      onTaskCompleted?.({
        completionType: 'submitted',
        needsReview: true,
        feedback: 'Source code submitted.',
        metadata: {
          language:
            effectiveTask?.ideProgramming?.language ||
            effectiveTask?.language ||
            'python',
          sourceCode: code,
          submitAction: 'save-source',
        },
      });
    } catch (error) {
      console.error('[IDE_PROGRAMMING_SAVE_BUTTON_ERROR]', error);
      setStatus(`Source not saved: ${error?.message || 'Save failed.'}`);
    } finally {
      setIsSavingSource(false);
      editorRef.current?.focus();
    }
  }

  function setTerminalOutput(value) {
    outputBufferRef.current = String(value || '');
    setOutput(outputBufferRef.current);
  }

  function appendTerminalOutput(value) {
    outputBufferRef.current += String(value || '');
    setOutput(outputBufferRef.current);
  }

  function requestTerminalInput(promptText = '') {
    if (promptText) {
      appendTerminalOutput(promptText);
    }

    setStdinValue('');
    setIsWaitingForInput(true);

    window.requestAnimationFrame(() => {
      stdinInputRef.current?.focus();
    });

    return new Promise((resolve) => {
      stdinResolverRef.current = resolve;
    });
  }

  function submitTerminalInput() {
    if (!stdinResolverRef.current) return;

    const value = String(stdinValue ?? '');
    const resolve = stdinResolverRef.current;

    stdinResolverRef.current = null;
    setIsWaitingForInput(false);
    setStdinValue('');
    appendTerminalOutput(`${value}\n`);
    resolve(value);
  }

  async function executePythonInTerminal() {
    setTerminalOutput('');

    const result = await runPythonCode(code, {
      inputProvider: requestTerminalInput,
      onOutput: appendTerminalOutput,
      timeoutMs: getPythonTimeoutMs(effectiveTask, effectiveState),
    });

    if (!outputBufferRef.current && !result.stderr) {
      setTerminalOutput('(no output)');
    } else if (result.stderr) {
      appendTerminalOutput(`\n${result.stderr}`);
    }

    return result;
  }

  async function saveSourceAfterRun(runtimeStatus) {
    setIsSavingSource(true);

    try {
      await submitIdeSource({
        pageInstance,
        task: effectiveTask,
        state: effectiveState,
        code,
        runtimeStatus,
      });

      return true;
    } catch (error) {
      console.error('[IDE_PROGRAMMING_SAVE_SOURCE_ERROR]', error);
      setStatus(`Program ran. Source not saved: ${error?.message || 'Save failed.'}`);
      return false;
    } finally {
      setIsSavingSource(false);
    }
  }

  async function run() {
    if (isRunning || isSavingSource || isWaitingForInput) return;

    setIsRunning(true);
    setStatus('Running...');

    try {
      const result = await executePythonInTerminal();
      const runtimeStatus = result.ok ? 'ran' : 'runtime_error';
      const savedToBackend = await saveSourceAfterRun(runtimeStatus);

      if (savedToBackend) {
        setStatus(result.ok ? 'Program ran. Source saved.' : 'Runtime error. Source saved.');
      }
    } catch (error) {
      setTerminalOutput(error?.message || 'Python runtime failed.');
      const savedToBackend = await saveSourceAfterRun('runtime_error');

      if (savedToBackend) {
        setStatus('Runtime error. Source saved.');
      }
    } finally {
      setIsRunning(false);
      editorRef.current?.focus();
    }
  }

  async function toggleAnswerKey() {
    if (isAnswerKeyOpen) {
      setIsAnswerKeyOpen(false);
      return;
    }

    setIsAnswerKeyOpen(true);

    if (answerKeySource || answerKeyError || isLoadingAnswerKey) {
      return;
    }

    setIsLoadingAnswerKey(true);
    setAnswerKeyError('');

    try {
      const parsed = await fetchAnswerKey({
        pageInstance,
        task: effectiveTask,
        state: effectiveState,
      });

      setAnswerKeySource(parsed.source || '');
      setAnswerKeyLanguage(parsed.language || 'python');
    } catch (error) {
      console.error('[IDE_PROGRAMMING_ANSWER_KEY_ERROR]', error);
      setAnswerKeyError(error?.message || 'Could not load answer key.');
    } finally {
      setIsLoadingAnswerKey(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key !== 'Tab') return;

    event.preventDefault();

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const nextCode =
      code.slice(0, start) +
      '    ' +
      code.slice(end);

    updateCode(nextCode);

    window.requestAnimationFrame(() => {
      textarea.selectionStart = start + 4;
      textarea.selectionEnd = start + 4;
    });
  }

  function toggleTip(index) {
    setOpenTips((current) => {
      const next = new Set(current);

      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  }

  const visibleLineCount = Math.max(getLineCount(code), getLineCount(initialCode), 22);
  const lineNumbers = Array.from({ length: visibleLineCount }, (_, index) => index + 1);
  const highlightedLines = String(code || '').split('\n');
  const answerKeyLines = String(answerKeySource || '').split('\n');
  const mainImage = captureImages[0];

  return (
    <>
      <style>{EMBEDDED_STYLES}</style>

      <LmsActivityFrame
        title={title}
        onPrevTask={prevAction}
        onNextTask={nextAction}
        onReset={reset}
        isResetDisabled={isRunning || isSavingSource || isWaitingForInput}
        onCheck={() => {
          const userRole = localStorage.getItem('lms_user_role') || 'student';
          if (userRole === 'student') {
            setShowConfirmModal(true);
          } else {
            save();
          }
        }}
        isCheckDisabled={isRunning || isSavingSource || isWaitingForInput}
        isCheckLoading={isSavingSource}
      >
        <section
          className={[
            'ide-programming-task',
            isRightCollapsed ? 'is-right-collapsed' : '',
            isFullscreen ? 'is-fullscreen' : '',
            isDark ? 'is-dark' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="ide-programming-left">
            <div className="ide-programming-toolbar">
              <button
                type="button"
                className="ide-toolbar-button"
                onClick={run}
                title="Run"
                disabled={isRunning || isSavingSource || isWaitingForInput}
              >
                {isRunning || isSavingSource ? '…' : '▶'}
              </button>

              <button type="button" className="ide-toolbar-button" onClick={undo} title="Undo">
                ↶
              </button>

              <button
                type="button"
                className="ide-toolbar-button"
                onClick={() => setIsDark((current) => !current)}
                title="Toggle theme"
              >
                ☼
              </button>

              <button
                type="button"
                className="ide-toolbar-button"
                onClick={() => setIsRightCollapsed((current) => !current)}
                title={isRightCollapsed ? 'Show task panel' : 'Hide task panel'}
              >
                ◐
              </button>

              <button
                type="button"
                className="ide-toolbar-button"
                onClick={() => setIsFullscreen((current) => !current)}
                title="Fullscreen"
              >
                ⛶
              </button>
            </div>

            <div className="ide-programming-editor-wrap">
              <div ref={lineNumbersRef} className="ide-line-numbers" aria-hidden="true">
                {lineNumbers.map((lineNumber) => (
                  <span key={lineNumber} className="ide-line-number">
                    {lineNumber}
                  </span>
                ))}
              </div>

              <div className="ide-code-layer">
                <pre ref={highlightRef} className="ide-code-highlight" aria-hidden="true">
                  {highlightedLines.map(renderHighlightedLine)}
                </pre>

                <textarea
                  ref={editorRef}
                  className="ide-code-textarea"
                  value={code}
                  onChange={(event) => {
                    updateCode(event.target.value.replace(/\r/g, '').replace(/[\u200B-\u200D\uFEFF\u00AD]/g, ''));
                  }}
                  onKeyDown={handleKeyDown}
                  onScroll={syncScroll}
                  rows={visibleLineCount}
                  placeholder="# Write your code here"
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  autoComplete="off"
                />
              </div>
            </div>

            {(output || isWaitingForInput) && (
              <div className="ide-output-panel">
                <strong>Output</strong>
                <pre className="ide-output-terminal">
                  <span>{output}</span>
                  {isWaitingForInput ? (
                    <input
                      ref={stdinInputRef}
                      className="ide-stdin-input"
                      value={stdinValue}
                      onChange={(event) => setStdinValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          submitTerminalInput();
                        }
                      }}
                      spellCheck={false}
                      autoCorrect="off"
                      autoCapitalize="off"
                      autoComplete="off"
                    />
                  ) : null}
                </pre>
              </div>
            )}
          </div>

          <div className="ide-programming-splitter">
            <button
              type="button"
              className="ide-splitter-button"
              onClick={() => setIsRightCollapsed((current) => !current)}
              title={isRightCollapsed ? 'Show task panel' : 'Hide task panel'}
            >
              ▸
            </button>
          </div>

          <aside className="ide-programming-right">
            <h1 className="ide-side-title">{title}</h1>
            <div className="ide-side-divider" />

            <p className="ide-side-section-label">Programming Task</p>

            <div className="ide-instruction-card">
              <button
                type="button"
                className="ide-card-header"
                onClick={() => setIsTaskOpen((current) => !current)}
              >
                <strong>{question || title}</strong>
                <span className="ide-card-chevron">{isTaskOpen ? '⌃' : '⌄'}</span>
              </button>

              {isTaskOpen && (
                <div className="ide-card-body">
                  {mainImage && (
                    <div className="ide-task-preview-image">
                      <img src={mainImage.src} alt={mainImage.alt || title} />
                    </div>
                  )}

                  {instructions.length > 0 ? (
                    instructions.map((item, index) => (
                      <p key={`${item}-${index}`}>{item}</p>
                    ))
                  ) : !mainImage ? (
                    <p>No captured instruction image was found for this task.</p>
                  ) : null}
                </div>
              )}
            </div>

            {(() => {
              const userRole = localStorage.getItem('lms_user_role') || 'student';
              if (userRole === 'student') return null;
              
              return (
                <div className="ide-answer-key-card">
                  <button
                    type="button"
                    className="ide-card-header"
                    onClick={toggleAnswerKey}
                    disabled={isLoadingAnswerKey}
                  >
                    <strong>Answer Key</strong>
                    <span className="ide-card-chevron">{isAnswerKeyOpen ? '⌃' : '⌄'}</span>
                  </button>

                  {isAnswerKeyOpen && (
                    <div className="ide-card-body">
                      {isLoadingAnswerKey ? (
                        <p>Loading answer key...</p>
                      ) : answerKeyError ? (
                        <p className="ide-answer-key-error">{answerKeyError}</p>
                      ) : answerKeySource ? (
                        <>
                          <p className="ide-status-note">Language: {answerKeyLanguage || 'python'}</p>
                          <pre className="ide-answer-key-code">
                            {answerKeyLines.map(renderAnswerKeyLine)}
                          </pre>
                        </>
                      ) : (
                        <p className="ide-answer-key-empty">Answer key not found for this task.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {tips.length > 0 && (
              <>
                <p className="ide-side-section-label">Tips</p>

                {tips.map((tip, index) => {
                  const isOpen = openTips.has(index);

                  return (
                    <div key={`${tip.title || tip.body || index}-${index}`} className="ide-tip-card">
                      <button
                        type="button"
                        className="ide-card-header"
                        onClick={() => toggleTip(index)}
                      >
                        <strong>{tip.title}</strong>
                        <span className="ide-card-chevron">{isOpen ? '⌃' : '⌄'}</span>
                      </button>

                      {isOpen && (
                        <div className="ide-card-body">
                          {tip.image && (
                            <div className="ide-task-preview-image">
                              <img src={tip.image} alt={tip.title || 'Tip image'} />
                            </div>
                          )}

                          {tip.body && <p>{tip.body}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </aside>
        </section>
      </LmsActivityFrame>

      {/* CUSTOM CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="lms-badge-unlock" role="dialog" aria-modal="true">
          <div className="lms-badge-unlock__card">
            <span className="lms-badge-unlock__eyebrow">
              ONE LAST CHECK!
            </span>

            <div
              className="lms-badge-unlock__medal"
              style={{
                background: 'linear-gradient(145deg, #fbbf24, #f59e0b)',
                boxShadow: '0 13px 27px rgba(245, 158, 11, 0.34), inset 0 4px 0 rgba(255, 255, 255, 0.28)',
                borderColor: '#fde68a',
              }}
              aria-hidden="true"
            >
              <span>?</span>
            </div>

            <h2>Do the outputs match?</h2>
            <p>
              Compare <strong>Your Output</strong> with the <strong>Expected Output</strong>.
              <br />
              <br />
              If they look the same, you’re ready to finish.
              <br />
              Not sure? Ask your teacher for help.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center', alignItems: 'center' }}>
              <button
                type="button"
                className="lms-badge-unlock__name"
                style={{ cursor: 'pointer', margin: 0, minHeight: '42px', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowConfirmModal(false)}
              >
                Check Again
              </button>
              <button
                type="button"
                style={{ margin: 0, minWidth: '150px' }}
                onClick={() => {
                  setShowConfirmModal(false);
                  save();
                }}
              >
                Yes, They Match!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
