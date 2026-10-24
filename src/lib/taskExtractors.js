const NOISE_TEXT = new Set([
  'part',
  'attempt',
  ': 1/2',
  'my solution',
  'tasks with automatic check',
]);

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCurrentRouteKey() {
  try {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('course') || 'catalog';
    const lessonId = params.get('lesson') || 'course-home';

    return `${courseId}:${lessonId}`;
  } catch {
    return 'catalog:course-home';
  }
}

function getLocalStorageKey(taskId) {
  const routeKey = getCurrentRouteKey();
  return `lms-replica:${routeKey}:${taskId}`;
}

export function uniqueTexts(values = []) {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const text = normalizeText(value);
    if (!text) return;

    const key = text.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    result.push(text);
  });

  return result;
}

export function cleanTextLines(lines = []) {
  return uniqueTexts(lines)
    .map(normalizeText)
    .filter((line) => {
      const lower = line.toLowerCase();

      if (!line) return false;
      if (NOISE_TEXT.has(lower)) return false;
      if (/^attempt\s*:?\s*\d+\/\d+$/i.test(line)) return false;
      if (/^part\s*\d*\.?$/i.test(line)) return false;

      return true;
    });
}

export function getStates(task) {
  if (Array.isArray(task?.states)) return task.states;

  if (task?.states && typeof task.states === 'object') {
    return Object.values(task.states);
  }

  return [];
}

export function getBestState(task, predicate) {
  const states = getStates(task);
  return states.find(predicate) || states[0] || null;
}

export function getPrimaryState(task) {
  return (
    getBestState(task, (state) => Array.isArray(state.choiceOptions) && state.choiceOptions.length > 0) ||
    getBestState(task, (state) => Array.isArray(state.images) && state.images.length > 0) ||
    getBestState(task, (state) => Array.isArray(state.codeBlocks) && state.codeBlocks.length > 0) ||
    getStates(task)[0] ||
    null
  );
}

