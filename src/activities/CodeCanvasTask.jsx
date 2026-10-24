import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { loadLocalTaskState, saveLocalTaskState } from '../lib/taskExtractors.js';

const JS_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if',
  'import', 'in', 'instanceof', 'let', 'new', 'return', 'static', 'super', 'switch',
  'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
  'true', 'false', 'null', 'undefined',
]);

const JS_BUILTINS = new Set([
  'console', 'log', 'alert', 'document', 'window', 'Math', 'Array', 'Object',
  'String', 'Number', 'Boolean', 'JSON', 'Promise', 'setTimeout', 'setInterval',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'fetch', 'Error',
]);

const HTML_TAGS = new Set([
  'html', 'head', 'body', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  'form', 'input', 'button', 'label', 'select', 'option', 'textarea',
  'header', 'footer', 'main', 'nav', 'section', 'article', 'aside',
  'script', 'style', 'link', 'meta', 'title', 'br', 'hr', 'strong', 'em', 'b', 'i',
]);

const NIGHT = {
  bg: '#0d1117',
  editorBg: '#161b22',
  lineNumBg: '#0d1117',
  lineNumColor: '#484f58',
  text: '#e6edf3',
  border: '#30363d',
  tabBg: '#161b22',
  tabActive: '#0d1117',
  tabColor: '#8b949e',
  tabActiveColor: '#e6edf3',
  consoleBg: '#0d1117',
  consoleText: '#8b949e',
  panelBg: '#161b22',
  panelText: '#e6edf3',
  panelSubText: '#8b949e',
  purple: '#7c3aed',
  sidebarBg: '#010409',
  resizerBg: '#30363d',
  hintBg: '#111827',
  cardBg: '#161b22',

  ccTag: '#7ee787',
  ccKeyword: '#ff7b72',
  ccBuiltin: '#79c0ff',
  ccString: '#a5d6ff',
  ccNumber: '#f2cc60',
  ccComment: '#8b949e',
  ccProperty: '#79c0ff',
  ccClass: '#ffa657',
  ccIdent: '#e6edf3',
  ccPunct: '#8b949e',
};

const DAY = {
  bg: '#ffffff',
  editorBg: '#f6f8fa',
  lineNumBg: '#f6f8fa',
  lineNumColor: '#8c959f',
  text: '#1f2328',
  border: '#d0d7de',
  tabBg: '#f6f8fa',
  tabActive: '#ffffff',
  tabColor: '#57606a',
  tabActiveColor: '#1f2328',
  consoleBg: '#f6f8fa',
  consoleText: '#57606a',
  panelBg: '#f3f4f6',
  panelText: '#111827',
  panelSubText: '#6b7280',
  purple: '#8b3ff2',
  sidebarBg: '#f6f8fa',
  resizerBg: '#d0d7de',
  hintBg: '#fff8c5',
  cardBg: '#ffffff',

  ccTag: '#116329',
  ccKeyword: '#cf222e',
  ccBuiltin: '#0550ae',
  ccString: '#0a3069',
  ccNumber: '#953800',
  ccComment: '#6e7781',
  ccProperty: '#0550ae',
  ccClass: '#953800',
  ccIdent: '#1f2328',
  ccPunct: '#57606a',
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resolvePx(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const raw = String(value || '').trim();
  if (!raw) return fallback;

  if (raw.endsWith('vw') && typeof window !== 'undefined') {
    return Math.round(window.innerWidth * (parseFloat(raw) / 100));
  }

  if (raw.endsWith('%') && typeof window !== 'undefined') {
    return Math.round(window.innerWidth * (parseFloat(raw) / 100));
  }

  if (raw.endsWith('px')) {
    return Math.round(parseFloat(raw));
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeAssetPath(value) {
  if (!value) return '';

  let raw = String(value).trim();

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:')
  ) {
    return raw;
  }

  raw = raw.replace(/^public\//, '');
  raw = raw.replace(/^\/public\//, '/');

  if (raw.startsWith('assets/')) return `/${raw}`;
  if (raw.startsWith('/assets/')) return raw;

  return raw;
}

function slugify(value) {
  return String(value || 'task')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'task';
}

function getUrlScope() {
  if (typeof window === 'undefined') return 'page';

  const params = new URLSearchParams(window.location.search);

  return [
    params.get('course') || '',
    params.get('lesson') || '',
    params.get('page') || '',
  ].filter(Boolean).join(':') || 'page';
}

function getTaskIdentity(task) {
  const cfg = task?.codeCanvasConfig || {};

  return String(
    cfg.taskKey ||
    task?.taskId ||
    task?.id ||
    task?._taskId ||
    task?.key ||
    ''
  ).trim();
}

function getManualActivityMapUrlFromLocation() {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);
  const course = params.get('course');
  const lesson = params.get('lesson');
  const page = params.get('page');

  if (!course || !lesson || !page) return '';

  return `/manual-activity-maps/${encodeURIComponent(course)}/${encodeURIComponent(lesson)}/${encodeURIComponent(page)}.activity-map.json`;
}

function getRuntimeCodeCanvasConfig(activityMap, taskId) {
  if (!activityMap || !taskId) return null;

  const taskConfig = activityMap?.tasks?.[taskId];
  if (!taskConfig?.codeCanvasConfig) return null;

  return taskConfig.codeCanvasConfig;
}

function getTaskStorageKey(task) {
  const cfg = task?.codeCanvasConfig || {};

  const raw =
    cfg.taskKey ||
    cfg.id ||
    task?.id ||
    task?.taskId ||
    task?._taskId ||
    task?.key ||
    `${getUrlScope()}:${slugify(cfg.title || task?.title)}`;

  return `cc:${raw}:v6`;
}

function normalizeLang(value) {
  const src = String(value || '').toLowerCase();

  if (
    src === 'js' ||
    src.includes('javascript') ||
    src.includes('java-script')
  ) {
    return 'javascript';
  }

  if (src.includes('css')) return 'css';

  return 'html';
}

function langLabel(lang) {
  if (lang === 'javascript') return 'JavaScript';
  if (lang === 'css') return 'CSS';
  return 'HTML';
}

function tokenizeLine(line, lang) {
  const tokens = [];
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (lang === 'javascript' && ch === '/' && line[i + 1] === '/') {
      tokens.push({ text: line.slice(i), cls: 'cc-comment' });
      break;
    }

    if (lang === 'css' && ch === '/' && line[i + 1] === '*') {
      tokens.push({ text: line.slice(i), cls: 'cc-comment' });
      break;
    }

    if (lang === 'html' && ch === '<' && line[i + 1] === '!') {
      tokens.push({ text: line.slice(i), cls: 'cc-comment' });
      break;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;

      while (j < line.length && line[j] !== ch) {
        if (line[j] === '\\') j += 1;
        j += 1;
      }

      tokens.push({ text: line.slice(i, j + 1), cls: 'cc-string' });
      i = j + 1;
      continue;
    }

    if (lang === 'html' && ch === '<') {
      let j = i + 1;

      if (line[j] === '/') j += 1;

      let tagName = '';

      while (j < line.length && /[a-zA-Z0-9]/.test(line[j])) {
        tagName += line[j];
        j += 1;
      }

      const end = line.indexOf('>', i);
      const full = end >= 0 ? line.slice(i, end + 1) : line.slice(i);

      tokens.push({
        text: full,
        cls: HTML_TAGS.has(tagName.toLowerCase()) ? 'cc-tag' : 'cc-punctuation',
      });

      i = end >= 0 ? end + 1 : line.length;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let j = i;

      while (j < line.length && /[0-9.]/.test(line[j])) {
        j += 1;
      }

      tokens.push({ text: line.slice(i, j), cls: 'cc-number' });
      i = j;
      continue;
    }

    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i;

      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) {
        j += 1;
      }

      const word = line.slice(i, j);
      let cls = 'cc-ident';

      if (lang === 'javascript') {
        if (JS_KEYWORDS.has(word)) cls = 'cc-keyword';
        else if (JS_BUILTINS.has(word)) cls = 'cc-builtin';
        else if (/^[A-Z]/.test(word)) cls = 'cc-class';
      } else if (lang === 'css') {
        cls = 'cc-property';
      }

      tokens.push({ text: word, cls });
      i = j;
      continue;
    }

    if ('+-*/%=<>!&|^~;:.,()[]{}#@'.includes(ch)) {
      tokens.push({ text: ch, cls: 'cc-punctuation' });
      i += 1;
      continue;
    }

    tokens.push({ text: ch, cls: '' });
    i += 1;
  }

  return tokens;
}

