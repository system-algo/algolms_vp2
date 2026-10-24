import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './MatchingConnectTask.css';
import LmsActivityFrame from '../components/LmsActivityFrame.jsx';
import {
  cleanTextLines,
  getStates,
  loadLocalTaskState,
  saveLocalTaskState,
} from '../lib/taskExtractors.js';

const LINE_COLORS = ['#f6cf28', '#873bea', '#68dfee', '#ff7a59', '#22c55e', '#3b82f6'];

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase().replace(/\n/g, ' ');
}

function getTaskId(task) {
  return String(task?.id || task?.taskId || '').trim();
}

function toItem(rawItem, index, prefix) {
  if (typeof rawItem === 'string') {
    return {
      id: `${prefix}-${index + 1}`,
      text: normalizeText(rawItem),
      image: '',
      alt: '',
      raw: rawItem,
    };
  }

  const image = normalizeText(
    rawItem?.image ||
    rawItem?.imageUrl ||
    rawItem?.img ||
    rawItem?.src ||
    rawItem?.asset ||
    rawItem?.url ||
    rawItem?.href ||
    '',
  );

  const text = normalizeText(
    rawItem?.text ||
    rawItem?.label ||
    rawItem?.title ||
    rawItem?.name ||
    rawItem?.value ||
    rawItem?.caption ||
    '',
  );

  return {
    id: String(
      rawItem?.id ||
      rawItem?.itemId ||
      rawItem?.leftId ||
      rawItem?.rightId ||
      rawItem?.targetId ||
      `${prefix}-${index + 1}`,
    ),
    text,
    image,
    alt: normalizeText(rawItem?.alt || rawItem?.ariaLabel || text || ''),
    raw: rawItem,
  };
}

function getItemImage(item) {
  return normalizeText(
    item?.image ||
    item?.imageUrl ||
    item?.img ||
    item?.src ||
    item?.asset ||
    item?.url ||
    item?.raw?.image ||
    item?.raw?.imageUrl ||
    item?.raw?.img ||
    item?.raw?.src ||
    item?.raw?.asset ||
    item?.raw?.url ||
    '',
  );
}

function getItemText(item) {
  return normalizeText(
    item?.text ||
    item?.label ||
    item?.title ||
    item?.name ||
    item?.value ||
    item?.alt ||
    item?.raw?.text ||
    item?.raw?.label ||
    item?.raw?.title ||
    item?.raw?.name ||
    item?.raw?.value ||
    item?.raw?.alt ||
    '',
  );
}

function getItemAriaLabel(item) {
  return getItemText(item) || item?.alt || item?.id || 'image option';
}

function renderItemContent(item) {
  const image = getItemImage(item);
  const text = getItemText(item);

  if (image) {
    return (
      <span className="matching-connect-label matching-connect-label--image">
        <span className="matching-connect-image-box">
          <img
            className="matching-connect-image"
            src={image}
            alt={item?.alt || text || ''}
            draggable={false}
          />
        </span>
      </span>
    );
  }

  return (
    <span className="matching-connect-label">
      {text}
    </span>
  );
}

function sameValue(value, item) {
  const text = normalizeKey(value);
  if (!text || !item) return false;

  return (
    text === normalizeKey(item.id) ||
    text === normalizeKey(item.text) ||
    text === normalizeKey(item.alt) ||
    text === normalizeKey(item.image) ||
    text === normalizeKey(item.raw?.id) ||
    text === normalizeKey(item.raw?.text) ||
    text === normalizeKey(item.raw?.alt) ||
    text === normalizeKey(item.raw?.image)
  );
}

function hasConnectShape(value) {
  if (!value || typeof value !== 'object') return false;

  const hasLeft =
    Array.isArray(value.leftItems) ||
    Array.isArray(value.left) ||
    Array.isArray(value.terms) ||
    Array.isArray(value.sources);

  const hasRight =
    Array.isArray(value.rightItems) ||
    Array.isArray(value.right) ||
    Array.isArray(value.targets) ||
    Array.isArray(value.definitions);

  return hasLeft && hasRight;
}

