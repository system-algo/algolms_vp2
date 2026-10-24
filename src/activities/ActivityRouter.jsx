import CodeClassificationTask from './CodeClassificationTask.jsx';
import CodePlaceholderTask from './CodePlaceholderTask.jsx';
import GenericCapturedTask from './GenericCapturedTask.jsx';
import IdeProgrammingTask from './IdeProgrammingTask.jsx';
import MatchingDragdropTask from './MatchingDragdropTask.jsx';
import McqCheckboxTask from './McqCheckboxTask.jsx';
import TypingPracticeTask from './TypingPracticeTask.jsx';
import MatchingConnectTask from './MatchingConnectTask.jsx';
import CategoryDragdropTask from './CategoryDragdropTask.jsx';
import FinishTask from './FinishTask.jsx';
import FillBlankTask from './FillBlankTask.jsx';
import GoogleSlidesTask from './GoogleSlidesTask.jsx';
import CodeCanvasTask from './CodeCanvasTask.jsx';
import LinkSubmitTask from './LinkSubmitTask.jsx';
import TeacherChecklistTask from './TeacherChecklistTask.jsx';
import DiagramCanvasTask from "./DiagramCanvasTask";
import FeedbackRatingTask from './FeedbackRatingTask';
import SequenceOrderTask from './SequenceOrderTask.jsx';

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeRaw(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function collectAllText(value, output = [], depth = 0) {
  if (depth > 14 || value == null) return output;

  if (typeof value === 'string') {
    const text = value.trim();
    if (text) output.push(text);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectAllText(item, output, depth + 1));
    return output;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectAllText(item, output, depth + 1));
  }

  return output;
}

function getCurrentSource(task, state) {
  if (state) return state;

  if (Array.isArray(task?.states) && task.states.length === 1) {
    return task.states[0];
  }

  return task;
}

function getLinesFromSource(source) {
  const seen = new Set();
  const result = [];

  collectAllText(source)
    .flatMap((text) => String(text).replace(/\r/g, '\n').split('\n'))
    .map(normalizeRaw)
    .filter(Boolean)
    .forEach((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(line);
    });

  return result;
}

function isTechnicalCaptureLine(line) {
  const text = String(line || '').trim();
  const lower = normalizeText(text);

  if (!text) return false;

  if (lower.includes('nth-of-type')) return true;
  if (lower.includes('queryselector')) return true;
  if (lower.includes('dom path')) return true;
  if (lower.includes('css selector')) return true;
  if (lower.includes('.sc-')) return true;
  if (lower.includes('div.sc-')) return true;
  if (lower.includes('span.sc-')) return true;
  if (lower.includes('button.sc-')) return true;

  if (
    /(^|\s)(div|span|button|input|textarea|section|article|aside|main|p|pre)\.[a-z0-9_-]+/i.test(text) &&
    (text.includes('>') || text.includes(':nth-'))
  ) {
    return true;
  }

  if (text.length > 100 && text.includes('>') && text.includes('.')) {
    return true;
  }

  return false;
}

function isNoiseLine(line) {
  const lower = normalizeText(line);

  if (!lower) return true;
  if (isTechnicalCaptureLine(line)) return true;

  if (lower === 'run') return true;
  if (lower === 'reset') return true;
  if (lower === 'check') return true;
  if (lower === 'next') return true;
  if (lower === 'show raw capture') return true;
  if (lower === 'use activity renderer') return true;
  if (lower === 'tasks with automatic check') return true;
  if (lower === 'task with automatic check') return true;
  if (lower === '# write your code here') return true;
  if (lower === 'write your code here') return true;
  if (lower === 'select a value') return true;

  if (lower.includes('output will appear')) return true;
  if (lower.includes('task-preview')) return true;
  if (lower.includes('screenshots/')) return true;
  if (lower.includes('assets/')) return true;
  if (lower.includes('generated/')) return true;

  return false;
}