function HighlightedCode({ code, lang }) {
  const lines = String(code || '').split('\n');

  return (
    <>
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} style={{ minHeight: '1.5em' }}>
          {line === ''
            ? '\u00a0'
            : tokenizeLine(line, lang).map((token, tokenIndex) =>
                token.cls ? (
                  <span key={tokenIndex} className={token.cls}>
                    {token.text}
                  </span>
                ) : (
                  <span key={tokenIndex}>{token.text}</span>
                )
              )}
        </div>
      ))}
    </>
  );
}

function readTaskCodeBlocks(task) {
  const states = Array.isArray(task?.states)
    ? task.states
    : Object.values(task?.states || {});

  for (const state of states) {
    for (const block of state?.codeBlocks || []) {
      const raw = block.code || block.text || block.value || '';

      if (String(raw).trim()) {
        return raw;
      }
    }
  }

  return '';
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).length > 0;
}

function normalizeFile(rawFile, index) {
  const language = normalizeLang(
    rawFile.language ||
    rawFile.lang ||
    rawFile.type ||
    rawFile.id ||
    rawFile.label
  );

  const id = rawFile.id || language || `file-${index + 1}`;
  const hintHtml = rawFile.hintHtml || rawFile.hint || rawFile.hintText || '';

  return {
    id,
    label: rawFile.label || rawFile.title || langLabel(language),
    language,
    starterCode: rawFile.starterCode ?? rawFile.initialCode ?? rawFile.code ?? '',
    hintHtml,
    hintDefaultOpen:
      rawFile.hintDefaultOpen !== undefined
        ? rawFile.hintDefaultOpen === true
        : Boolean(hintHtml),
  };
}