function findConnectConfig(value, depth = 0, seen = new Set()) {
  if (!value || typeof value !== 'object' || depth > 8) return null;
  if (seen.has(value)) return null;

  seen.add(value);

  if (hasConnectShape(value)) return value;

  const preferredKeys = [
    'matchingConnect',
    'matching_connect',
    'connect',
    'data',
    'config',
    'renderer',
    'activity',
    'payload',
  ];

  for (const key of preferredKeys) {
    if (value[key]) {
      const found = findConnectConfig(value[key], depth + 1, seen);
      if (found) return found;
    }
  }

  for (const child of Object.values(value)) {
    const found = findConnectConfig(child, depth + 1, seen);
    if (found) return found;
  }

  return null;
}

function getRendererConfig(pageInstance, task, state) {
  const taskId = getTaskId(task);
  const taskRenderer = taskId ? pageInstance?.taskRenderers?.[taskId] : null;

  return (
    findConnectConfig(taskRenderer) ||
    findConnectConfig(task) ||
    findConnectConfig(state) ||
    null
  );
}

function isNoiseLine(line) {
  const lower = normalizeKey(line);

  if (!lower) return true;
  if (lower === 'part 1.') return true;
  if (/^part\s*\d*\.?$/i.test(lower)) return true;
  if (/^attempt\s*:?\s*\d+\/\d+$/i.test(lower)) return true;
  if (lower.includes('all names have been placed')) return true;
  if (lower.includes('click after choosing')) return true;
  if (lower.includes('take the course from a computer')) return true;
  if (lower.includes('will not open from other browsers')) return true;
  if (lower.includes('google chrome browser')) return true;
  if (lower === 'check') return true;
  if (lower === 'reset') return true;
  if (lower === 'next') return true;

  return false;
}

function isHtmlTagLine(line) {
  const text = normalizeText(line);
  return /^<\s*\/?\s*[a-z][a-z0-9-]*[\s\S]*?>/i.test(text);
}

function getWordCount(line) {
  const text = normalizeText(line);
  if (!text) return 0;

  return text.split(/\s+/).filter(Boolean).length;
}

function isLikelyDefinitionLine(line) {
  const text = normalizeText(line);
  const lower = normalizeKey(text);

  if (!lower) return false;
  if (isHtmlTagLine(text)) return false;

  const wordCount = getWordCount(text);

  if (wordCount >= 5) return true;

  if (/^(a|an|the)\s+/i.test(lower)) return true;

  if (
    /\b(that|which|with|for|from|when|where|stores|contains|allows|helps|used|service|system|folder|history|information|purpose|state|project|changes|interacting)\b/i.test(lower)
  ) {
    return true;
  }

  if (/[.!?]$/.test(text) && wordCount >= 3) return true;

  return false;
}

function applyKnownGitRightOrder(leftItems, rightItems) {
  const leftKeys = new Set(leftItems.map((item) => normalizeKey(item)));

  const isGitTask =
    leftKeys.has('github') &&
    leftKeys.has('git') &&
    leftKeys.has('repository') &&
    leftKeys.has('commit');

  if (!isGitTask || rightItems.length !== 4) {
    return rightItems;
  }

  const orderRules = [
    /remote folder.*project.*change history/i,
    /set of changes.*state.*project.*time of commit/i,
    /version control system/i,
    /service.*interacting.*git/i,
  ];

  const usedIndexes = new Set();
  const ordered = [];

  orderRules.forEach((rule) => {
    const index = rightItems.findIndex((item, itemIndex) => (
      !usedIndexes.has(itemIndex) && rule.test(normalizeText(item))
    ));

    if (index >= 0) {
      usedIndexes.add(index);
      ordered.push(rightItems[index]);
    }
  });

  if (ordered.length !== rightItems.length) {
    return rightItems;
  }

  return ordered;
}

function buildTermDefinitionFallback(uniqueBodyLines, prompt) {
  const shouldTry =
    /match|connect|correlate|term|definition|purpose/i.test(prompt);

  if (!shouldTry) return null;

  const leftItems = [];
  const rightItems = [];

  uniqueBodyLines.forEach((line) => {
    if (isLikelyDefinitionLine(line)) {
      rightItems.push(line);
    } else {
      leftItems.push(line);
    }
  });

  if (
    leftItems.length >= 2 &&
    rightItems.length >= 2 &&
    leftItems.length === rightItems.length
  ) {
    return {
      title: 'Part 1.',
      prompt,
      leftItems,
      rightItems: applyKnownGitRightOrder(leftItems, rightItems),
      answerKey: {},
    };
  }

  return null;
}

