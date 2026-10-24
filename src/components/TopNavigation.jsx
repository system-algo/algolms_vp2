import { useEffect, useMemo, useRef, useState } from 'react';
import './top-navigation.css';
import customNames from '../config/mapping.json';
import {
  LMS_SOUND_EVENT,
  LMS_SOUND_TYPES,
} from '../utils/lmsSounds.js';

function getTaskId(task) {
  return String(
    task?.id ||
    task?.taskId ||
    task?.taskKey ||
    task?.key ||
    '',
  ).trim();
}

function getTaskMarker(task, index, total) {
  const title = String(task?.title || '').toLowerCase();

  if (
    title.includes('star') ||
    title.includes('project') ||
    title.includes('demo')
  ) {
    return '★';
  }

  if (total > 7 && index >= total - 2) {
    return '★';
  }

  return String(index + 1);
}

function getModuleLessonInfo(lessonTitle, pageTitle) {
  const source = `${lessonTitle || ''} ${pageTitle || ''}`;

  const compactMatch = source.match(/M\s*(\d+)\s*L\s*(\d+)/i);
  const moduleMatch =
    compactMatch ||
    source.match(/(?:^|[_\s-])M(?:ODULE)?[_\s:-]*(\d+)/i);

  const lessonMatch =
    compactMatch ||
    source.match(/(?:^|[_\s-])L(?:ESSON)?[_\s:-]*(\d+)/i);

  const moduleNumber =
    compactMatch?.[1] ||
    moduleMatch?.[1] ||
    '';

  const lessonNumber =
    compactMatch?.[2] ||
    lessonMatch?.[1] ||
    '';

  const cleanLessonTitle = String(lessonTitle || '')
    .replace(/^M\s*\d+\s*[:\-–]\s*/i, '')
    .replace(/^MODULE\s*\d+\s*[:\-–]\s*/i, '')
    .trim();

  return {
    moduleLabel: moduleNumber
      ? `M${moduleNumber}`
      : 'M1',
    lessonLabel: lessonNumber
      ? `L${lessonNumber}`
      : '—',
    lessonName:
      cleanLessonTitle ||
      String(lessonTitle || '').trim(),
  };
}