function normalizeFiles(task) {
  const cfg = task?.codeCanvasConfig || {};

  const rawFiles =
    Array.isArray(cfg.files) ? cfg.files :
    Array.isArray(cfg.editorTabs) ? cfg.editorTabs :
    Array.isArray(cfg.codeTabs) ? cfg.codeTabs :
    Array.isArray(cfg.tabs) ? cfg.tabs :
    null;

  if (rawFiles?.length) {
    return rawFiles.map((file, index) => normalizeFile(file, index));
  }

  const splitFiles = [];

  const htmlCode =
    cfg.htmlStarterCode ??
    cfg.initialHtml ??
    cfg.htmlCode ??
    cfg.html ??
    null;

  const cssCode =
    cfg.cssStarterCode ??
    cfg.initialCss ??
    cfg.cssCode ??
    cfg.css ??
    null;

  const jsCode =
    cfg.jsStarterCode ??
    cfg.javascriptStarterCode ??
    cfg.initialJs ??
    cfg.initialJavascript ??
    cfg.jsCode ??
    cfg.javascriptCode ??
    cfg.js ??
    cfg.javascript ??
    null;

  if (hasValue(htmlCode)) {
    splitFiles.push(normalizeFile({
      id: 'html',
      label: 'HTML',
      language: 'html',
      starterCode: htmlCode,
      hintHtml: cfg.htmlHintHtml || cfg.htmlHint || '',
      hintDefaultOpen: cfg.htmlHintDefaultOpen,
    }, splitFiles.length));
  }

  if (hasValue(cssCode)) {
    splitFiles.push(normalizeFile({
      id: 'css',
      label: 'CSS',
      language: 'css',
      starterCode: cssCode,
      hintHtml: cfg.cssHintHtml || cfg.cssHint || '',
      hintDefaultOpen: cfg.cssHintDefaultOpen,
    }, splitFiles.length));
  }

  if (hasValue(jsCode)) {
    splitFiles.push(normalizeFile({
      id: 'js',
      label: 'JavaScript',
      language: 'javascript',
      starterCode: jsCode,
      hintHtml: cfg.jsHintHtml || cfg.javascriptHintHtml || cfg.jsHint || cfg.javascriptHint || '',
      hintDefaultOpen: cfg.jsHintDefaultOpen ?? cfg.javascriptHintDefaultOpen,
    }, splitFiles.length));
  }

  if (splitFiles.length) {
    return splitFiles;
  }

  const legacyLanguage = normalizeLang(cfg.language || task?.title);
  const legacyStarterCode = cfg.starterCode ?? readTaskCodeBlocks(task);
  const legacyHintHtml = cfg.hintHtml || cfg.hint || cfg.hintText || '';

  return [
    {
      id: legacyLanguage,
      label: langLabel(legacyLanguage),
      language: legacyLanguage,
      starterCode: legacyStarterCode,
      hintHtml: legacyHintHtml,
      hintDefaultOpen:
        cfg.hintDefaultOpen !== undefined
          ? cfg.hintDefaultOpen === true
          : Boolean(legacyHintHtml),
    },
  ];
}

function getInitialCodes(files, saved, starterSignature) {
  const next = {};

  const canUseSaved =
    saved &&
    saved.starterSignature &&
    saved.starterSignature === starterSignature;

  for (const file of files) {
    next[file.id] = canUseSaved
      ? saved?.codes?.[file.id] ?? saved?.code ?? file.starterCode ?? ''
      : file.starterCode ?? '';
  }

  return next;
}

function normalizeImageList(value) {
  if (!value) return [];

  const items = Array.isArray(value) ? value : [value];

  return items
    .map((item, index) => {
      if (!item) return null;

      if (typeof item === 'string') {
        return {
          src: normalizeAssetPath(item),
          alt: `Image ${index + 1}`,
          caption: '',
        };
      }

      const src =
        item.src ||
        item.url ||
        item.image ||
        item.path ||
        item.file ||
        item.href ||
        '';

      return {
        src: normalizeAssetPath(src),
        alt: item.alt || item.title || `Image ${index + 1}`,
        caption: item.caption || '',
      };
    })
    .filter((image) => image?.src);
}

function normalizeRequirement(item, index, fallbackTitle) {
  if (typeof item === 'string') {
    return {
      id: `req-${index + 1}`,
      title: fallbackTitle || `Requirement ${index + 1}`,
      detailHtml: item,
      imagesBefore: [],
      imagesAfter: [],
      defaultOpen: true,
    };
  }

  const imageValue =
    item.image ||
    item.images ||
    item.referenceImg ||
    item.referenceImage ||
    item.sampleImage ||
    item.sampleImg;

  const imagePosition = item.imagePosition || item.position || 'after';

  return {
    id: item.id || `req-${index + 1}`,
    title: item.title || item.heading || fallbackTitle || `Requirement ${index + 1}`,
    detailHtml:
      item.detailHtml ||
      item.html ||
      item.detail ||
      item.body ||
      item.description ||
      item.instructions ||
      '',
    imagesBefore: normalizeImageList(
      item.imagesBefore ||
      item.beforeImages ||
      (imagePosition === 'before' ? imageValue : null)
    ),
    imagesAfter: normalizeImageList(
      item.imagesAfter ||
      item.afterImages ||
      (imagePosition !== 'before' ? imageValue : null)
    ),
    defaultOpen: item.defaultOpen !== false,
  };
}

function getPanelData(task) {
  const cfg = task?.codeCanvasConfig || {};
  const sidebar = cfg.sidebar || cfg.panel || {};

  const heading =
    sidebar.heading ||
    sidebar.title ||
    cfg.panelHeading ||
    cfg.heading ||
    cfg.title ||
    task?.title ||
    'Task';

  const autoCheckLabel =
    sidebar.autoCheckLabel ||
    cfg.autoCheckLabel ||
    'TASKS WITH AUTOMATIC CHECK';

  const rawRequirements =
    cfg.requirements ||
    cfg.requirementCards ||
    cfg.checklist ||
    cfg.tasks ||
    cfg.instructions ||
    cfg.instruction ||
    cfg.description;

  let requirements = [];

  if (Array.isArray(rawRequirements)) {
    requirements = rawRequirements.map((item, index) =>
      normalizeRequirement(item, index, heading)
    );
  } else if (rawRequirements) {
    requirements = [normalizeRequirement(rawRequirements, 0, heading)];
  }

  if (!requirements.length) {
    requirements = [
      {
        id: 'default-req',
        title: heading,
        detailHtml: 'Edit the code in the editor and check the Result tab.',
        imagesBefore: [],
        imagesAfter: [],
        defaultOpen: true,
      },
    ];
  }

  const previewImages = normalizeImageList(
    sidebar.previewImages ||
    sidebar.previewImage ||
    cfg.previewImages ||
    cfg.previewImage ||
    cfg.panelPreviewImages ||
    cfg.panelPreviewImage
  );

  const previewDefaultOpen =
    sidebar.previewDefaultOpen !== undefined
      ? sidebar.previewDefaultOpen !== false
      : cfg.previewDefaultOpen !== undefined
        ? cfg.previewDefaultOpen !== false
        : true;

  return {
    heading,
    autoCheckLabel,
    requirements,
    previewImages,
    previewDefaultOpen,
  };
}

