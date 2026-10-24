import { useEffect, useMemo, useState } from 'react';
import StateReplay from '../components/StateReplay.jsx';
import LmsActivityFrame from '../components/LmsActivityFrame.jsx';
import {
  cleanTextLines,
  getPrimaryState,
  getUniqueImages,
} from '../lib/taskExtractors.js';

function shouldUseReplay(
  task,
  state,
  rawMode,
  forceReplay,
  lines,
  images,
) {
  const type = String(
    task?.activityType || '',
  ).toLowerCase();

  if (forceReplay || rawMode) {
    return true;
  }

  /*
    Dynamic tasks should not be rendered using generic text.
    Rendering them as generic text would expose capture artifacts:
    - CSS selectors
    - timestamps
    - DOM paths
    - option text that breaks layout
  */
  if (type === 'code_typing_task') {
    return true;
  }

  if (type === 'matching_dragdrop_task') {
    return true;
  }

  if (!lines.length && !images.length) {
    return true;
  }

  return false;
}

export default function GenericCapturedTask(props) {
  const {
    task,
    state,
    stateIndex,
    rawMode,
    forceReplay,
    onNextState,
    onPrevState,
    onSelectState,
    onPrevTask,
    onNextTask,
    onTaskCompleted,
  } = props;

  const [canMarkViewed, setCanMarkViewed] =
    useState(false);

  const [isViewed, setIsViewed] =
    useState(false);

  useEffect(() => {
    setCanMarkViewed(false);
    setIsViewed(false);

    const timerId = window.setTimeout(() => {
      setCanMarkViewed(true);
    }, 1500);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [
    task?.id,
    task?.taskId,
    state?.id,
    state?.stateId,
  ]);

  function markViewed() {
    if (!canMarkViewed || isViewed) {
      return;
    }

    setIsViewed(true);

    onTaskCompleted?.({
      completionType: 'viewed',
      feedback: 'Static content reviewed.',
      metadata: {
        stateId:
          state?.id ||
          state?.stateId ||
          null,
      },
    });
  }

  const viewedButton = (
    <button
      type="button"
      onClick={markViewed}
      disabled={!canMarkViewed || isViewed}
      style={{
        minHeight: 40,
        border: 0,
        borderRadius: 11,
        padding: '0 16px',
        background: isViewed
          ? '#16a34a'
          : '#8943ef',
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 850,
        cursor:
          canMarkViewed && !isViewed
            ? 'pointer'
            : 'not-allowed',
        opacity:
          canMarkViewed || isViewed
            ? 1
            : 0.55,
      }}
    >
      {isViewed
        ? 'Viewed ✓'
        : canMarkViewed
          ? 'Mark as viewed'
          : 'Reviewing…'}
    </button>
  );

  const primaryState = useMemo(
    () => getPrimaryState(task),
    [task],
  );

  const currentState =
    state || primaryState;

  const lines = useMemo(
    () =>
      cleanTextLines(
        currentState?.textLines || [],
      ),
    [currentState],
  );

  const images = useMemo(
    () => getUniqueImages(task),
    [task],
  );

  if (
    shouldUseReplay(
      task,
      currentState,
      rawMode,
      forceReplay,
      lines,
      images,
    )
  ) {
    return (
      <div
        style={{
          width: '100%',
          position: 'relative',
          paddingBottom: 58,
          boxSizing: 'border-box',
        }}
      >
        <StateReplay
          task={task}
          state={currentState}
          stateIndex={stateIndex}
          rawMode={rawMode}
          onNext={onNextState}
          onPrev={onPrevState}
          onSelectState={onSelectState}
        />

        <div
          style={{
            position: 'absolute',
            right: 18,
            bottom: 10,
          }}
        >
          {viewedButton}
        </div>
      </div>
    );
  }

  const title =
    lines[0] ||
    task?.title ||
    'Activity';

  const bodyLines = lines.slice(1);

  return (
    <LmsActivityFrame
      title={title}
      onPrevTask={onPrevTask}
      onNextTask={onNextTask}
      onCheck={markViewed}
      isCheckDisabled={
        !canMarkViewed || isViewed
      }
      status={
        isViewed
          ? 'Viewed.'
          : canMarkViewed
            ? 'Ready to mark as viewed.'
            : 'Reviewing content…'
      }
    >
      <article className="functional-card generic-card">
        <h1>{title}</h1>

        {bodyLines.map((line, index) => (
          <p key={`${line}-${index}`}>
            {line}
          </p>
        ))}

        {images.length > 0 ? (
          <div className="generic-image-grid">
            {images.map((image) => (
              <img
                key={image.src}
                src={image.src}
                alt={image.alt || ''}
              />
            ))}
          </div>
        ) : null}
      </article>
    </LmsActivityFrame>
  );
}