function buildFallbackConfig(task, state) {
  const lines = cleanTextLines([
    ...(Array.isArray(state?.textLines) ? state.textLines : []),
    ...(Array.isArray(task?.textLines) ? task.textLines : []),
  ]).filter((line) => !isNoiseLine(line));

  const prompt =
    lines.find((line) => /match|correlate|connect/i.test(line)) ||
    task?.title ||
    'Match the items';

  const bodyLines = lines.filter((line) => {
    if (!line) return false;
    if (line === prompt) return false;
    if (isNoiseLine(line)) return false;
    return true;
  });

  const uniqueBodyLines = [];
  const seen = new Set();

  bodyLines.forEach((line) => {
    const key = normalizeKey(line);
    if (seen.has(key)) return;

    seen.add(key);
    uniqueBodyLines.push(line);
  });

  /*
    Case 1:
    HTML tag matching.

    Example captured order may be:
    Numbered
    <ul> </ul>
    Bulleted
    <ol> </ol>

    Left side = normal words.
    Right side = HTML tags.
  */
  const tagLines = uniqueBodyLines.filter((line) => isHtmlTagLine(line));
  const nonTagLines = uniqueBodyLines.filter((line) => !isHtmlTagLine(line));

  if (tagLines.length >= 1 && nonTagLines.length >= 1) {
    return {
      title: 'Part 1.',
      prompt,
      leftItems: nonTagLines,
      rightItems: tagLines,
      answerKey: {},
    };
  }

  /*
    Case 2:
    Term - definition matching.

    Example captured order may be mixed:
    Github
    A set of changes...
    git
    Remote folder...
    Repository
    Version control system
    Commit
    Service for interacting with Git

    Left side = short terms.
    Right side = longer definitions.
  */
  const termDefinitionFallback = buildTermDefinitionFallback(uniqueBodyLines, prompt);

  if (termDefinitionFallback) {
    return termDefinitionFallback;
  }

  /*
    Case 3:
    Website structure matching.

    Example:
    header
    main
    footer
    Name, logo, menu
    Useful information for the user
    Contacts, additional information
  */
  const htmlSectionTerms = [
    'header',
    'main',
    'footer',
    'nav',
    'section',
    'article',
    'aside',
  ];

  const leftLines = uniqueBodyLines.filter((line) => {
    const lower = normalizeKey(line);
    return htmlSectionTerms.includes(lower);
  });

  const rightLines = uniqueBodyLines.filter((line) => {
    const lower = normalizeKey(line);
    if (leftLines.some((left) => normalizeKey(left) === lower)) return false;
    return true;
  });

  if (leftLines.length >= 2 && rightLines.length >= 2) {
    return {
      title: 'Part 1.',
      prompt,
      leftItems: leftLines,
      rightItems: rightLines,
      answerKey: {},
    };
  }

  /*
    Case 4:
    Generic fallback.

    Only use half split when we cannot detect a better rule.
  */
  const half = Math.ceil(uniqueBodyLines.length / 2);

  return {
    title: 'Part 1.',
    prompt,
    leftItems: uniqueBodyLines.slice(0, half),
    rightItems: uniqueBodyLines.slice(half),
    answerKey: {},
  };
}

function getRawLeftItems(source, fallback) {
  return (
    source?.leftItems ||
    source?.left ||
    source?.terms ||
    source?.sources ||
    fallback.leftItems ||
    []
  );
}

function getRawRightItems(source, fallback) {
  return (
    source?.rightItems ||
    source?.right ||
    source?.targets ||
    source?.definitions ||
    fallback.rightItems ||
    []
  );
}