function getReferenceImages(task) {
  const cfg = task?.codeCanvasConfig || {};
  const reference = cfg.reference || {};
  const sample = cfg.sample || {};

  return normalizeImageList(
    cfg.referenceImages ||
    cfg.referenceImage ||
    cfg.referenceImg ||
    cfg.referenceUrl ||
    cfg.sampleImages ||
    cfg.sampleImage ||
    cfg.sampleImg ||
    cfg.previewImage ||
    cfg.previewImg ||
    cfg.sampleTabImage ||
    reference.images ||
    reference.image ||
    reference.img ||
    sample.images ||
    sample.image ||
    sample.img
  );
}

function escapeScript(code) {
  return String(code || '').replace(/<\/script/gi, '<\\/script');
}

function buildConsoleBridgeScript() {
  return `
<script>
(function () {
  function safeString(value) {
    try {
      if (typeof value === 'string') return value;
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  }

  function send(type, args) {
    try {
      window.parent.postMessage({
        source: 'code-canvas-console',
        type: type,
        args: Array.prototype.slice.call(args).map(safeString)
      }, '*');
    } catch (err) {}
  }

  ['log', 'info', 'warn', 'error'].forEach(function (type) {
    var original = console[type];

    console[type] = function () {
      send(type, arguments);

      if (original) {
        original.apply(console, arguments);
      }
    };
  });

  window.addEventListener('error', function (event) {
    send('error', [event.message || 'Script error']);
  });
})();
</script>
`;
}