function normalizeMappingValue(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function getMappedNavigationContext({
  courseId,
  courseTitle,
  moduleId,
  lessonId,
  lessonTitle,
  pageId,
  pageTitle,
  title,
}) {
  const courseMap = customNames?.courses || {};
  const moduleMap = customNames?.modules || {};
  const lessonMap = customNames?.lessons || {};

  const sourceValues = [
    pageId,
    lessonId,
    moduleId,
    lessonTitle,
    pageTitle,
    title,
    courseId,
    courseTitle,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const joinedSource = sourceValues.join(' ');
  const pageCodeMatch = joinedSource.match(
    /(?:^|[^A-Z0-9])([A-Z0-9]+)_M(\d+)L(\d+)(?:_|[^A-Z0-9]|$)/i,
  );
  const compactMatch = joinedSource.match(/M\s*(\d+)\s*L\s*(\d+)/i);
  const moduleMatch = joinedSource.match(
    /(?:^|[_\s-])M(?:ODULE)?[_\s:-]*(\d+)/i,
  );
  const lessonMatch = joinedSource.match(
    /(?:^|[_\s-])L(?:ESSON)?[_\s:-]*(\d+)/i,
  );

  const moduleNumber =
    pageCodeMatch?.[2] ||
    compactMatch?.[1] ||
    moduleMatch?.[1] ||
    '';

  const lessonNumber =
    pageCodeMatch?.[3] ||
    compactMatch?.[2] ||
    lessonMatch?.[1] ||
    '';

  const courseKeys = Object.keys(courseMap);
  const normalizedSources = sourceValues.map(normalizeMappingValue);

  const courseCode =
    String(pageCodeMatch?.[1] || '').toUpperCase() ||
    courseKeys.find((key) => {
      const normalizedKey = normalizeMappingValue(key);
      return normalizedSources.some(
        (source) =>
          source === normalizedKey ||
          source.startsWith(normalizedKey),
      );
    }) ||
    '';

  const exactModuleCandidates = [moduleId, lessonTitle]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const moduleKey =
    exactModuleCandidates.find((key) => moduleMap[key]) ||
    Object.keys(moduleMap).find((key) => {
      if (!moduleNumber) return false;
      const match = key.match(/(?:^|[_-])M(\d+)(?:[_-]|$)/i);
      return match?.[1] === String(moduleNumber);
    }) ||
    '';

  const pageLessonKey = pageCodeMatch
    ? `${String(pageCodeMatch[1]).toUpperCase()}_M${pageCodeMatch[2]}L${pageCodeMatch[3]}`
    : '';

  const exactLessonCandidates = [
    lessonId,
    pageLessonKey,
    courseCode && moduleNumber && lessonNumber
      ? `${courseCode}_M${moduleNumber}L${lessonNumber}`
      : '',
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const lessonKey =
    exactLessonCandidates.find((key) => lessonMap[key]) ||
    Object.keys(lessonMap).find((key) => {
      if (!moduleNumber || !lessonNumber) return false;
      return new RegExp(
        `_M${moduleNumber}L${lessonNumber}$`,
        'i',
      ).test(key);
    }) ||
    '';

  const mappedCourseTitle =
    (courseCode && courseMap[courseCode]) ||
    '';

  const mappedModuleName =
    (moduleKey && moduleMap[moduleKey]) ||
    '';

  const mappedLessonName =
    (lessonKey && lessonMap[lessonKey]) ||
    '';

  return {
    courseCode,
    courseTitle: mappedCourseTitle,
    moduleNumber,
    moduleName: mappedModuleName,
    lessonNumber,
    lessonName: mappedLessonName,
  };
}

function normalizeBadgeCourseName(value) {
  return String(value || 'COURSE')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function readUnlockedBadges() {
  try {
    const value = JSON.parse(
      localStorage.getItem('lms-unlocked-badges') ||
      '[]',
    );

    return Array.isArray(value)
      ? value.map(String)
      : [];
  } catch {
    return [];
  }
}

function saveUnlockedBadge(badgeId) {
  try {
    const nextBadges = Array.from(
      new Set([
        ...readUnlockedBadges(),
        badgeId,
      ]),
    );

    localStorage.setItem(
      'lms-unlocked-badges',
      JSON.stringify(nextBadges),
    );
  } catch {
    // Ignore unavailable localStorage.
  }
}

const SCREEN_FIREWORKS = Array.from(
  { length: 12 },
  (_, index) => index,
);

const FIREWORK_SPARKS = Array.from(
  { length: 16 },
  (_, index) => index,
);

const DEFAULT_SOUND_SOURCES = {
  [LMS_SOUND_TYPES.COMPLETE_SERIES]:
    '/assets/sounds/complete-series.mp3',
  [LMS_SOUND_TYPES.COMPLETE_ACTIVITY]:
    '/assets/sounds/complete-activity.mp3',
  [LMS_SOUND_TYPES.NEW_BADGE]:
    '/assets/sounds/new-badge.mp3',
  [LMS_SOUND_TYPES.COMPLETE_LESSON]:
    '/assets/sounds/complete-lesson.mp3',
  [LMS_SOUND_TYPES.EARN_POINTS]:
    '/assets/sounds/earn-points.mp3',
  [LMS_SOUND_TYPES.NOTIFICATION]:
    '/assets/sounds/notification.mp3',
};

const DEFAULT_SOUND_VOLUMES = {
  [LMS_SOUND_TYPES.COMPLETE_SERIES]: 0.72,
  [LMS_SOUND_TYPES.COMPLETE_ACTIVITY]: 0.68,
  [LMS_SOUND_TYPES.NEW_BADGE]: 0.82,
  [LMS_SOUND_TYPES.COMPLETE_LESSON]: 0.8,
  [LMS_SOUND_TYPES.EARN_POINTS]: 0.7,
  [LMS_SOUND_TYPES.NOTIFICATION]: 0.58,
};


export default function TopNavigation({
  title = '',
  courseId = '',
  courseTitle = '',
  moduleId = '',
  lessonId = '',
  lessonTitle = '',
  pageId = '',
  pageTitle = '',
  logoImageSrc = '/assets/shared/lms-logo.png',
  robotImageSrc = '/assets/shared/lms-course-robot.png',
  completeSeriesSoundSrc =
    DEFAULT_SOUND_SOURCES[LMS_SOUND_TYPES.COMPLETE_SERIES],
  completeActivitySoundSrc =
    DEFAULT_SOUND_SOURCES[LMS_SOUND_TYPES.COMPLETE_ACTIVITY],
  newBadgeSoundSrc =
    DEFAULT_SOUND_SOURCES[LMS_SOUND_TYPES.NEW_BADGE],
  completeLessonSoundSrc =
    DEFAULT_SOUND_SOURCES[LMS_SOUND_TYPES.COMPLETE_LESSON],
  earnPointsSoundSrc =
    DEFAULT_SOUND_SOURCES[LMS_SOUND_TYPES.EARN_POINTS],
  notificationSoundSrc =
    DEFAULT_SOUND_SOURCES[LMS_SOUND_TYPES.NOTIFICATION],
  tasks = [],
  currentTaskIndex = 0,
  completedTaskIds = [],
  completedTaskCount,
  totalTaskCount,
  lessonProgressPercent,
  progressCelebrationKey = 0,
  justCompletedTaskId = '',
  progressJustIncreased = false,
  onSelectTask,
  onBackToCatalog,
  onBackToCourses,
}) {
  const progressStripRef = useRef(null);
  const timersRef = useRef([]);
  const framesRef = useRef([]);
  const numberFrameRef = useRef(null);
  const soundPlayersRef = useRef(new Map());
  const soundPrimedRef = useRef(false);
  const lastHandledCelebrationKeyRef = useRef(progressCelebrationKey);

  const [animatedProgressPercent, setAnimatedProgressPercent] =
    useState(0);

  const [displayProgressPercent, setDisplayProgressPercent] =
    useState(0);

  const [progressAnimation, setProgressAnimation] =
    useState(null);

  const [showBadgeUnlock, setShowBadgeUnlock] =
    useState(false);

  const [soundEnabled, setSoundEnabled] =
    useState(() => {
      try {
        return (
          localStorage.getItem(
            'lms-progress-sound',
          ) !== 'off'
        );
      } catch {
        return true;
      }
    });


  const resolvedSoundSources = useMemo(
    () => ({
      [LMS_SOUND_TYPES.COMPLETE_SERIES]:
        completeSeriesSoundSrc,
      [LMS_SOUND_TYPES.COMPLETE_ACTIVITY]:
        completeActivitySoundSrc,
      [LMS_SOUND_TYPES.NEW_BADGE]:
        newBadgeSoundSrc,
      [LMS_SOUND_TYPES.COMPLETE_LESSON]:
        completeLessonSoundSrc,
      [LMS_SOUND_TYPES.EARN_POINTS]:
        earnPointsSoundSrc,
      [LMS_SOUND_TYPES.NOTIFICATION]:
        notificationSoundSrc,
    }),
    [
      completeSeriesSoundSrc,
      completeActivitySoundSrc,
      newBadgeSoundSrc,
      completeLessonSoundSrc,
      earnPointsSoundSrc,
      notificationSoundSrc,
    ],
  );

  const completedTaskIdSet = useMemo(
    () => new Set(completedTaskIds.map(String)),
    [completedTaskIds],
  );

  const resolvedTotalTaskCount =
    typeof totalTaskCount === 'number'
      ? totalTaskCount
      : tasks.length;

  const resolvedCompletedTaskCount =
    typeof completedTaskCount === 'number'
      ? completedTaskCount
      : tasks.filter((task) =>
        completedTaskIdSet.has(getTaskId(task)),
      ).length;

  const resolvedProgressPercent =
    typeof lessonProgressPercent === 'number'
      ? Math.max(
        0,
        Math.min(100, lessonProgressPercent),
      )
      : resolvedTotalTaskCount > 0
        ? Math.round(
          (
            resolvedCompletedTaskCount /
            resolvedTotalTaskCount
          ) * 100,
        )
        : 0;

  const fallbackCourseTitle = String(courseId || '')
    .split('/')[0]
    .trim();

  const rawCourseTitle =
    String(courseTitle || '').trim() ||
    fallbackCourseTitle ||
    'Course';

  const resolvedLessonTitle =
    String(lessonTitle || '').trim() ||
    String(courseId || '')
      .split('/')
      .slice(1)
      .join('/')
      .trim();

  const resolvedPageTitle =
    String(pageTitle || '').trim() ||
    String(title || '').trim();

  const mappedNavigation = getMappedNavigationContext({
    courseId,
    courseTitle: rawCourseTitle,
    moduleId,
    lessonId,
    lessonTitle: resolvedLessonTitle,
    pageId,
    pageTitle: resolvedPageTitle,
    title,
  });

  const resolvedCourseTitle =
    mappedNavigation.courseTitle ||
    rawCourseTitle;

  let {
    moduleLabel,
    lessonLabel,
    lessonName,
  } = getModuleLessonInfo(
    resolvedLessonTitle,
    resolvedPageTitle,
  );

  if (mappedNavigation.moduleNumber) {
    moduleLabel = `M${mappedNavigation.moduleNumber}`;
  }

  if (mappedNavigation.lessonNumber) {
    lessonLabel = `L${mappedNavigation.lessonNumber}`;
  }

  const moduleName =
    mappedNavigation.moduleName ||
    String(resolvedLessonTitle || '')
      .replace(/^M\s*\d+\s*[:\-–]\s*/i, '')
      .replace(/^MODULE\s*\d+\s*[:\-–]\s*/i, '')
      .trim();

  lessonName =
    mappedNavigation.lessonName ||
    lessonName;

  // Fallback for legacy pages whose IDs do not include an MxLy code.
  // Mapped page/module IDs always take priority over this cached data.
  if (!mappedNavigation.lessonNumber) {
    try {
      const cachedData = JSON.parse(
        sessionStorage.getItem('lms-global-lessons-data') || '[]',
      );

      if (Array.isArray(cachedData)) {
        for (const mod of cachedData) {
          if (!Array.isArray(mod.lessons)) continue;

          for (const lesson of mod.lessons) {
            const containsPage = Array.isArray(lesson.pages) &&
              lesson.pages.some((page) => {
                const cachedPageId = page.id || page.pageId;
                return (
                  cachedPageId === pageId ||
                  cachedPageId === resolvedPageTitle
                );
              });

            if (containsPage) {
              lessonLabel = `L${lesson.number}`;
              break;
            }
          }
        }
      }
    } catch {
      // Ignore unavailable or invalid sessionStorage data.
    }
  }

  const badgeId = `${moduleLabel}-${normalizeBadgeCourseName(
    resolvedCourseTitle,
  )}`;

  const isBadgeUnlocked =
    resolvedProgressPercent >= 100 ||
    readUnlockedBadges().includes(badgeId);

  function primeCustomSounds() {
    if (soundPrimedRef.current) {
      return;
    }

    soundPrimedRef.current = true;

    soundPlayersRef.current.forEach((audio) => {
      const previousMuted = audio.muted;
      const previousVolume = audio.volume;

      audio.muted = true;
      audio.volume = 0;
      audio.currentTime = 0;

      const playPromise = audio.play();

      if (playPromise?.then) {
        playPromise
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = previousMuted;
            audio.volume = previousVolume;
          })
          .catch(() => {
            audio.muted = previousMuted;
            audio.volume = previousVolume;
          });
      }
    });
  }

  function playCustomSound(soundType) {
    if (!soundEnabled) {
      return;
    }

    const audio =
      soundPlayersRef.current.get(soundType);

    if (!audio) {
      console.warn(
        `[TopNavigation] No sound configured for "${soundType}".`,
      );
      return;
    }

    audio.pause();
    audio.currentTime = 0;

    audio
      .play()
      .catch((error) => {
        console.warn(
          `[TopNavigation] Could not play "${soundType}" sound:`,
          error,
        );
      });
  }

  function toggleProgressSound() {
    const nextValue = !soundEnabled;

    setSoundEnabled(nextValue);

    try {
      localStorage.setItem(
        'lms-progress-sound',
        nextValue ? 'on' : 'off',
      );
    } catch {
      // Ignore unavailable localStorage.
    }

    if (nextValue) {
      primeCustomSounds();
    }
  }

  function clearAnimationResources() {
    timersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });

    framesRef.current.forEach((frameId) => {
      window.cancelAnimationFrame(frameId);
    });

    timersRef.current = [];
    framesRef.current = [];

    if (numberFrameRef.current) {
      window.cancelAnimationFrame(
        numberFrameRef.current,
      );

      numberFrameRef.current = null;
    }
  }

  function animateDisplayedPercent({
    from,
    to,
    duration,
  }) {
    if (numberFrameRef.current) {
      window.cancelAnimationFrame(
        numberFrameRef.current,
      );
    }

    const startedAt = performance.now();
    const distance = to - from;

    function update(now) {
      const elapsed = now - startedAt;
      const ratio = Math.min(
        1,
        elapsed / duration,
      );

      const eased =
        1 - Math.pow(1 - ratio, 3);

      setDisplayProgressPercent(
        Math.round(
          from + distance * eased,
        ),
      );

      if (ratio < 1) {
        numberFrameRef.current =
          window.requestAnimationFrame(update);
      } else {
        numberFrameRef.current = null;
      }
    }

    numberFrameRef.current =
      window.requestAnimationFrame(update);
  }

  useEffect(() => {
    const nextPlayers = new Map();

    Object.entries(
      resolvedSoundSources,
    ).forEach(([soundType, source]) => {
      const normalizedSource =
        String(source || '').trim();

      if (!normalizedSource) {
        return;
      }

      const audio = new Audio(
        normalizedSource,
      );

      audio.preload = 'auto';
      audio.volume =
        DEFAULT_SOUND_VOLUMES[soundType] ??
        0.7;

      nextPlayers.set(
        soundType,
        audio,
      );
    });

    soundPlayersRef.current = nextPlayers;
    soundPrimedRef.current = false;

    return () => {
      nextPlayers.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });

      soundPlayersRef.current = new Map();
      soundPrimedRef.current = false;
    };
  }, [resolvedSoundSources]);

  useEffect(() => {
    function prepareProgressAudio() {
      primeCustomSounds();
    }

    window.addEventListener(
      'pointerdown',
      prepareProgressAudio,
      {
        once: true,
        passive: true,
      },
    );

    window.addEventListener(
      'keydown',
      prepareProgressAudio,
      {
        once: true,
      },
    );

    return () => {
      window.removeEventListener(
        'pointerdown',
        prepareProgressAudio,
      );

      window.removeEventListener(
        'keydown',
        prepareProgressAudio,
      );
    };
  }, []);

  useEffect(() => {
    function handleLmsSound(event) {
      const soundType =
        event?.detail?.type;

      if (!soundType) {
        return;
      }

      playCustomSound(soundType);
    }

    window.addEventListener(
      LMS_SOUND_EVENT,
      handleLmsSound,
    );

    return () => {
      window.removeEventListener(
        LMS_SOUND_EVENT,
        handleLmsSound,
      );
    };
  }, [soundEnabled, resolvedSoundSources]);

  useEffect(() => {
    const hasNewCelebration =
      Boolean(progressCelebrationKey) &&
      progressCelebrationKey !==
        lastHandledCelebrationKeyRef.current;

    if (
      !hasNewCelebration ||
      !progressJustIncreased ||
      !justCompletedTaskId ||
      !progressStripRef.current
    ) {
      if (!progressAnimation) {
        setAnimatedProgressPercent(
          resolvedProgressPercent,
        );

        setDisplayProgressPercent(
          resolvedProgressPercent,
        );
      }

      if (resolvedProgressPercent >= 100) {
        saveUnlockedBadge(badgeId);
      }

      return undefined;
    }

    lastHandledCelebrationKeyRef.current =
      progressCelebrationKey;

    clearAnimationResources();

    const rect =
      progressStripRef.current.getBoundingClientRect();

    const targetWidth = Math.min(
      680,
      Math.max(420, window.innerWidth - 36),
    );

    const startX =
      rect.left +
      rect.width / 2 -
      window.innerWidth / 2;

    const startY =
      rect.top +
      rect.height / 2 -
      window.innerHeight / 2;

    const startScale = Math.max(
      0.42,
      Math.min(1, rect.width / targetWidth),
    );

    const previousPercent =
      progressJustIncreased &&
        resolvedTotalTaskCount > 0
        ? Math.round(
          (
            Math.max(
              0,
              resolvedCompletedTaskCount - 1,
            ) /
            resolvedTotalTaskCount
          ) * 100,
        )
        : resolvedProgressPercent;

    const nextPercent =
      resolvedProgressPercent;

    const deltaPercent =
      Math.max(
        0,
        nextPercent - previousPercent,
      );

    const isComplete =
      nextPercent >= 100;

    const fillDuration =
      isComplete
        ? 2700
        : 1900;

    const fillDelay = 720;

    const exitAt =
      isComplete
        ? 4000
        : 2900;

    const finishAt =
      isComplete
        ? 4400
        : 3300;

    setAnimatedProgressPercent(
      previousPercent,
    );

    setDisplayProgressPercent(
      previousPercent,
    );

    setProgressAnimation({
      key: progressCelebrationKey,
      phase: 'center',
      previousPercent,
      nextPercent,
      deltaPercent,
      startX,
      startY,
      startScale,
      isComplete,
    });


    const fillTimerId =
      window.setTimeout(() => {
        setAnimatedProgressPercent(
          nextPercent,
        );

        animateDisplayedPercent({
          from: previousPercent,
          to: nextPercent,
          duration: fillDuration,
        });

        playCustomSound(
          isComplete
            ? LMS_SOUND_TYPES.COMPLETE_LESSON
            : LMS_SOUND_TYPES.COMPLETE_ACTIVITY,
        );
      }, fillDelay);

    const exitTimerId =
      window.setTimeout(() => {
        setProgressAnimation(
          (currentAnimation) =>
            currentAnimation
              ? {
                ...currentAnimation,
                phase: 'exit',
              }
              : currentAnimation,
        );
      }, exitAt);

    const finishTimerId =
      window.setTimeout(() => {
        setProgressAnimation(null);

        setAnimatedProgressPercent(
          nextPercent,
        );

        setDisplayProgressPercent(
          nextPercent,
        );
      }, finishAt);

    timersRef.current.push(
      fillTimerId,
      exitTimerId,
      finishTimerId,
    );

    if (isComplete) {
      const badgeTimerId =
        window.setTimeout(() => {
          saveUnlockedBadge(badgeId);
          // setShowBadgeUnlock(true);

          playCustomSound(
            LMS_SOUND_TYPES.NEW_BADGE,
          );
        }, finishAt + 250);

      timersRef.current.push(
        badgeTimerId,
      );
    }

    return clearAnimationResources;
  }, [
    badgeId,
    justCompletedTaskId,
    progressCelebrationKey,
    progressJustIncreased,
    resolvedCompletedTaskCount,
    resolvedProgressPercent,
    resolvedTotalTaskCount,
    soundEnabled,
  ]);

  useEffect(() => {
  if (!progressAnimation && !progressJustIncreased) {
    setAnimatedProgressPercent(
      resolvedProgressPercent,
    );

    setDisplayProgressPercent(
      resolvedProgressPercent,
    );
  }
}, [
  progressAnimation,
  progressJustIncreased,
  resolvedProgressPercent,
]);

  useEffect(() => {
    return () => {
      clearAnimationResources();
    };
  }, []);

  const progressClassName = [
    'lms-progress-strip',
    progressAnimation
      ? 'is-floating'
      : '',
    progressAnimation?.phase === 'start'
      ? 'is-flight-start'
      : '',
    progressAnimation?.phase === 'center'
      ? 'is-flight-center'
      : '',
    progressAnimation?.phase === 'exit'
      ? 'is-flight-exit'
      : '',
    progressAnimation?.isComplete
      ? 'is-completing'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <header className="lms-topbar">
        <div className="lms-topbar__info-row">
          <div className="lms-topbar__identity">
            <div className="lms-topbar__logo">
              <span
                className="lms-topbar__logo-fallback"
                aria-hidden="true"
              >
                A
              </span>

              <img
                src={logoImageSrc}
                alt="Algorithmics"
                draggable="false"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <div
              className="lms-topbar__robot"
              aria-hidden="true"
            >
              <img
                src={robotImageSrc}
                alt=""
                draggable="false"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <strong
              className="lms-topbar__course-code"
              title={resolvedCourseTitle}
            >
              {resolvedCourseTitle}
            </strong>
          </div>

          <section
            className="lms-topbar__lesson-context"
            aria-label="Current lesson location"
          >
            <span className="lms-topbar__info-pill">
              <small>Module</small>
              <strong>{moduleLabel}</strong>
            </span>

            {moduleName ? (
              <>
                <span
                  className="lms-topbar__separator"
                  aria-hidden="true"
                >
                  ›
                </span>

                <strong
                  className="lms-topbar__lesson-title lms-topbar__module-title"
                  title={moduleName}
                >
                  {moduleName}
                </strong>
              </>
            ) : null}

            <span
              className="lms-topbar__separator"
              aria-hidden="true"
            >
              ›
            </span>

            <span className="lms-topbar__info-pill">
              <small>Lesson</small>
              <strong>{lessonLabel}</strong>
            </span>

            {lessonName ? (
              <>
                <span
                  className="lms-topbar__separator"
                  aria-hidden="true"
                >
                  ›
                </span>

                <strong
                  className="lms-topbar__lesson-title"
                  title={lessonName}
                >
                  {lessonName}
                </strong>
              </>
            ) : null}

            <span
              className="lms-topbar__separator"
              aria-hidden="true"
            >
              ›
            </span>

            <span className="lms-topbar__info-pill is-task">
              <small>Task</small>
              <strong>
                {currentTaskIndex + 1}/
                {resolvedTotalTaskCount}
              </strong>
            </span>
          </section>

          <div className="lms-topbar__progress-slot">
            {progressAnimation ? (
              <div
                className="lms-progress-strip-placeholder"
                aria-hidden="true"
              />
            ) : null}

            <section
              ref={progressStripRef}
              className={progressClassName}
              style={
                progressAnimation
                  ? {
                    '--progress-start-x': `${progressAnimation.startX}px`,
                    '--progress-start-y': `${progressAnimation.startY}px`,
                    '--progress-start-scale':
                      progressAnimation.startScale,
                  }
                  : undefined
              }
              aria-label={`Lesson progress: ${resolvedProgressPercent}%`}
              aria-live="polite"
            >
              {progressAnimation ? (
                <>
                  <div className="lms-progress-strip__header">
                    <div>
                      <span className="lms-progress-strip__label">
                        Lesson progress
                      </span>

                      <span className="lms-progress-strip__count">
                        {resolvedCompletedTaskCount}/
                        {resolvedTotalTaskCount} completed
                      </span>
                    </div>

                    <div className="lms-progress-strip__header-actions">
                      <button
                        type="button"
                        className="lms-progress-strip__sound"
                        onClick={toggleProgressSound}
                        title={
                          soundEnabled
                            ? 'Progress sound on'
                            : 'Progress sound off'
                        }
                        aria-label={
                          soundEnabled
                            ? 'Turn progress sound off'
                            : 'Turn progress sound on'
                        }
                      >
                        {soundEnabled ? '🔊' : '🔇'}
                      </button>

                      <span className="lms-progress-strip__change">
                        <small>
                          {progressAnimation.previousPercent}%
                        </small>

                        <b aria-hidden="true">→</b>

                        <strong>
                          {progressAnimation.nextPercent}%
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div
                    className="lms-progress-strip__track"
                    role="progressbar"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={displayProgressPercent}
                  >
                    {progressAnimation.deltaPercent > 0 ? (
                      <>
                        <span
                          className="lms-progress-strip__preview"
                          style={{
                            left: `${progressAnimation.previousPercent}%`,
                            width: `${progressAnimation.deltaPercent}%`,
                          }}
                        />

                        <span
                          className="lms-progress-strip__target-marker"
                          style={{
                            left: `${progressAnimation.nextPercent}%`,
                          }}
                        >
                          {progressAnimation.nextPercent}%
                        </span>
                      </>
                    ) : null}

                    <span
                      className="lms-progress-strip__fill"
                      style={{
                        width: `${animatedProgressPercent}%`,
                      }}
                    >
                      <span className="lms-progress-strip__shine" />
                    </span>

                    <strong className="lms-progress-strip__inside-value">
                      {displayProgressPercent}%
                    </strong>
                  </div>
                </>
              ) : (
                <div className="lms-progress-strip__compact-row">
                  <div className="lms-progress-strip__compact-copy">
                    <span className="lms-progress-strip__label">
                      Lesson progress
                    </span>

                    <span className="lms-progress-strip__count">
                      {resolvedCompletedTaskCount}/
                      {resolvedTotalTaskCount} completed
                    </span>
                  </div>

                  <div
                    className="lms-progress-strip__track"
                    role="progressbar"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={resolvedProgressPercent}
                  >
                    <span
                      className="lms-progress-strip__fill"
                      style={{
                        width: `${resolvedProgressPercent}%`,
                      }}
                    >
                      <span className="lms-progress-strip__shine" />
                    </span>

                    <strong className="lms-progress-strip__inside-value">
                      {resolvedProgressPercent}%
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="lms-progress-strip__sound"
                    onClick={toggleProgressSound}
                    title={
                      soundEnabled
                        ? 'Progress sound on'
                        : 'Progress sound off'
                    }
                    aria-label={
                      soundEnabled
                        ? 'Turn progress sound off'
                        : 'Turn progress sound on'
                    }
                  >
                    {soundEnabled ? '🔊' : '🔇'}
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="lms-topbar__navigation-row">
          <nav
            className="lms-topbar__steps"
            aria-label="Lesson activities"
          >
            {tasks.map((task, index) => {
              const taskId = getTaskId(task);
              const isActive =
                index === currentTaskIndex;
              const isCompleted =
                completedTaskIdSet.has(taskId);
              const isJustCompleted =
                Boolean(progressAnimation) &&
                taskId ===
                String(
                  justCompletedTaskId || '',
                );

              const taskLabel =
                task?.title ||
                `Task ${index + 1}`;

              const className = [
                'lms-topbar__step',
                isActive ? 'is-active' : '',
                isCompleted
                  ? 'is-completed'
                  : '',
                isJustCompleted
                  ? 'is-just-completed'
                  : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={taskId || index}
                  type="button"
                  className={className}
                  onClick={() =>
                    onSelectTask?.(index)
                  }
                  title={
                    isCompleted
                      ? `${taskLabel} — Done`
                      : taskLabel
                  }
                  aria-label={
                    isCompleted
                      ? `${taskLabel}, completed`
                      : taskLabel
                  }
                  aria-current={
                    isActive
                      ? 'step'
                      : undefined
                  }
                >
                  <span className="lms-topbar__step-marker">
                    {getTaskMarker(
                      task,
                      index,
                      tasks.length,
                    )}
                  </span>

                  {isCompleted ? (
                    <span
                      className="lms-topbar__step-check"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {progressAnimation ? (
        <>
          <div
            className={[
              'lms-celebration-flash',
              progressAnimation.isComplete
                ? 'is-complete'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          />

          <div
            className={[
              'lms-celebration-rings',
              progressAnimation.isComplete
                ? 'is-complete'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>

          <div
            key={`screen-fireworks-${progressAnimation.key}`}
            className={[
              'lms-screen-fireworks',
              progressAnimation.isComplete
                ? 'is-complete'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          >
            {SCREEN_FIREWORKS.map(
              (fireworkIndex) => (
                <span
                  key={fireworkIndex}
                  className={`lms-screen-firework lms-screen-firework--${fireworkIndex + 1
                    }`}
                >
                  {FIREWORK_SPARKS.map(
                    (sparkIndex) => (
                      <i
                        key={sparkIndex}
                        style={{
                          '--firework-angle': `${sparkIndex *
                            (360 /
                              FIREWORK_SPARKS.length)
                            }deg`,
                        }}
                      />
                    ),
                  )}
                </span>
              ),
            )}
          </div>
        </>
      ) : null}

      {showBadgeUnlock ? (
        <div
          className="lms-badge-unlock"
          role="dialog"
          aria-modal="true"
          aria-label={`Badge ${badgeId} unlocked`}
        >
          <div className="lms-badge-unlock__card">
            <span className="lms-badge-unlock__eyebrow">
              LESSON COMPLETE
            </span>

            <div
              className="lms-badge-unlock__medal"
              aria-hidden="true"
            >
              <span>★</span>
            </div>

            <h2>Congratulations!</h2>

            <p>You unlocked a new badge.</p>

            <strong className="lms-badge-unlock__name">
              {badgeId}
            </strong>

            <button
              type="button"
              onClick={() =>
                setShowBadgeUnlock(false)
              }
            >
              Awesome!
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}