function resolveCorrectRightId(leftItem, leftIndex, rightItems, source) {
  const answerKey = source?.answerKey || source?.answers || {};
  const pairs = Array.isArray(source?.pairs) ? source.pairs : (
    Array.isArray(source?.answerKey) ? source.answerKey : []
  );

  const directValues = [
    !Array.isArray(answerKey) ? answerKey[leftItem.id] : undefined,
    !Array.isArray(answerKey) ? answerKey[leftItem.text] : undefined,
    !Array.isArray(answerKey) ? answerKey[`left-${leftIndex + 1}`] : undefined,
    leftItem.raw?.rightId,
    leftItem.raw?.targetId,
    leftItem.raw?.correctRightId,
    leftItem.raw?.answer,
    leftItem.raw?.correct,
  ].filter(Boolean);

  for (const value of directValues) {
    const matchedRight = rightItems.find((rightItem) => sameValue(value, rightItem));
    if (matchedRight) return matchedRight.id;
  }

  const pair = pairs.find((item) => (
    sameValue(item.leftId, leftItem) ||
    sameValue(item.left, leftItem) ||
    sameValue(item.sourceId, leftItem) ||
    sameValue(item.source, leftItem)
  ));

  if (pair) {
    const matchedRight = rightItems.find((rightItem) => (
      sameValue(pair.rightId, rightItem) ||
      sameValue(pair.right, rightItem) ||
      sameValue(pair.targetId, rightItem) ||
      sameValue(pair.target, rightItem)
    ));

    if (matchedRight) return matchedRight.id;
  }

  return '';
}

function buildData(config, task, state) {
  const fallback = buildFallbackConfig(task, state);
  const source = config || fallback;

  const leftItems = getRawLeftItems(source, fallback)
    .map((item, index) => toItem(item, index, 'left'))
    .filter((item) => item.text || item.image);

  const rightItems = getRawRightItems(source, fallback)
    .map((item, index) => toItem(item, index, 'right'))
    .filter((item) => item.text || item.image);

  const leftItemsWithAnswers = leftItems.map((leftItem, index) => ({
    ...leftItem,
    correctRightId: resolveCorrectRightId(leftItem, index, rightItems, source),
  }));

  const prompt = normalizeText(
    source?.prompt ||
    source?.question ||
    source?.helperText ||
    source?.subtitle ||
    fallback.prompt ||
    'Match the items.',
  );

  const helperText = normalizeText(
    source?.prompt || source?.question
      ? source?.helperText || source?.subtitle || ''
      : '',
  );

  return {
    title: normalizeText(source?.title || fallback.title || 'Part 1.'),
    prompt,
    helperText,
    attemptsAllowed: Number(source?.attemptsAllowed || source?.attempts || 2),
    leftItems: leftItemsWithAnswers,
    rightItems,
  };
}

function hasAnswerKey(leftItems) {
  return leftItems.length > 0 && leftItems.every((item) => Boolean(item.correctRightId));
}

function sanitizeAssignments(assignments, leftItems, rightItems) {
  const leftIds = new Set(leftItems.map((item) => item.id));
  const rightIds = new Set(rightItems.map((item) => item.id));
  const usedRightIds = new Set();
  const next = {};

  Object.entries(assignments || {}).forEach(([leftId, rightId]) => {
    if (!leftIds.has(leftId)) return;
    if (!rightIds.has(rightId)) return;
    if (usedRightIds.has(rightId)) return;

    usedRightIds.add(rightId);
    next[leftId] = rightId;
  });

  return next;
}

function getConnectionColor(index) {
  return LINE_COLORS[index % LINE_COLORS.length];
}