function cleanLines(lines) {
  return lines.filter((line) => !isNoiseLine(line));
}

function joinedText(lines) {
  return cleanLines(lines).map(normalizeText).join(' ');
}

function isCodeLine(line) {
  const text = normalizeRaw(line);

  if (isNoiseLine(text)) return false;

  return (
    /^[a-zA-Z_][\w]*\s*=\s*.*$/.test(text) ||
    /^print\s*\(.*/.test(text) ||
    /^input\s*\(.*/.test(text) ||
    /^if\s+.+/.test(text) ||
    /^elif\s+.+/.test(text) ||
    /^else\s*:/.test(text) ||
    /^for\s+.+/.test(text) ||
    /^while\s+.+/.test(text) ||
    /^return\s+.+/.test(text) ||
    /^import\s+.+/.test(text) ||
    /^from\s+.+\s+import\s*.*$/.test(text) ||
    /^def\s+.+/.test(text) ||
    /^[a-zA-Z_][\w.]*\s*\(.*\)$/.test(text)
  );
}

function getCodeLines(lines) {
  return cleanLines(lines).filter(isCodeLine);
}

function hasMcqShape(task, state, lines) {
  const joined = joinedText(lines);

  const hasChoiceOptions =
    Array.isArray(state?.choiceOptions) &&
    state.choiceOptions.length > 0;

  return (
    hasChoiceOptions ||
    joined.includes('mark the correct') ||
    joined.includes('choose the correct') ||
    joined.includes('correct statements') ||
    joined.includes('there may be more than one correct answer') ||
    joined.includes('select the correct')
  );
}

function hasClassificationMatchingShape(lines) {
  const joined = joinedText(lines);
  const codeCount = getCodeLines(lines).length;

  const hasSnippetMatching =
    joined.includes('match the code snippets to the categories') ||
    /match.*code.*snippet.*categor/i.test(joined) ||
    /match.*code.*categor/i.test(joined);

  const hasErrorMatching =
    joined.includes('determine whether the interpreter will output an error') ||
    joined.includes('whether the interpreter will output an error') ||
    (
      joined.includes('there is an error') &&
      joined.includes('no error') &&
      codeCount >= 2
    );

  return hasSnippetMatching || hasErrorMatching;
}

function hasExpressionMatchingShape(lines) {
  const joined = joinedText(lines);
  const codeCount = getCodeLines(lines).length;

  const hasDirectPrompt =
    joined.includes('match the expressions and their values') ||
    joined.includes('match expressions and values') ||
    /match.*expressions?.*values?/i.test(joined);

  const hasExpressionValueContent =
    codeCount >= 2 &&
    (
      joined.includes('return the time') ||
      joined.includes('pause the program') ||
      joined.includes('interpreter will return an error') ||
      joined.includes('generate a random number') ||
      joined.includes('connect all commands')
    );

  return hasDirectPrompt || hasExpressionValueContent;
}

function hasMatchingDragdropShape(lines) {
  const joined = joinedText(lines);
  const codeCount = getCodeLines(lines).length;

  const hasRuleMeaningPrompt =
    joined.includes('correlate the rule names and their meaning') ||
    joined.includes('one name is superfluous') ||
    joined.includes('rule of code design') ||
    joined.includes('rule of order') ||
    joined.includes('the start rule') ||
    joined.includes('parenthesis rule');

  const hasGeneralMatchingPrompt =
    joined.includes('match the names and their meanings') ||
    joined.includes('match the rule names') ||
    joined.includes('match the rule name') ||
    joined.includes('match the terms') ||
    joined.includes('match the definitions') ||
    joined.includes('match names and meanings') ||
    joined.includes('match terms and definitions') ||
    joined.includes('correlate') ||
    joined.includes('superfluous');

  const looksLikeDragDrop =
    joined.includes('attempt:') ||
    joined.includes('attempt') ||
    joined.includes('try again') ||
    joined.includes('a mistake has been made') ||
    joined.includes('drag') ||
    joined.includes('drop');

  if (hasClassificationMatchingShape(lines)) return false;
  if (codeCount >= 2 && hasExpressionMatchingShape(lines)) return false;

  return hasRuleMeaningPrompt || (hasGeneralMatchingPrompt && looksLikeDragDrop);
}

function hasStrongIdeInstruction(lines) {
  const joined = joinedText(lines);

  return (
    joined.includes('fix bugs') ||
    joined.includes('fix bug') ||
    joined.includes('fix errors') ||
    joined.includes('fix the errors') ||
    joined.includes('fix the error') ||
    joined.includes('debug the program') ||
    joined.includes('correct the program') ||
    joined.includes('write the program') ||
    joined.includes('write a program') ||
    joined.includes('write a program that') ||
    joined.includes('program should') ||
    joined.includes('the program should') ||
    joined.includes('should print') ||
    joined.includes('should output') ||
    joined.includes('expected output') ||
    joined.includes('format the result') ||
    joined.includes('result in the picture') ||
    joined.includes('the program combines') ||
    joined.includes('single search query') ||
    joined.includes('fix the errors in the work of the program')
  );
}

function hasPlaceholderTypingShape(task, state, lines) {
  if (hasMcqShape(task, state, lines)) return false;
  if (hasClassificationMatchingShape(lines)) return false;
  if (hasExpressionMatchingShape(lines)) return false;
  if (hasMatchingDragdropShape(lines)) return false;
  if (hasStrongIdeInstruction(lines)) return false;

  const codeLines = getCodeLines(lines);

  return codeLines.length >= 2;
}

function inferSubtype(task, state) {
  const source = getCurrentSource(task, state);
  const lines = getLinesFromSource(source);

  if (hasMcqShape(task, state, lines)) {
    return 'mcq';
  }

  if (hasClassificationMatchingShape(lines)) {
    return 'classification_matching';
  }

  if (hasMatchingDragdropShape(lines)) {
    return 'matching_dragdrop';
  }

  if (hasStrongIdeInstruction(lines)) {
    return 'code_editor';
  }

  if (hasExpressionMatchingShape(lines)) {
    return 'generic_capture';
  }

  if (hasPlaceholderTypingShape(task, state, lines)) {
    return 'placeholder_typing';
  }

  return 'generic_capture';
}

function normalizeRendererType(value) {
  const text = String(value || '').trim().toLowerCase();

  if (!text) return '';

  const aliases = {
    mcq: 'mcq-checkbox',
    mcq_checkbox: 'mcq-checkbox',
    mcqcheckbox: 'mcq-checkbox',
    'mcq-checkbox': 'mcq-checkbox',

    feedback_rating_task: 'feedback-rating-task',
    feedback_task: 'feedback-rating-task',
    rating_task: 'feedback-rating-task',
    'feedback-rating-task': 'feedback-rating-task',
    'feedback-task': 'feedback-rating-task',
    'rating-task': 'feedback-rating-task',

    category_dragdrop_task: 'category-dragdrop',
    category_dragdrop: 'category-dragdrop',
    category_drag_drop: 'category-dragdrop',
    categorydragdrop: 'category-dragdrop',
    'category-dragdrop': 'category-dragdrop',
    'category-drag-drop': 'category-dragdrop',
    'category-dragdrop-task': 'category-dragdrop',

    sequence_order_task: 'sequence-order-task',
    sequence_order: 'sequence-order-task',
    sequenceorder: 'sequence-order-task',
    order_task: 'sequence-order-task',
    ordertask: 'sequence-order-task',
    'sequence-order-task': 'sequence-order-task',
    'sequence-order': 'sequence-order-task',
    'order-task': 'sequence-order-task',

    classification_matching: 'code-classification',
    snippet_matching: 'code-classification',
    code_classification: 'code-classification',
    'code-classification': 'code-classification',

    code_editor: 'ide-programming',
    ide_programming: 'ide-programming',
    ide_programming_task: 'ide-programming',
    programming_task: 'ide-programming',
    'ide-programming': 'ide-programming',

    placeholder_typing: 'code-placeholder',
    code_placeholder: 'code-placeholder',
    'code-placeholder': 'code-placeholder',
    'code-placeholder-task': 'code-placeholder',

    fill_blank_task: 'fill-blank-task',
    fill_blank: 'fill-blank-task',
    'fill-blank-task': 'fill-blank-task',
    'fill-blank': 'fill-blank-task',

    typing_practice: 'typing-practice',
    typing_practice_task: 'typing-practice',
    typing_speed: 'typing-practice',
    typing_speed_task: 'typing-practice',
    code_typing: 'typing-practice',
    code_typing_task: 'typing-practice',
    'typing-practice': 'typing-practice',
    'typing-practice-task': 'typing-practice',
    'typing-speed': 'typing-practice',
    'code-typing': 'typing-practice',
    'code-typing-task': 'typing-practice',

    matching_connect_task: 'matching-connect',
    matching_connect: 'matching-connect',
    'matching-connect': 'matching-connect',
    'matching-connect-task': 'matching-connect',

    matching: 'matching-dragdrop',
    matching_dragdrop_task: 'matching-dragdrop',
    matching_dragdrop: 'matching-dragdrop',
    matching_drag_drop: 'matching-dragdrop',
    dragdrop: 'matching-dragdrop',
    drag_drop: 'matching-dragdrop',
    'matching-dragdrop': 'matching-dragdrop',
    'matching-drag-drop': 'matching-dragdrop',
    'matching-dragdrop-task': 'matching-dragdrop',

    finish_task: 'finish-task',
    finish: 'finish-task',
    finish_task_screen: 'finish-task',
    finished_task: 'finish-task',
    'finish-task': 'finish-task',
    'finish-task-screen': 'finish-task',
    'finished-task': 'finish-task',

    'google-slides': 'google-slides',
    google_slides: 'google-slides',

    code_canvas: 'code-canvas',
    code_canvas_task: 'code-canvas',
    'code-canvas': 'code-canvas',
    'code-canvas-task': 'code-canvas',

    'link-submit-task': 'link-submit-task',
    link_submit_task: 'link-submit-task',

    'teacher-checklist-task': 'teacher-checklist-task',
    teacher_checklist_task: 'teacher-checklist-task',

    generic_static: 'generic-static',
    generic_static_task: 'generic-static',
    static: 'generic-static',
    'generic-static': 'generic-static',
    'generic-static-task': 'generic-static',

    generic_capture: 'generic-captured-task',
    generic_captured_task: 'generic-captured-task',
    generic: 'generic-captured-task',
    'generic-captured-task': 'generic-captured-task',
  };

  return aliases[text] || text.replaceAll('_', '-');
}

function rendererTypeFromLegacySubtype(subtype) {
  if (subtype === 'mcq') return 'mcq-checkbox';
  if (subtype === 'classification_matching') return 'code-classification';
  if (subtype === 'matching_dragdrop') return 'matching-dragdrop';
  if (subtype === 'code_editor') return 'ide-programming';
  if (subtype === 'placeholder_typing') return 'code-placeholder';
  return 'generic-captured-task';
}

function getTaskId(task) {
  return String(task?.id || task?.taskId || task?._taskId || '').trim();
}

function getStateId(state) {
  return String(state?.id || state?.stateId || state?._stateId || '').trim();
}

function deriveTaskIdFromStateId(stateId) {
  const text = String(stateId || '').trim();

  const match = text.match(/^(task-\d+-[a-z0-9]+)-/i);
  if (match?.[1]) return match[1];

  return '';
}

function getTaskIdFromProps(props) {
  const direct =
    props?.taskId ||
    props?.currentTaskId ||
    props?.activeTaskId ||
    props?.selectedTaskId ||
    props?.task?.id ||
    props?.task?.taskId ||
    props?.task?._taskId ||
    props?.state?.taskId ||
    props?.state?._taskId ||
    '';

  if (direct) return String(direct).trim();

  const fromState = deriveTaskIdFromStateId(
    props?.state?.id ||
    props?.state?.stateId ||
    props?.state?._stateId ||
    ''
  );

  if (fromState) return fromState;

  const taskStates = props?.task?.states;

  if (Array.isArray(taskStates) && taskStates[0]) {
    return deriveTaskIdFromStateId(
      taskStates[0]?.id ||
      taskStates[0]?.stateId ||
      taskStates[0]?._stateId ||
      ''
    );
  }

  if (taskStates && typeof taskStates === 'object') {
    const firstStateKey = Object.keys(taskStates)[0] || '';
    const fromStateKey = deriveTaskIdFromStateId(firstStateKey);
    if (fromStateKey) return fromStateKey;
  }

  return '';
}

function getManualTaskFromSources(props, taskId) {
  if (!taskId) return null;

  return (
    props?.activityMap?.tasks?.[taskId] ||
    props?.manualMap?.tasks?.[taskId] ||
    props?.manualActivityMap?.tasks?.[taskId] ||
    props?.pageInstance?.activityMap?.tasks?.[taskId] ||
    props?.pageInstance?.manualMap?.tasks?.[taskId] ||
    null
  );
}

function getTaskRendererFromPageInstance(pageInstance, taskId) {
  if (!taskId) return null;

  return pageInstance?.taskRenderers?.[taskId] || null;
}

function getRendererFromPageInstance(pageInstance, task, state, props) {
  const taskId = getTaskIdFromProps({
    ...props,
    task,
    state,
  });

  const stateId = getStateId(state);

  const taskRenderer = getTaskRendererFromPageInstance(pageInstance, taskId);
  const stateRenderer = taskRenderer && stateId ? taskRenderer.states?.[stateId] : null;

  return (
    stateRenderer?.selectedType ||
    stateRenderer?.type ||
    taskRenderer?.selectedType ||
    taskRenderer?.type ||
    state?.selectedType ||
    state?.renderer?.selectedType ||
    state?.renderer?.type ||
    task?.selectedType ||
    task?.renderer?.selectedType ||
    task?.renderer?.type ||
    ''
  );
}

function resolveRendererType(props) {
  const { pageInstance, task, state } = props;

  const taskId = getTaskIdFromProps(props);
  const stateId = getStateId(state);

  const manualTask = getManualTaskFromSources(props, taskId);
  const manualState = stateId ? manualTask?.states?.[stateId] : null;

  const fromManual =
    manualState?.selectedType ||
    manualState?.type ||
    manualTask?.selectedType ||
    manualTask?.type ||
    '';

  if (fromManual) return normalizeRendererType(fromManual);

  const fromInstance = getRendererFromPageInstance(pageInstance, task, state, props);
  if (fromInstance) return normalizeRendererType(fromInstance);

  const fromManifest =
    state?.renderer?.type ||
    task?.renderer?.type ||
    state?.rendererType ||
    task?.rendererType ||
    '';

  if (fromManifest) return normalizeRendererType(fromManifest);

  const type = String(task?.activityType || task?.rawActivityType || '').toLowerCase();

  if (
    type === 'matching_connect_task' ||
    type === 'matching_connect' ||
    type === 'matching-connect' ||
    type === 'matching-connect-task'
  ) {
    return 'matching-connect';
  }

  if (
    type === 'category_dragdrop_task' ||
    type === 'category_dragdrop' ||
    type === 'category-dragdrop' ||
    type === 'category-dragdrop-task'
  ) {
    return 'category-dragdrop';
  }

  if (
    type === 'sequence_order_task' ||
    type === 'sequence_order' ||
    type === 'sequence-order-task' ||
    type === 'sequence-order' ||
    type === 'order_task' ||
    type === 'order-task'
  ) {
    return 'sequence-order-task';
  }

  if (
    type === 'matching_dragdrop_task' ||
    type === 'matching_dragdrop' ||
    type === 'matching-dragdrop' ||
    type === 'matching-dragdrop-task'
  ) {
    return 'matching-dragdrop';
  }

  if (
    type === 'ide_programming_task' ||
    type === 'idle_programming_task' ||
    type === 'programming_task'
  ) {
    return 'ide-programming';
  }

  const subtype = inferSubtype(task, state);
  return rendererTypeFromLegacySubtype(subtype);
}

function singleStateTask(task, state) {
  if (!state) return task;

  return {
    ...task,
    states: [state],
  };
}

function compactObject(value) {
  const result = {};

  Object.entries(value || {}).forEach(([key, item]) => {
    if (item !== undefined && item !== null) {
      result[key] = item;
    }
  });

  return result;
}

export default function ActivityRouter(props) {
  const { task, state, rawMode } = props;

  const rendererType = resolveRendererType(props);
  const taskId = getTaskIdFromProps(props);
  const stateId = getStateId(state);

  function reportTaskCompleted(completion = {}) {
    props.onTaskCompleted?.({
      ...(typeof completion === 'object' ? completion : {}),
      taskId:
        completion?.taskId ||
        taskId,
      activityType:
        completion?.activityType ||
        rendererType,
    });
  }

  /*
   * Side navigation buttons were removed from LmsActivityFrame. Do not strip
   * navigation callbacks here; several activity types need them for their
   * own Next/Previous controls.
   */
  const rendererProps = {
    ...props,
    onTaskCompleted: reportTaskCompleted,
  };

  if (rawMode) {
    return <GenericCapturedTask {...rendererProps} forceReplay />;
  }

  const taskRenderer = getTaskRendererFromPageInstance(props.pageInstance, taskId);
  const stateRenderer = taskRenderer && stateId
    ? taskRenderer?.states?.[stateId]
    : null;

  const manualTask = getManualTaskFromSources(props, taskId);
  const manualState = stateId ? manualTask?.states?.[stateId] : null;

  const baseTask = singleStateTask(task, state);

  const mergedCodeCanvasConfig = compactObject({
    ...(baseTask?.codeCanvasConfig || {}),
    ...(taskRenderer?.codeCanvasConfig || {}),
    ...(manualTask?.codeCanvasConfig || {}),
    ...(manualState?.codeCanvasConfig || {}),
    ...(stateRenderer?.codeCanvasConfig || {}),
  });

  const nextTask = {
    ...baseTask,
    ...taskRenderer,
    ...manualTask,
    ...stateRenderer,

    id:
      taskId ||
      manualTask?.id ||
      taskRenderer?.id ||
      baseTask?.id ||
      baseTask?.taskId ||
      '',

    taskId:
      taskId ||
      manualTask?.taskId ||
      taskRenderer?.taskId ||
      baseTask?.taskId ||
      baseTask?.id ||
      '',

    codeCanvasConfig:
      Object.keys(mergedCodeCanvasConfig).length
        ? mergedCodeCanvasConfig
        : undefined,

    teacherChecklist:
      stateRenderer?.teacherChecklist ||
      manualTask?.teacherChecklist ||
      taskRenderer?.teacherChecklist ||
      baseTask?.teacherChecklist ||
      null,

    categoryDragdrop:
      stateRenderer?.categoryDragdrop ||
      stateRenderer?.categoryDragDrop ||
      manualTask?.categoryDragdrop ||
      manualTask?.categoryDragDrop ||
      taskRenderer?.categoryDragdrop ||
      taskRenderer?.categoryDragDrop ||
      baseTask?.categoryDragdrop ||
      baseTask?.categoryDragDrop,

    sequenceOrder:
      stateRenderer?.sequenceOrder ||
      stateRenderer?.sequence ||
      stateRenderer?.orderTask ||
      manualState?.sequenceOrder ||
      manualState?.sequence ||
      manualState?.orderTask ||
      manualTask?.sequenceOrder ||
      manualTask?.sequence ||
      manualTask?.orderTask ||
      taskRenderer?.sequenceOrder ||
      taskRenderer?.sequence ||
      taskRenderer?.orderTask ||
      state?.sequenceOrder ||
      state?.sequence ||
      state?.orderTask ||
      baseTask?.sequenceOrder ||
      baseTask?.sequence ||
      baseTask?.orderTask ||
      null,

    googleSlides:
      manualTask?.googleSlides ||
      taskRenderer?.googleSlides ||
      baseTask?.googleSlides ||
      null,

    linkSubmit:
      stateRenderer?.linkSubmit ||
      manualTask?.linkSubmit ||
      taskRenderer?.linkSubmit ||
      state?.linkSubmit ||
      baseTask?.linkSubmit ||
      null,

    fillBlankTask:
      stateRenderer?.fillBlankTask ||
      manualTask?.fillBlankTask ||
      manualTask?.fillBlank ||
      taskRenderer?.fillBlankTask ||
      baseTask?.fillBlankTask ||
      baseTask?.fillBlank ||
      null,

    finishTask:
      stateRenderer?.finishTask ||
      manualState?.finishTask ||
      manualTask?.finishTask ||
      taskRenderer?.finishTask ||
      state?.finishTask ||
      baseTask?.finishTask ||
      null,

    feedbackRatingTask:
      stateRenderer?.feedbackRatingTask ||
      manualState?.feedbackRatingTask ||
      manualTask?.feedbackRatingTask ||
      taskRenderer?.feedbackRatingTask ||
      state?.feedbackRatingTask ||
      baseTask?.feedbackRatingTask ||
      null,

    feedbackTask:
      stateRenderer?.feedbackTask ||
      manualState?.feedbackTask ||
      manualTask?.feedbackTask ||
      taskRenderer?.feedbackTask ||
      state?.feedbackTask ||
      baseTask?.feedbackTask ||
      null,
    
    matchingConnect:
      stateRenderer?.matchingConnect ||
      manualTask?.matchingConnect ||
      taskRenderer?.matchingConnect ||
      baseTask?.matchingConnect ||
      null,

    states: Array.isArray(baseTask?.states)
      ? baseTask.states
      : state
        ? [state]
        : [],
  };

  if (rendererType === 'link-submit-task') {
    return <LinkSubmitTask {...rendererProps} task={nextTask} fullTask={task} />;
  }

  if (rendererType === 'mcq-checkbox') {
    return <McqCheckboxTask {...rendererProps} task={nextTask} fullTask={task} />;
  }

  if (rendererType === 'code-classification') {
    return <CodeClassificationTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'ide-programming') {
    return <IdeProgrammingTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'fill-blank-task') {
    const mergedTask = {
      ...nextTask,
      ...(nextTask?.fillBlankTask ? { fillBlankTask: nextTask.fillBlankTask } : {}),
    };

    return <FillBlankTask {...rendererProps} task={mergedTask} />;
  }

  if (rendererType === 'code-placeholder') {
    return <CodePlaceholderTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'typing-practice') {
    return <TypingPracticeTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'matching-connect') {
    return <MatchingConnectTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'category-dragdrop') {
    return <CategoryDragdropTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'sequence-order-task') {
    return <SequenceOrderTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'matching-dragdrop') {
    return <MatchingDragdropTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'finish-task') {
    return <FinishTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'google-slides') {
    return <GoogleSlidesTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'code-canvas') {
    return <CodeCanvasTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'diagram-canvas-task') {
    return <DiagramCanvasTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'teacher-checklist-task') {
    return <TeacherChecklistTask {...rendererProps} task={nextTask} />;
  }

  if (rendererType === 'feedback-rating-task') {
    return <FeedbackRatingTask {...rendererProps} task={nextTask} />;
  }

  return <GenericCapturedTask {...rendererProps} task={nextTask} />;
}