export function getUniqueImages(task) {
  const images = [];

  getStates(task).forEach((state) => {
    (state.images || []).forEach((image) => {
      const src =
        image?.localSrc ||
        image?.publicSrc ||
        image?.src ||
        image?.url ||
        image?.href;

      if (!src) return;

      const width = image.naturalWidth || image.width || image.rect?.w || 0;
      const height = image.naturalHeight || image.height || image.rect?.h || 0;

      // Chỉ bỏ ảnh nhỏ khi thật sự biết kích thước.
      // Nếu width/height = 0 do chưa capture size, vẫn giữ ảnh.
      const hasKnownSize = width > 0 || height > 0;
      if (hasKnownSize && width < 12 && height < 12) return;

      images.push({
        src,
        alt: image.alt || '',
        width,
        height,
        rect: image.rect || null,
      });
    });
  });

  const seen = new Set();

  return images.filter((image) => {
    const key = image.src;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export function guessCorrectChoices(task) {
  const score = new Map();

  getStates(task).forEach((state, stateIndex) => {
    (state.choiceOptions || []).forEach((option) => {
      if (!option.checked) return;

      const text = normalizeText(option.text);
      if (!text) return;

      const old = score.get(text) || 0;
      score.set(text, old + 1 + stateIndex * 0.01);
    });
  });

  if (!score.size) return [];

  const sorted = [...score.entries()].sort((a, b) => b[1] - a[1]);
  return [sorted[0][0]];
}

export function getMcqData(task) {
  const manualMcq =
    task?.mcqCheckbox ||
    task?.frameConfig ||
    task?.renderer?.mcqCheckbox ||
    task?.renderer?.frameConfig;

  const images = getUniqueImages(task);

  if (manualMcq?.options?.length) {
    const options = manualMcq.options.map((option, index) => ({
      id: option.id || `option-${index + 1}`,
      text: option.text || option.label || option.value || String(option),
    }));

    const choices = options.map((option) => option.text);

    const manualCorrectIds =
      manualMcq.correctOptionIds ||
      manualMcq.answerKey ||
      [];

    const manualCorrectTexts = options
      .filter((option) => manualCorrectIds.includes(option.id))
      .map((option) => option.text);

    return {
      title: manualMcq.title || task?.title || '',
      question: manualMcq.question || task?.question || '',
      prompt: manualMcq.question || task?.question || '',
      helperText: manualMcq.helperText || '',
      options,
      choices,
      answerKey: manualMcq.answerKey || manualMcq.correctOptionIds || [],
      correctOptionIds: manualMcq.correctOptionIds || manualMcq.answerKey || [],
      correctAnswers: manualMcq.correctAnswers || manualCorrectTexts,
      correctChoices: manualMcq.correctAnswers || manualCorrectTexts,
      images,
      multiple: Boolean(manualMcq.multiple),
      questionHtml: manualMcq.questionHtml || '',
    };
  }

  const states = getStates(task);

  const structuredState = states.find(
    (item) => Array.isArray(item.choiceOptions) && item.choiceOptions.length > 0,
  );

  if (structuredState) {
    const choices = uniqueTexts((structuredState.choiceOptions || []).map((option) => option.text));
    const choiceSet = new Set(choices.map((choice) => choice.toLowerCase()));

    const cleanLines = cleanTextLines(structuredState.textLines || []);
    const questionLines = cleanLines.filter((line) => !choiceSet.has(line.toLowerCase()));

    const title = questionLines[0] || task?.title || 'Question';
    const prompt = questionLines.slice(1).join('\n');

    const optionTypes = new Set((structuredState.choiceOptions || []).map((option) => option.type));
    const multiple = optionTypes.has('checkbox');

    return {
      title,
      prompt,
      choices,
      correctChoices: guessCorrectChoices(task),
      images,
      multiple,
    };
  }

  const fallbackState =
    states.find((item) => cleanTextLines(item.textLines || []).length >= 3) ||
    states.find((item) => cleanTextLines(item.textLines || []).length >= 2) ||
    getPrimaryState(task);

  const lines = cleanTextLines(fallbackState?.textLines || []);

  const title =
    lines.find((line) =>
      /choose|select|definition|correct|question|what|which/i.test(line),
    ) ||
    lines[0] ||
    task?.title ||
    'Question';

  const titleIndex = lines.findIndex((line) => line === title);

  const choices = uniqueTexts(
    lines
      .slice(titleIndex >= 0 ? titleIndex + 1 : 1)
      .filter((line) => {
        if (!line) return false;
        if (line === title) return false;
        if (/^question$/i.test(line)) return false;
        if (/^part\s*\d*\.?$/i.test(line)) return false;
        if (/^attempt\s*:?\s*\d+\/\d+$/i.test(line)) return false;
        if (/^(reset|check|next|my solution)$/i.test(line)) return false;
        return true;
      }),
  );

  return {
    title,
    prompt: '',
    choices,
    correctChoices: [],
    images,
    multiple: true,
  };
}

export function looksLikeMatchingTask(task) {
  const states = getStates(task);
  const hasChoices = states.some((state) => (state.choiceOptions || []).length > 0);

  if (hasChoices) return false;

  const primary = getPrimaryState(task);
  const lines = cleanTextLines(primary?.textLines || []);

  if (task?.activityType === 'matching_dragdrop_task') return true;
  if (lines.length >= 7) return true;
  if (/match|categorize|sequence|rule|purpose/i.test(lines.join(' '))) return true;

  return false;
}

export function getMatchingData(task) {
  const state =
    getBestState(task, (item) => cleanTextLines(item.textLines || []).length >= 5) ||
    getPrimaryState(task);

  const lines = cleanTextLines(state?.textLines || []);
  const prompt = lines[0] || task?.title || 'Match the items';
  const rest = lines.slice(1);
  const images = getUniqueImages(task);

  if (images.length > 0) {
    const terms = rest.slice(0, images.length);

    return {
      prompt,
      terms: terms.map((text, index) => ({
        id: `term-${index}`,
        text,
      })),
      targets: images.map((image, index) => ({
        id: `target-${index}`,
        label: image.alt || `Item ${index + 1}`,
        image,
      })),
    };
  }

  const half = Math.ceil(rest.length / 2);
  const left = rest.slice(0, half);
  const right = rest.slice(half);

  return {
    prompt,
    terms: left.map((text, index) => ({
      id: `term-${index}`,
      text,
    })),
    targets: right.map((text, index) => ({
      id: `target-${index}`,
      label: text,
      image: null,
    })),
  };
}

export function looksLikeIdeTask(task) {
  const text = getStates(task)
    .flatMap((state) => state.textLines || [])
    .join(' ')
    .toLowerCase();

  const hasCodeBlock = getStates(task).some((state) => (state.codeBlocks || []).length > 0);

  if (hasCodeBlock) return true;

  if (/program should|input|output|seconds have passed|automatic check|code|python|javascript/i.test(text)) {
    return true;
  }

  const type = String(task?.activityType || '').toLowerCase();
  return type.includes('ide') || type.includes('programming') || type.includes('code');
}

export function getIdeData(task) {
  const state =
    getBestState(task, (item) => Array.isArray(item.codeBlocks) && item.codeBlocks.length > 0) ||
    getPrimaryState(task);

  const lines = cleanTextLines(state?.textLines || []);
  const title =
    lines.find((line) => line.length < 80 && !/^s seconds/i.test(line)) ||
    task?.documentTitle ||
    task?.title ||
    'Programming task';

  const codeBlock = (state?.codeBlocks || [])[0] || {};
  const starterCode =
    codeBlock.text ||
    codeBlock.value ||
    codeBlock.content ||
    codeBlock.code ||
    '# Write your code here\n';

  const problemLines = lines.filter((line) => line !== title);

  return {
    title,
    problemLines,
    starterCode,
    language: codeBlock.language || task?.language || 'python',
  };
}

export function saveLocalTaskState(taskId, value) {
  try {
    localStorage.setItem(getLocalStorageKey(taskId), JSON.stringify(value));
  } catch {
    // localStorage can fail in private or restricted browser modes.
  }
}

export function loadLocalTaskState(taskId, fallback) {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(taskId));

    if (!raw) return fallback;

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}