function getRelativePoint(event, element) {
  const rect = element.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function makeDotStyle(color) {
  if (!color) return undefined;

  return {
    '--dot-color': color,
  };
}

export default function MatchingConnectTask({
  task,
  state,
  pageInstance,
  onPrevTask,
  onNextTask,
  onTaskCompleted,
}) {
  const config = useMemo(
    () => getRendererConfig(pageInstance, task, state),
    [pageInstance, task, state],
  );

  const data = useMemo(
    () => buildData(config, task, state),
    [config, task, state],
  );

  /*
    v4 because older saved connections may be wrong after changing
    fallback left/right extraction.
  */
  const storageTaskId = useMemo(
    () => `matching-connect-v4-${getTaskId(task) || 'task'}`,
    [task],
  );

  const initialSaved = useMemo(
    () => loadLocalTaskState(storageTaskId, null),
    [storageTaskId],
  );

  const [assignments, setAssignments] = useState(() => (
    sanitizeAssignments(initialSaved?.assignments || {}, data.leftItems, data.rightItems)
  ));
  const [selectedLeftId, setSelectedLeftId] = useState('');
  const [attemptsUsed, setAttemptsUsed] = useState(initialSaved?.attemptsUsed || 0);
  const [feedback, setFeedback] = useState(initialSaved?.feedback || '');
  const [checkResult, setCheckResult] = useState(initialSaved?.checkResult || {});
  const [linePositions, setLinePositions] = useState([]);
  const [previewLine, setPreviewLine] = useState(null);
  const [pointerPosition, setPointerPosition] = useState(null);

  const boardRef = useRef(null);
  const leftDotRefs = useRef({});
  const rightDotRefs = useRef({});

  useEffect(() => {
    const saved = loadLocalTaskState(storageTaskId, null);

    setAssignments(sanitizeAssignments(saved?.assignments || {}, data.leftItems, data.rightItems));
    setSelectedLeftId('');
    setAttemptsUsed(saved?.attemptsUsed || 0);
    setFeedback(saved?.feedback || '');
    setCheckResult(saved?.checkResult || {});
    setPointerPosition(null);
  }, [storageTaskId, data.leftItems, data.rightItems]);

  useEffect(() => {
    saveLocalTaskState(storageTaskId, {
      assignments,
      attemptsUsed,
      feedback,
      checkResult,
    });
  }, [storageTaskId, assignments, attemptsUsed, feedback, checkResult]);

  const connectionEntries = useMemo(() => {
    return Object.entries(assignments)
      .map(([leftId, rightId]) => {
        const leftItem = data.leftItems.find((item) => item.id === leftId);
        const rightItem = data.rightItems.find((item) => item.id === rightId);

        if (!leftItem || !rightItem) return null;

        return {
          leftId,
          rightId,
          leftItem,
          rightItem,
        };
      })
      .filter(Boolean);
  }, [assignments, data.leftItems, data.rightItems]);

  const selectedConnectionIndex = connectionEntries.findIndex((item) => item.leftId === selectedLeftId);
  const selectedLineColor = selectedConnectionIndex >= 0
    ? getConnectionColor(selectedConnectionIndex)
    : getConnectionColor(connectionEntries.length);

  useLayoutEffect(() => {
    function updateLines() {
      const boardRect = boardRef.current?.getBoundingClientRect();

      if (!boardRect) {
        setLinePositions([]);
        setPreviewLine(null);
        return;
      }

      const nextLines = connectionEntries
        .map((connection, index) => {
          const leftDot = leftDotRefs.current[connection.leftId];
          const rightDot = rightDotRefs.current[connection.rightId];

          if (!leftDot || !rightDot) return null;

          const leftRect = leftDot.getBoundingClientRect();
          const rightRect = rightDot.getBoundingClientRect();

          return {
            ...connection,
            color: getConnectionColor(index),
            x1: leftRect.left + leftRect.width / 2 - boardRect.left,
            y1: leftRect.top + leftRect.height / 2 - boardRect.top,
            x2: rightRect.left + rightRect.width / 2 - boardRect.left,
            y2: rightRect.top + rightRect.height / 2 - boardRect.top,
          };
        })
        .filter(Boolean);

      setLinePositions(nextLines);

      if (selectedLeftId && pointerPosition) {
        const leftDot = leftDotRefs.current[selectedLeftId];

        if (leftDot) {
          const leftRect = leftDot.getBoundingClientRect();

          setPreviewLine({
            color: selectedLineColor,
            x1: leftRect.left + leftRect.width / 2 - boardRect.left,
            y1: leftRect.top + leftRect.height / 2 - boardRect.top,
            x2: pointerPosition.x,
            y2: pointerPosition.y,
          });
        } else {
          setPreviewLine(null);
        }
      } else {
        setPreviewLine(null);
      }
    }

    updateLines();

    const timer = window.setTimeout(updateLines, 50);
    window.addEventListener('resize', updateLines);
    window.addEventListener('scroll', updateLines, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updateLines);
      window.removeEventListener('scroll', updateLines, true);
    };
  }, [connectionEntries, selectedLeftId, pointerPosition, selectedLineColor]);

  function getLeftConnectionIndex(leftId) {
    return connectionEntries.findIndex((item) => item.leftId === leftId);
  }

  function getRightConnectionIndex(rightId) {
    return connectionEntries.findIndex((item) => item.rightId === rightId);
  }

  function getLeftPermanentColor(leftId) {
    const index = getLeftConnectionIndex(leftId);
    if (index < 0) return '';
    return getConnectionColor(index);
  }

  function getRightPermanentColor(rightId) {
    const index = getRightConnectionIndex(rightId);
    if (index < 0) return '';
    return getConnectionColor(index);
  }

  function connect(leftId, rightId) {
    if (!leftId || !rightId) return;

    setAssignments((current) => {
      const next = { ...current };

      Object.entries(next).forEach(([existingLeftId, existingRightId]) => {
        if (existingLeftId === leftId) {
          delete next[existingLeftId];
        }

        if (existingRightId === rightId) {
          delete next[existingLeftId];
        }
      });

      next[leftId] = rightId;

      return next;
    });

    setSelectedLeftId('');
    setPointerPosition(null);
    setFeedback('');
    setCheckResult({});
  }

  function removeByRightId(rightId) {
    setAssignments((current) => {
      const next = { ...current };

      Object.entries(next).forEach(([leftId, assignedRightId]) => {
        if (assignedRightId === rightId) {
          delete next[leftId];
        }
      });

      return next;
    });

    setSelectedLeftId('');
    setPointerPosition(null);
    setFeedback('');
    setCheckResult({});
  }

  function handleBoardMouseMove(event) {
    if (!boardRef.current) return;
    setPointerPosition(getRelativePoint(event, boardRef.current));
  }

  function handleLeftDotClick(event, leftId) {
    event.preventDefault();
    event.stopPropagation();

    if (boardRef.current) {
      setPointerPosition(getRelativePoint(event, boardRef.current));
    }

    setSelectedLeftId((current) => (current === leftId ? '' : leftId));
    setFeedback('');
    setCheckResult({});
  }

  function handleRightDotClick(event, rightId) {
    event.preventDefault();
    event.stopPropagation();

    const isConnected = Object.values(assignments).includes(rightId);

    if (isConnected) {
      removeByRightId(rightId);
      return;
    }

    if (selectedLeftId) {
      connect(selectedLeftId, rightId);
    }
  }

  function reset() {
    setAssignments({});
    setSelectedLeftId('');
    setPointerPosition(null);
    setAttemptsUsed(0);
    setFeedback('');
    setCheckResult({});
  }

  function check() {
    const filledCount = data.leftItems.filter((item) => assignments[item.id]).length;

    if (filledCount < data.leftItems.length) {
      setFeedback(`Please complete all matches first. ${filledCount}/${data.leftItems.length} done.`);
      return;
    }

    if (!hasAnswerKey(data.leftItems)) {
      setFeedback('All pairs have been placed.');
      setCheckResult({});
      return;
    }

    const nextResult = {};
    let allCorrect = true;

    data.leftItems.forEach((leftItem) => {
      const correct = assignments[leftItem.id] === leftItem.correctRightId;
      nextResult[leftItem.id] = correct;

      if (!correct) allCorrect = false;
    });

    setCheckResult(nextResult);
    setAttemptsUsed((current) => Math.min(current + 1, data.attemptsAllowed));
    setFeedback(allCorrect ? 'Correct!' : 'A mistake has been made! Try again.');

    if (allCorrect) {
      onTaskCompleted?.({
        completionType: 'correct',
        isCorrect: true,
        score: 1,
        maxScore: 1,
        feedback: 'All pairs are correct.',
        metadata: {
          assignments,
        },
      });
    }
  }

  const solved =
    hasAnswerKey(data.leftItems) &&
    data.leftItems.every((leftItem) => assignments[leftItem.id] === leftItem.correctRightId);

  return (
    <LmsActivityFrame
      title={data.title || data.prompt}
      onPrevTask={onPrevTask}
      onNextTask={onNextTask}
      onCheck={check}
      isCheckDisabled={false}
      onReset={reset}
      isResetDisabled={false}
    >
      <article className="matching-connect-task">
        <div className="matching-connect-card">
          <header className="matching-connect-header">
            <h1>
              <span className="matching-connect-info">i</span>
              {data.title}
            </h1>

            <p>{data.prompt}</p>

            {data.helperText ? <p>{data.helperText}</p> : null}
          </header>

          <div
            ref={boardRef}
            className="matching-connect-board"
            onMouseMove={handleBoardMouseMove}
          >
            <svg
              className="matching-connect-lines"
              aria-hidden="true"
            >
              {linePositions.map((line) => (
                <line
                  key={`${line.leftId}-${line.rightId}`}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={line.color}
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              ))}

              {previewLine ? (
                <line
                  x1={previewLine.x1}
                  y1={previewLine.y1}
                  x2={previewLine.x2}
                  y2={previewLine.y2}
                  stroke={previewLine.color}
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              ) : null}
            </svg>

            <section className="matching-connect-column matching-connect-column--left">
              {data.leftItems.map((leftItem, leftIndex) => {
                const permanentColor = getLeftPermanentColor(leftItem.id);
                const isSelected = selectedLeftId === leftItem.id;
                const dotColor = permanentColor || (isSelected ? selectedLineColor : '');
                const result = checkResult[leftItem.id];

                let stateClass = '';
                if (result === true) stateClass = 'is-correct';
                if (result === false) stateClass = 'is-wrong';

                return (
                  <div
                    key={leftItem.id}
                    className={`matching-connect-row matching-connect-row--left ${stateClass}`}
                    style={{ gridRow: leftIndex + 1 }}
                  >
                    {renderItemContent(leftItem)}

                    <button
                      type="button"
                      ref={(node) => {
                        if (node) {
                          leftDotRefs.current[leftItem.id] = node;
                        } else {
                          delete leftDotRefs.current[leftItem.id];
                        }
                      }}
                      className={[
                        'matching-connect-dot',
                        'matching-connect-dot--right',
                        permanentColor ? 'is-connected' : '',
                        isSelected ? 'is-selected-source' : '',
                      ].filter(Boolean).join(' ')}
                      style={makeDotStyle(dotColor)}
                      onClick={(event) => handleLeftDotClick(event, leftItem.id)}
                      aria-label={`Connect ${getItemAriaLabel(leftItem)}`}
                    />
                  </div>
                );
              })}
            </section>

            <section className="matching-connect-column matching-connect-column--right">
              {data.rightItems.map((rightItem, rightIndex) => {
                const permanentColor = getRightPermanentColor(rightItem.id);
                const dotColor = permanentColor || (selectedLeftId ? selectedLineColor : '');
                const isConnected = Boolean(permanentColor);

                return (
                  <div
                    key={rightItem.id}
                    className="matching-connect-row matching-connect-row--right"
                    style={{ gridRow: rightIndex + 1 }}
                  >
                    <button
                      type="button"
                      ref={(node) => {
                        if (node) {
                          rightDotRefs.current[rightItem.id] = node;
                        } else {
                          delete rightDotRefs.current[rightItem.id];
                        }
                      }}
                      className={[
                        'matching-connect-dot',
                        'matching-connect-dot--left',
                        isConnected ? 'is-connected' : '',
                      ].filter(Boolean).join(' ')}
                      style={makeDotStyle(dotColor)}
                      onClick={(event) => handleRightDotClick(event, rightItem.id)}
                      aria-label={isConnected ? `Remove connection for ${getItemAriaLabel(rightItem)}` : `Connect to ${getItemAriaLabel(rightItem)}`}
                    />

                    {renderItemContent(rightItem)}
                  </div>
                );
              })}
            </section>
          </div>

          {feedback ? (
            <div className={`matching-connect-feedback ${solved ? 'is-success' : 'is-error'}`}>
              <span className="matching-connect-feedback-icon">
                {solved ? '✓' : 'i'}
              </span>
              {feedback}
            </div>
          ) : null}
        </div>
      </article>
    </LmsActivityFrame>
  );
}