function buildSrcDoc(files, codes, task) {
  const cfg = task?.codeCanvasConfig || {};

  const htmlCode = files
    .filter((file) => file.language === 'html')
    .map((file) => codes[file.id] || '')
    .join('\n\n');

  const cssCode = files
    .filter((file) => file.language === 'css')
    .map((file) => codes[file.id] || '')
    .join('\n\n');

  const jsCode = files
    .filter((file) => file.language === 'javascript')
    .map((file) => codes[file.id] || '')
    .join('\n\n');

  const styleTag = cssCode ? `<style>\n${cssCode}\n</style>` : '';

  const shouldInjectJs = Boolean(jsCode.trim());
  const consoleBridge = shouldInjectJs ? buildConsoleBridgeScript() : '';
  const scriptTag = shouldInjectJs
    ? `<script>\n${escapeScript(jsCode)}\n</script>`
    : '';

  if (/<html[\s>]/i.test(htmlCode) || /<!doctype/i.test(htmlCode)) {
    let doc = htmlCode;

    if (styleTag) {
      doc = /<\/head>/i.test(doc)
        ? doc.replace(/<\/head>/i, `${styleTag}\n</head>`)
        : `${styleTag}\n${doc}`;
    }

    const scripts = [consoleBridge, scriptTag].filter(Boolean).join('\n');

    if (scripts) {
      doc = /<\/body>/i.test(doc)
        ? doc.replace(/<\/body>/i, `${scripts}\n</body>`)
        : `${doc}\n${scripts}`;
    }

    return doc;
  }

  const previewHtml = cfg.previewHtml || cfg.bodyHtml || htmlCode || '';
  const scripts = [consoleBridge, scriptTag].filter(Boolean).join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
${styleTag}
</head>
<body>
${previewHtml}
${scripts}
</body>
</html>`;
}

function useResize(initialPx, minPx, maxPx, direction = 'horizontal', onDragChange, invert = false) {
  const [size, setSize] = useState(clamp(initialPx, minPx, maxPx));
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(initialPx);

  const onMouseDown = useCallback((event) => {
    dragging.current = true;
    startPos.current = direction === 'horizontal' ? event.clientX : event.clientY;
    startSize.current = size;
    onDragChange?.(true, direction);
    event.preventDefault();
  }, [size, direction, onDragChange]);

  useEffect(() => {
    function onMove(event) {
      if (!dragging.current) return;

      const delta = direction === 'horizontal'
        ? event.clientX - startPos.current
        : event.clientY - startPos.current;

      const realDelta = invert ? -delta : delta;
      setSize(clamp(startSize.current + realDelta, minPx, maxPx));
    }

    function onUp() {
      if (!dragging.current) return;

      dragging.current = false;
      onDragChange?.(false, direction);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [direction, minPx, maxPx, onDragChange, invert]);

  return [size, onMouseDown, setSize];
}

function getDefaultHintOpen(file, saved) {
  if (saved?.hintOpen !== undefined) return saved.hintOpen;

  if (!file?.hintHtml) return false;

  return file.hintDefaultOpen !== false;
}

export default function CodeCanvasTask({
  task,
  onTaskCompleted,
}) {
  const [runtimeCodeCanvasConfig, setRuntimeCodeCanvasConfig] = useState(null);

  const effectiveTask = useMemo(() => {
    const baseConfig = task?.codeCanvasConfig || {};

    if (!runtimeCodeCanvasConfig) {
      return task;
    }

    return {
      ...task,
      codeCanvasConfig: {
        ...baseConfig,
        ...runtimeCodeCanvasConfig,
      },
    };
  }, [task, runtimeCodeCanvasConfig]);

  const cfg = effectiveTask?.codeCanvasConfig || {};
  const layout = cfg.layout || {};

  const files = useMemo(() => normalizeFiles(effectiveTask), [effectiveTask]);
  const filesSignature = useMemo(
    () => files.map((file) => `${file.id}:${file.language}:${file.starterCode}:${file.hintHtml}`).join('|'),
    [files]
  );

  const panelData = useMemo(() => getPanelData(effectiveTask), [effectiveTask]);
  const referenceImages = useMemo(() => getReferenceImages(effectiveTask), [effectiveTask]);
  const storageKey = useMemo(() => getTaskStorageKey(effectiveTask), [effectiveTask]);

  const initialSaved = loadLocalTaskState(storageKey, null);
  const initialActiveFileId = initialSaved?.activeFileId || files[0]?.id || 'html';
  const initialActiveFile = files.find((file) => file.id === initialActiveFileId) || files[0];

  const panelWidth = resolvePx(layout.panelWidth, 390);
  const purpleWidth = resolvePx(layout.purpleWidth, 26);

  const defaultAvailableWidth =
    typeof window !== 'undefined'
      ? Math.max(800, window.innerWidth - 48 - panelWidth - purpleWidth - 14)
      : 1400;

  const editorMinWidth = resolvePx(layout.editorMinWidth, 420);
  const editorMaxWidth = resolvePx(layout.editorMaxWidth, Math.max(editorMinWidth + 100, defaultAvailableWidth - 360));
  const editorInitialWidth = resolvePx(layout.editorInitialWidth, Math.round(defaultAvailableWidth / 2));

  const consoleMinHeight = resolvePx(layout.consoleMinHeight, 34);
  const consoleMaxHeight = resolvePx(layout.consoleMaxHeight, 560);
  const consoleInitialHeight = resolvePx(layout.consoleInitialHeight, 120);

  const [stateKey, setStateKey] = useState(storageKey);
  const [codes, setCodes] = useState(() => getInitialCodes(files, initialSaved, filesSignature));
  const [activeFileId, setActiveFileId] = useState(initialActiveFileId);
  const [nightMode, setNightMode] = useState(initialSaved?.nightMode ?? true);
  const [activeTab, setActiveTab] = useState(initialSaved?.activeTab ?? 'reference');
  const [panelOpen, setPanelOpen] = useState(initialSaved?.panelOpen ?? true);
  const [hintOpen, setHintOpen] = useState(getDefaultHintOpen(initialActiveFile, initialSaved));
  const [consoleLines, setConsoleLines] = useState([]);
  const [runToken, setRunToken] = useState(0);
  const [imageModal, setImageModal] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState('horizontal');

  const T = nightMode ? NIGHT : DAY;

  useEffect(() => {
    const taskId = getTaskIdentity(task);
    const manualUrl = getManualActivityMapUrlFromLocation();

    if (!taskId || !manualUrl) return;

    let cancelled = false;

    fetch(`${manualUrl}?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((activityMap) => {
        if (cancelled) return;

        const nextConfig = getRuntimeCodeCanvasConfig(activityMap, taskId);

        if (nextConfig) {
          setRuntimeCodeCanvasConfig(nextConfig);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [task]);

  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const lineNumRef = useRef(null);

  const onDragChange = useCallback((value, direction) => {
    setIsDragging(value);
    setDragDirection(direction || 'horizontal');
  }, []);

  const [editorW, editorResizeDown] = useResize(
    editorInitialWidth,
    editorMinWidth,
    editorMaxWidth,
    'horizontal',
    onDragChange
  );

  const [consoleH, consoleResizeDown] = useResize(
    consoleInitialHeight,
    consoleMinHeight,
    consoleMaxHeight,
    'vertical',
    onDragChange,
    true
  );

  const activeFile = files.find((file) => file.id === activeFileId) || files[0];
  const activeCode = codes[activeFile?.id] ?? activeFile?.starterCode ?? '';

  const srcDoc = useMemo(() => {
    return buildSrcDoc(files, codes, effectiveTask);
  }, [files, codes, effectiveTask]);

  useEffect(() => {
    const saved = loadLocalTaskState(storageKey, null);
    const nextActiveFileId = saved?.activeFileId || files[0]?.id || 'html';
    const nextActiveFile = files.find((file) => file.id === nextActiveFileId) || files[0];

    setCodes(getInitialCodes(files, saved, filesSignature));
    setActiveFileId(nextActiveFileId);
    setNightMode(saved?.nightMode ?? true);
    setActiveTab(saved?.activeTab ?? 'reference');
    setPanelOpen(saved?.panelOpen ?? true);
    setHintOpen(getDefaultHintOpen(nextActiveFile, saved));
    setConsoleLines([]);
    setStateKey(storageKey);
  }, [storageKey, filesSignature]);

  useEffect(() => {
    if (stateKey !== storageKey) return;

    saveLocalTaskState(storageKey, {
      codes,
      activeFileId,
      nightMode,
      activeTab,
      panelOpen,
      hintOpen,
      starterSignature: filesSignature,
    });
  }, [stateKey, storageKey, codes, activeFileId, nightMode, activeTab, panelOpen, hintOpen, filesSignature]);

  useEffect(() => {
    function onMessage(event) {
      const data = event.data;

      if (!data || data.source !== 'code-canvas-console') return;

      const line = {
        id: `${Date.now()}-${Math.random()}`,
        type: data.type || 'log',
        text: Array.isArray(data.args) ? data.args.join(' ') : String(data.args || ''),
      };

      setConsoleLines((prev) => [...prev.slice(-199), line]);
    }

    window.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  function setCodeForActive(value) {
    if (!activeFile) return;

    setCodes((prev) => ({
      ...prev,
      [activeFile.id]: value,
    }));
  }

  function reset() {
    setCodes(getInitialCodes(files, null, filesSignature));
    setConsoleLines([]);
    setRunToken((value) => value + 1);
  }

  function run() {
    setConsoleLines([]);
    setRunToken((value) => value + 1);
  }

  function check() {
    run();

    const submittedFiles = files.map((file) => ({
      id: file.id,
      name: file.name,
      language: file.language,
      code: String(codes[file.id] || ''),
    }));

    const hasSource = submittedFiles.some((file) =>
      file.code.trim(),
    );

    if (!hasSource) {
      return;
    }

    onTaskCompleted?.({
      completionType: 'submitted',
      needsReview: true,
      feedback: 'Code canvas submitted for review.',
      metadata: {
        taskId: getTaskIdentity(effectiveTask),
        files: submittedFiles,
      },
    });
  }

  function selectFile(file) {
    setActiveFileId(file.id);

    if (file.hintHtml && file.hintDefaultOpen !== false) {
      setHintOpen(true);
    }
  }

  function handleScroll(event) {
    const { scrollTop, scrollLeft } = event.currentTarget;

    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }

    if (lineNumRef.current) {
      lineNumRef.current.scrollTop = scrollTop;
    }
  }

  function handleKeyDown(event) {
    if (event.key !== 'Tab') return;

    event.preventDefault();

    const start = event.currentTarget.selectionStart;
    const end = event.currentTarget.selectionEnd;
    const next = activeCode.slice(0, start) + '  ' + activeCode.slice(end);

    setCodeForActive(next);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;

      textareaRef.current.selectionStart = start + 2;
      textareaRef.current.selectionEnd = start + 2;
    });
  }

  function renderReferenceTab() {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: referenceImages.length ? 'flex-start' : 'center',
          justifyContent: 'center',
          overflow: 'auto',
          background: T.bg,
          padding: referenceImages.length ? 16 : 0,
          boxSizing: 'border-box',
        }}
      >
        {referenceImages.length ? (
          <div style={{ width: '100%', display: 'grid', gap: 16 }}>
            {referenceImages.map((image, index) => (
              <div
                key={`${image.src}-${index}`}
                style={{
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 210px)',
                    objectFit: 'contain',
                    borderRadius: 4,
                    background: '#fff',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />

                {image.caption && (
                  <div
                    style={{
                      marginTop: 8,
                      color: T.consoleText,
                      fontSize: 12,
                    }}
                  >
                    {image.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span style={{ color: T.consoleText, fontSize: 13 }}>
            No reference image available.
          </span>
        )}
      </div>
    );
  }

  function renderResultTab() {
    return (
      <iframe
        key={`result-${runToken}`}
        srcDoc={srcDoc}
        style={{
          flex: 1,
          border: 'none',
          background: '#ffffff',
          width: '100%',
          display: 'block',
        }}
        sandbox="allow-scripts"
        title="Result"
      />
    );
  }

  function renderOverlayTab() {
    const overlayImage = referenceImages[0];

    return (
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: T.bg,
        }}
      >
        {overlayImage && (
          <img
            src={overlayImage.src}
            alt={overlayImage.alt}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: 0.42,
              pointerEvents: 'none',
            }}
          />
        )}

        <iframe
          key={`overlay-${runToken}`}
          srcDoc={srcDoc}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
          }}
          sandbox="allow-scripts"
          title="Overlay"
        />

        {!overlayImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.consoleText,
              fontSize: 13,
            }}
          >
            No reference image for overlay.
          </div>
        )}
      </div>
    );
  }

  function renderTabContent() {
    if (activeTab === 'reference') return renderReferenceTab();
    if (activeTab === 'overlay') return renderOverlayTab();

    return renderResultTab();
  }

  const lineCount = Math.max(String(activeCode || '').split('\n').length, 1);

  const monoStyle = {
    fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
    fontSize: 13,
    lineHeight: '1.5em',
  };

  const cssVars = {
    '--cc-keyword': T.ccKeyword,
    '--cc-builtin': T.ccBuiltin,
    '--cc-string': T.ccString,
    '--cc-number': T.ccNumber,
    '--cc-comment': T.ccComment,
    '--cc-tag': T.ccTag,
    '--cc-property': T.ccProperty,
    '--cc-class': T.ccClass,
    '--cc-ident': T.ccIdent,
    '--cc-punct': T.ccPunct,
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        background: T.bg,
        color: T.text,
        overflow: 'hidden',
        fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        cursor: isDragging ? (dragDirection === 'vertical' ? 'row-resize' : 'col-resize') : 'default',
        userSelect: isDragging ? 'none' : 'auto',
        ...cssVars,
      }}
    >
      {isDragging && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            cursor: dragDirection === 'vertical' ? 'row-resize' : 'col-resize',
          }}
        />
      )}

      <div
        style={{
          width: 48,
          background: T.sidebarBg,
          borderRight: `1px solid ${T.border}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          gap: 8,
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        <SideBtn color="#22c55e" title="Run" onClick={run}>▶</SideBtn>

        <SideBtn
          color={nightMode ? '#a78bfa' : '#f59e0b'}
          title={nightMode ? 'Night mode' : 'Day mode'}
          onClick={() => setNightMode((value) => !value)}
        >
          {nightMode ? '🌙' : '☀️'}
        </SideBtn>

        <SideBtn color="#22c55e" title="Submit for review" onClick={check}>✓</SideBtn>
        <SideBtn color="#ef4444" title="Reset" onClick={reset}>↺</SideBtn>
      </div>

      <div
        style={{
          width: editorW,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: T.editorBg,
          borderRight: `1px solid ${T.border}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${T.border}`,
            background: T.tabBg,
            flexShrink: 0,
            minHeight: 36,
          }}
        >
          {files.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => selectFile(file)}
              style={{
                padding: '9px 14px',
                border: 'none',
                borderBottom: activeFile?.id === file.id ? `2px solid ${T.purple}` : '2px solid transparent',
                background: activeFile?.id === file.id ? T.tabActive : 'transparent',
                color: activeFile?.id === file.id ? T.tabActiveColor : T.tabColor,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: activeFile?.id === file.id ? 800 : 600,
                letterSpacing: '0.02em',
              }}
            >
              {file.label}
            </button>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <pre
            ref={lineNumRef}
            style={{
              ...monoStyle,
              margin: 0,
              padding: '8px 8px 8px 12px',
              background: T.lineNumBg,
              color: T.lineNumColor,
              borderRight: `1px solid ${T.border}`,
              textAlign: 'right',
              overflow: 'hidden',
              userSelect: 'none',
              flexShrink: 0,
              minWidth: 36,
            }}
          >
            {Array.from({ length: lineCount }, (_, index) => (
              <div key={index} style={{ lineHeight: '1.5em' }}>
                {index + 1}
              </div>
            ))}
          </pre>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <pre
              ref={highlightRef}
              aria-hidden
              style={{
                ...monoStyle,
                margin: 0,
                padding: '8px 16px',
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
                color: T.text,
                whiteSpace: 'pre',
                wordBreak: 'normal',
              }}
            >
              <HighlightedCode code={activeCode} lang={activeFile?.language || 'html'} />
            </pre>

            <textarea
              ref={textareaRef}
              value={activeCode}
              onChange={(event) => setCodeForActive(event.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              style={{
                ...monoStyle,
                position: 'absolute',
                inset: 0,
                margin: 0,
                padding: '8px 16px',
                background: 'transparent',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
                caretColor: T.text,
                border: 'none',
                outline: 'none',
                resize: 'none',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                whiteSpace: 'pre',
                wordBreak: 'normal',
                overflowWrap: 'normal',
              }}
            />
          </div>
        </div>
      </div>

      <div
        onMouseDown={editorResizeDown}
        style={{
          width: 5,
          background: T.resizerBg,
          cursor: 'col-resize',
          flexShrink: 0,
          transition: 'background 0.15s',
          zIndex: 1,
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = T.purple;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = T.resizerBg;
        }}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          borderRight: `1px solid ${T.border}`,
          background: T.bg,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${T.border}`,
            background: T.tabBg,
            flexShrink: 0,
            minHeight: 36,
          }}
        >
          {['reference', 'result', 'overlay'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 18px',
                fontSize: 12,
                fontFamily: 'system-ui,sans-serif',
                background: activeTab === tab ? T.tabActive : 'transparent',
                color: activeTab === tab ? T.tabActiveColor : T.tabColor,
                border: 'none',
                borderBottom: activeTab === tab ? `2px solid ${T.purple}` : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 800 : 600,
                textTransform: 'capitalize',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
            position: 'relative',
          }}
        >
          {renderTabContent()}
          {isDragging && <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} />}
        </div>

        <div
          onMouseDown={consoleResizeDown}
          style={{
            height: 5,
            background: T.resizerBg,
            cursor: 'row-resize',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = T.purple;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = T.resizerBg;
          }}
        />

        <div
          style={{
            height: consoleH,
            background: T.consoleBg,
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '4px 12px',
              fontSize: 11,
              color: T.consoleText,
              borderBottom: `1px solid ${T.border}`,
              letterSpacing: '0.05em',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            Console
          </div>

          <div
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: 12,
              color: T.consoleText,
              fontFamily: 'monospace',
              overflow: 'auto',
            }}
          >
            {consoleLines.map((line) => (
              <div
                key={line.id}
                style={{
                  color:
                    line.type === 'error' ? '#ef4444' :
                    line.type === 'warn' ? '#f59e0b' :
                    T.consoleText,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                }}
              >
                {line.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPanelOpen((value) => !value)}
        title={panelOpen ? 'Close task panel' : 'Open task panel'}
        style={{
          width: purpleWidth,
          background: T.purple,
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          opacity: 0.98,
          padding: 0,
          zIndex: 1,
          position: 'relative',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.opacity = '0.98';
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 4,
            height: 62,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.95)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </button>

      {panelOpen && (
        <div
          style={{
            width: panelWidth,
            flexShrink: 0,
            background: T.panelBg,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderLeft: `1px solid ${T.border}`,
          }}
        >
          {panelData.previewImages?.length ? (
            <PanelPreviewCard
              heading={panelData.heading}
              images={panelData.previewImages}
              defaultOpen={panelData.previewDefaultOpen}
              T={T}
              onImageClick={setImageModal}
            />
          ) : (
            <div
              style={{
                padding: '22px 22px 18px',
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: T.panelText,
                  lineHeight: 1.35,
                }}
              >
                {panelData.heading}
              </div>
            </div>
          )}

          <div
            style={{
              padding: '14px 22px',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: T.panelSubText,
                letterSpacing: '0.11em',
                textTransform: 'uppercase',
              }}
            >
              {panelData.autoCheckLabel}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '0 0 18px',
            }}
          >
            {panelData.requirements.map((requirement) => (
              <InstructionCard
                key={requirement.id}
                requirement={requirement}
                T={T}
                onImageClick={setImageModal}
              />
            ))}
          </div>
        </div>
      )}

      {imageModal && (
        <button
          type="button"
          onClick={() => setImageModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.78)',
            border: 'none',
            padding: 30,
            cursor: 'zoom-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={imageModal.src}
            alt={imageModal.alt}
            style={{
              maxWidth: '96vw',
              maxHeight: '92vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              background: '#ffffff',
            }}
          />
        </button>
      )}

      <style>{`
        .cc-keyword     { color: var(--cc-keyword); }
        .cc-builtin     { color: var(--cc-builtin); }
        .cc-string      { color: var(--cc-string); }
        .cc-number      { color: var(--cc-number); }
        .cc-comment     { color: var(--cc-comment); font-style: italic; }
        .cc-tag         { color: var(--cc-tag); }
        .cc-property    { color: var(--cc-property); }
        .cc-class       { color: var(--cc-class); }
        .cc-ident       { color: var(--cc-ident); }
        .cc-punctuation { color: var(--cc-punct); }

        .cc-rich-text p {
          margin: 0 0 10px;
        }

        .cc-rich-text p:last-child {
          margin-bottom: 0;
        }

        .cc-rich-text code {
          font-family: "JetBrains Mono", "Fira Code", monospace;
          font-size: 0.92em;
          padding: 1px 4px;
          border-radius: 4px;
          background: rgba(127, 127, 127, 0.18);
        }

        .cc-rich-text ul,
        .cc-rich-text ol {
          margin: 8px 0 8px 18px;
          padding: 0;
        }

        .cc-rich-text img {
          max-width: 100%;
          border-radius: 6px;
        }

        .cc-rich-text a {
          color: inherit;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

function SideBtn({ color, title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: color,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        color: '#ffffff',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function RichText({ html }) {
  const raw = String(html || '');

  if (!raw.trim()) return null;

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  const finalHtml = looksLikeHtml ? raw : raw.replace(/\n/g, '<br />');

  return (
    <div
      className="cc-rich-text"
      dangerouslySetInnerHTML={{ __html: finalHtml }}
    />
  );
}

function PanelPreviewCard({ heading, images, defaultOpen, T, onImageClick }) {
  const [open, setOpen] = useState(defaultOpen !== false);

  return (
    <div
      style={{
        padding: '18px 18px 16px',
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          background: T.cardBg,
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: T.panelText,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            textAlign: 'left',
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            {heading}
          </span>

          <span
            style={{
              color: T.purple,
              fontSize: 22,
              lineHeight: 1,
              fontWeight: 800,
            }}
          >
            {open ? '⌃' : '⌄'}
          </span>
        </button>

        {open && (
          <div
            style={{
              padding: '0 18px 18px',
              display: 'grid',
              gap: 12,
            }}
          >
            {images.map((image, index) => (
              <div key={`${image.src}-${index}`}>
                <button
                  type="button"
                  onClick={() => onImageClick?.(image)}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    margin: 0,
                    cursor: 'zoom-in',
                    display: 'block',
                  }}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    style={{
                      width: '100%',
                      maxHeight: 360,
                      objectFit: 'contain',
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      background: '#ffffff',
                      display: 'block',
                    }}
                  />
                </button>

                {image.caption && (
                  <div
                    style={{
                      marginTop: 6,
                      color: T.panelSubText,
                      fontSize: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    {image.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequirementImage({ image, T, onImageClick }) {
  return (
    <button
      type="button"
      onClick={() => onImageClick(image)}
      style={{
        width: '100%',
        border: 'none',
        background: 'transparent',
        padding: 0,
        margin: '0 0 12px',
        cursor: 'zoom-in',
        textAlign: 'left',
      }}
    >
      <img
        src={image.src}
        alt={image.alt}
        style={{
          width: '100%',
          maxHeight: 240,
          objectFit: 'contain',
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: '#ffffff',
          display: 'block',
        }}
      />

      {image.caption && (
        <div
          style={{
            marginTop: 6,
            color: T.panelSubText,
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          {image.caption}
        </div>
      )}
    </button>
  );
}

function InstructionCard({ requirement, T, onImageClick }) {
  const [open, setOpen] = useState(requirement.defaultOpen !== false);

  return (
    <div
      style={{
        margin: '12px 12px 0',
        border: `1px solid ${T.border}`,
        borderRadius: 9,
        overflow: 'hidden',
        background: T.cardBg,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '13px 15px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: T.panelText,
          fontSize: 14,
          fontWeight: 800,
          textAlign: 'left',
          lineHeight: 1.35,
        }}
      >
        <span>{requirement.title}</span>

        <span
          style={{
            fontSize: 18,
            color: T.panelSubText,
            lineHeight: 1,
          }}
        >
          {open ? '⌃' : '⌄'}
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 15px 16px' }}>
          {requirement.imagesBefore.map((image, index) => (
            <RequirementImage
              key={`before-${image.src}-${index}`}
              image={image}
              T={T}
              onImageClick={onImageClick}
            />
          ))}

          {requirement.detailHtml && (
            <div
              style={{
                margin: requirement.imagesAfter.length ? '0 0 12px' : 0,
                color: T.panelSubText,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <RichText html={requirement.detailHtml} />
            </div>
          )}

          {requirement.imagesAfter.map((image, index) => (
            <RequirementImage
              key={`after-${image.src}-${index}`}
              image={image}
              T={T}
              onImageClick={onImageClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}