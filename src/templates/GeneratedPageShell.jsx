import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopNavigation from '../components/TopNavigation.jsx';
import ActivityRouter from '../activities/ActivityRouter.jsx';
import { saveTaskCompletionToSupabase } from '../lib/supabaseProgress.js';

function getStates(task) {
  if (Array.isArray(task?.states) && task.states.length > 0) {
    return task.states;
  }
  return task ? [task] : [];
}

function getTaskId(task) {
  return String(task?.id || task?.taskId || '').trim();
}

function getStateId(state) {
  return String(state?.id || state?.stateId || '').trim();
}

function resolveFrameConfig(pageInstance, task, state) {
  const taskId = getTaskId(task);
  const stateId = getStateId(state);

  const baseFrameConfig = pageInstance?.frameConfig || {};
  const taskFrameConfig = taskId
    ? pageInstance?.taskRenderers?.[taskId]?.frameConfig || {}
    : {};
  const stateFrameConfig =
    taskId && stateId
      ? pageInstance?.taskRenderers?.[taskId]?.states?.[stateId]?.frameConfig || {}
      : {};

  return {
    ...baseFrameConfig,
    ...taskFrameConfig,
    ...stateFrameConfig,
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value || {}));
}



function resolveCurrentRendererType(task, state, pageInstance) {
  const taskId = getTaskId(task);
  const stateId = getStateId(state);

  const stateType =
    state?.selectedType ||
    state?.type ||
    pageInstance?.taskRenderers?.[taskId]?.states?.[stateId]?.selectedType ||
    pageInstance?.taskRenderers?.[taskId]?.states?.[stateId]?.type;

  if (stateType) {
    return String(stateType).trim();
  }

  const taskType =
    task?.selectedType ||
    task?.activityType ||
    pageInstance?.taskRenderers?.[taskId]?.selectedType ||
    pageInstance?.taskRenderers?.[taskId]?.type;

  return String(taskType || '').trim();
}


function getCompletedTasksStorageKey(courseId, lessonId, pageId) {
  return [
    'lms-completed-tasks',
    String(courseId || ''),
    String(lessonId || ''),
    String(pageId || ''),
  ].join(':');
}

function loadCompletedTaskIds(storageKey) {
  try {
    const savedValue = JSON.parse(localStorage.getItem(storageKey) || '[]');

    if (!Array.isArray(savedValue)) {
      return [];
    }

    return savedValue.map(String).filter(Boolean);
  } catch {
    return [];
  }
}

function getFetchUrl(input) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();

  return String(input?.url || '');
}

function getFetchMethod(input, init) {
  return String(
    init?.method ||
    input?.method ||
    'GET',
  ).toUpperCase();
}

function getFetchPayload(input, init) {
  const body = init?.body ?? input?.body;

  if (typeof body !== 'string' || !body.trim()) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function getGradingResult(responseData) {
  return (
    responseData?.result ||
    responseData?.data?.result ||
    responseData?.data ||
    responseData ||
    null
  );
}

export default function GeneratedPageShell({
  manifestUrl,
  pageInstanceUrl,
  courseId = '',
  lessonId = '',
  pageId = '',
  onBackToPages,
  onBackToCourses,
  onBackToLessons,
}) {
  const [manifest, setManifest] = useState(null);
  const [pageInstance, setPageInstance] = useState(null);
  const [error, setError] = useState('');

  const handleBackToCourse = useCallback(() => {
    if (typeof onBackToLessons === 'function') {
      onBackToLessons();
      return;
    }
    if (typeof onBackToPages === 'function') {
      onBackToPages();
      return;
    }
    if (typeof onBackToCourses === 'function') {
      onBackToCourses();
      return;
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const targetCourse = params.get('course') || courseId || 'VP2';
      const platformOrigin = params.get('platformOrigin');
      const nextUrl = platformOrigin
        ? `/?course=${encodeURIComponent(targetCourse)}&platformOrigin=${encodeURIComponent(platformOrigin)}`
        : `/?course=${encodeURIComponent(targetCourse)}`;
      window.location.href = nextUrl;
    } catch {
      window.history.back();
    }
  }, [onBackToLessons, onBackToPages, onBackToCourses, courseId]);
  const getInitialTaskIndex = () => {
    try {
      const p = new URLSearchParams(window.location.search);
      const val = p.get('task') || p.get('level') || p.get('t') || sessionStorage.getItem('lms_active_task');
      if (val) {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) {
          return num - 1;
        }
      }
    } catch {}
    return 0;
  };

  const [taskIndex, setTaskIndex] = useState(getInitialTaskIndex);
  const [stateIndex, setStateIndex] = useState(0);

  const updateUrlTaskParam = useCallback((newIndex) => {
    try {
      const currentUrl = new URL(window.location.href);
      if (courseId) currentUrl.searchParams.set('course', courseId);
      if (lessonId) currentUrl.searchParams.set('lesson', lessonId);
      if (pageId) currentUrl.searchParams.set('page', pageId);
      currentUrl.searchParams.set('task', String(newIndex + 1));
      window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}`);
      sessionStorage.setItem('lms_active_task', String(newIndex + 1));
    } catch (e) {
      console.warn('Could not update URL task param:', e);
    }
  }, [courseId, lessonId, pageId]);

  // Ensure full route is always present in address bar
  useEffect(() => {
    try {
      const currentUrl = new URL(window.location.href);
      let changed = false;
      if (courseId && currentUrl.searchParams.get('course') !== courseId) {
        currentUrl.searchParams.set('course', courseId);
        changed = true;
      }
      if (lessonId && currentUrl.searchParams.get('lesson') !== lessonId) {
        currentUrl.searchParams.set('lesson', lessonId);
        changed = true;
      }
      if (pageId && currentUrl.searchParams.get('page') !== pageId) {
        currentUrl.searchParams.set('page', pageId);
        changed = true;
      }
      const taskStr = String(taskIndex + 1);
      if (currentUrl.searchParams.get('task') !== taskStr) {
        currentUrl.searchParams.set('task', taskStr);
        changed = true;
      }
      if (changed) {
        window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}`);
      }
      sessionStorage.setItem('lms_active_task', taskStr);
    } catch (e) {
      console.warn('Could not ensure route in URL:', e);
    }
  }, [courseId, lessonId, pageId, taskIndex]);

  useEffect(() => {
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const val = p.get('task') || p.get('level') || p.get('t');
      if (val) {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) {
          setTaskIndex(num - 1);
          setStateIndex(0);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const completedTasksStorageKey = useMemo(
    () => getCompletedTasksStorageKey(courseId, lessonId, pageId),
    [courseId, lessonId, pageId],
  );

  const [completedTaskIds, setCompletedTaskIds] = useState(() =>
    loadCompletedTaskIds(completedTasksStorageKey),
  );

  const [progressJustIncreased, setProgressJustIncreased] = useState(false);
  const [progressCelebrationKey, setProgressCelebrationKey] = useState(0);
  const [justCompletedTaskId, setJustCompletedTaskId] = useState('');

  const currentTaskIdRef = useRef('');
  const autoTransitionTimerRef = useRef(null);
  const taskIndexRef = useRef(0);
  const tasksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (autoTransitionTimerRef.current) {
        clearTimeout(autoTransitionTimerRef.current);
      }
    };
  }, []);


  useEffect(() => {
    setCompletedTaskIds(
      loadCompletedTaskIds(completedTasksStorageKey),
    );

    const studentEmail =
      sessionStorage.getItem('lms_student_email') ||
      localStorage.getItem('lms_student_email') ||
      '';
    const supabaseUrl =
      sessionStorage.getItem('lms_supabase_url') ||
      localStorage.getItem('lms_supabase_url');
    const supabaseKey =
      sessionStorage.getItem('lms_supabase_key') ||
      localStorage.getItem('lms_supabase_key');

    if (supabaseUrl && supabaseKey && studentEmail && pageId) {
      const url = `${supabaseUrl}/rest/v1/activity_progress?user_id=eq.${encodeURIComponent(studentEmail)}&page_id=eq.${encodeURIComponent(pageId)}&select=task_id,status,is_completed`;
      const accessToken =
        sessionStorage.getItem('lms_access_token') ||
        localStorage.getItem('lms_access_token');
      const headers = {
        apikey: supabaseKey,
      };
      if (accessToken && accessToken.split('.').length === 3) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      fetch(url, { headers })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            const dbCompletedIds = data
              .filter(
                (r) =>
                  r.is_completed === true ||
                  String(r.is_completed) === 'true' ||
                  r.status === 'completed' ||
                  r.status === 'correct' ||
                  r.status === 'passed',
              )
              .map((r) => String(r.task_id))
              .filter(Boolean);

            if (dbCompletedIds.length > 0) {
              setCompletedTaskIds((currentIds) => {
                const merged = Array.from(new Set([...currentIds, ...dbCompletedIds]));
                try {
                  localStorage.setItem(completedTasksStorageKey, JSON.stringify(merged));
                } catch (e) {}
                return merged;
              });
            }
          }
        })
        .catch((err) => console.warn('[GeneratedPageShell] Failed to load Supabase page progress:', err));
    }
  }, [completedTasksStorageKey, pageId]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    async function trackedFetch(input, init) {
      const response = await originalFetch(input, init);

      try {
        const requestUrl = getFetchUrl(input);
        const requestMethod = getFetchMethod(input, init);

        const isActivitySubmission =
          response.ok &&
          requestMethod === 'POST' &&
          requestUrl.includes('/api/activity-attempts');

        if (isActivitySubmission) {
          let responseData = null;

          try {
            responseData = await response.clone().json();
          } catch {
            responseData = null;
          }

          const gradingResult = getGradingResult(responseData);

          /*
           * Chỉ đánh dấu Done khi backend xác nhận bài làm đúng hoàn toàn.
           * API trả về thành công nhưng isCorrect = false thì không cập nhật.
           */
            if (gradingResult?.isCorrect === true) {
              const payload = getFetchPayload(input, init);

              const submittedTaskId = String(
                payload?.taskId ||
                payload?.answer?.taskId ||
                currentTaskIdRef.current ||
                '',
              ).trim();

              if (submittedTaskId) {
                saveTaskCompletionToSupabase({
                  courseId,
                  lessonId,
                  pageId,
                  taskId: submittedTaskId,
                });

                const wasAlreadyCompleted = completedTaskIds.includes(submittedTaskId);

                setCompletedTaskIds((currentIds) => {
                  if (currentIds.includes(submittedTaskId)) {
                    return currentIds;
                  }

                  const nextIds = [
                    ...currentIds,
                    submittedTaskId,
                  ];

                  localStorage.setItem(
                    completedTasksStorageKey,
                    JSON.stringify(nextIds),
                  );

                  return nextIds;
                });

                if (!wasAlreadyCompleted) {
                  setProgressJustIncreased(true);
                  setProgressCelebrationKey(Date.now());
                  setJustCompletedTaskId(submittedTaskId);
                }

                // Auto transition to the next task after 1.5 seconds
                if (taskIndexRef.current < tasksRef.current.length - 1) {
                  if (autoTransitionTimerRef.current) {
                    clearTimeout(autoTransitionTimerRef.current);
                  }
                  autoTransitionTimerRef.current = setTimeout(() => {
                    setTaskIndex((prev) => {
                      const nextIdx = Math.min(tasksRef.current.length - 1, prev + 1);
                      updateUrlTaskParam(nextIdx);
                      return nextIdx;
                    });
                    setStateIndex(0);
                  }, 1500);
                }
              }
            }
        }
      } catch (trackingError) {
        console.warn(
          'Could not update completed task indicator:',
          trackingError,
        );
      }

      return response;
    }

    window.fetch = trackedFetch;

    return () => {
      if (window.fetch === trackedFetch) {
        window.fetch = originalFetch;
      }
    };
  }, [completedTasksStorageKey]);

  useEffect(() => {
    let isCancelled = false;

    async function loadPage() {
      try {
        const candidateUrls = [manifestUrl];
        if (manifestUrl.includes('/VP2_')) {
          candidateUrls.push(manifestUrl.replace('/VP2_', '/VP_'));
        } else if (manifestUrl.includes('/VP_')) {
          candidateUrls.push(manifestUrl.replace('/VP_', '/VP2_'));
        }
        if (manifestUrl.includes('/VP2_M3L2_1/')) {
          candidateUrls.push(manifestUrl.replace('/VP2_M3L2_1/', '/VP2_M3L2_1_track1/'));
        }

        let nextManifest = null;
        let successfulManifestUrl = manifestUrl;
        for (const url of candidateUrls) {
          try {
            const manifestResponse = await fetch(url);
            if (manifestResponse.ok) {
              const parsed = await manifestResponse.json();
              if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
                nextManifest = parsed;
                successfulManifestUrl = url;
                break;
              } else if (!nextManifest) {
                nextManifest = parsed;
                successfulManifestUrl = url;
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch manifest from ${url}:`, err);
          }
        }

        if (!nextManifest) {
          nextManifest = {
            metadata: {
              courseTitle: courseId,
              lessonTitle: lessonId,
              pageTitle: pageId,
            },
            tasks: [],
          };
        }

        let nextPageInstance = {
          schemaVersion: 0,
          pageInstanceId: 'legacy',
          frameConfig: {},
          taskRenderers: {},
        };

        const candidateInstanceUrls = [pageInstanceUrl];
        if (successfulManifestUrl) {
          candidateInstanceUrls.unshift(successfulManifestUrl.replace('manifest.json', 'page.instance.json'));
        }
        if (pageInstanceUrl.includes('/VP2_')) {
          candidateInstanceUrls.push(pageInstanceUrl.replace('/VP2_', '/VP_'));
        } else if (pageInstanceUrl.includes('/VP_')) {
          candidateInstanceUrls.push(pageInstanceUrl.replace('/VP_', '/VP2_'));
        }

        for (const instUrl of candidateInstanceUrls) {
          try {
            const pageInstanceResponse = await fetch(instUrl);
            if (pageInstanceResponse.ok) {
              nextPageInstance = await pageInstanceResponse.json();
              break;
            }
          } catch {
            // Default empty pageInstance is fine
          }
        }

        if (isCancelled) return;

        setManifest(nextManifest);
        setPageInstance(nextPageInstance);
      } catch (err) {
        if (isCancelled) return;
        setError(err.message);
      }
    }

    loadPage();

    return () => {
      isCancelled = true;
    };
  }, [manifestUrl, pageInstanceUrl, courseId, lessonId, pageId]);

  const tasks = useMemo(() => {
    return Array.isArray(manifest?.tasks) ? manifest.tasks : [];
  }, [manifest]);

  // Sync taskIndex when manifest loads if task/level query param is present
  useEffect(() => {
    if (!manifest?.tasks?.length) return;
    const p = new URLSearchParams(window.location.search);
    const val = p.get('task') || p.get('level') || p.get('t');
    if (!val) return;

    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      const targetIdx = Math.min(manifest.tasks.length - 1, num - 1);
      setTaskIndex(targetIdx);
      return;
    }

    const foundIdx = manifest.tasks.findIndex(
      (t) => t.id === val || t.taskId === val || t.activity_id === val
    );
    if (foundIdx !== -1) {
      setTaskIndex(foundIdx);
    }
  }, [manifest]);

  const task = tasks[taskIndex] || null;
  const states = getStates(task);
  const state = states[stateIndex] || null;

  useEffect(() => {
    currentTaskIdRef.current = getTaskId(task);
  }, [task]);

  // Keep refs in sync for use inside closures (trackedFetch, setTimeout)
  taskIndexRef.current = taskIndex;
  tasksRef.current = tasks;

  const courseTitle = manifest?.metadata?.courseTitle || courseId || 'Course';
  const lessonTitle = manifest?.metadata?.lessonTitle || lessonId || 'Lesson';
  const pageTitle = manifest?.metadata?.pageTitle || pageId || 'Page';

  const frameConfig = useMemo(() => {
    return resolveFrameConfig(pageInstance, task, state);
  }, [pageInstance, task, state]);


  const currentRendererType = useMemo(() => {
    return resolveCurrentRendererType(task, state, pageInstance);
  }, [task, state, pageInstance]);

  const showSideArrows = currentRendererType === 'generic-static';

  const completedTaskCount = useMemo(() => {
    if (!tasks.length) return 0;

    const taskIdSet = new Set(
      tasks.map((item) => getTaskId(item)).filter(Boolean),
    );

    return completedTaskIds.filter((taskId) =>
      taskIdSet.has(String(taskId)),
    ).length;
  }, [completedTaskIds, tasks]);

  const lessonProgressPercent = useMemo(() => {
    if (!tasks.length) return 0;

    return Math.round(
      (completedTaskCount / tasks.length) * 100,
    );
  }, [completedTaskCount, tasks.length]);

  const handleTaskCompleted = useCallback((completion = {}) => {
    const submittedTaskId = String(
      completion?.taskId ||
      currentTaskIdRef.current ||
      '',
    ).trim();

    if (!submittedTaskId) return;

    const wasAlreadyCompleted = completedTaskIds.includes(submittedTaskId);

    saveTaskCompletionToSupabase({
      courseId,
      lessonId,
      pageId,
      taskId: submittedTaskId,
      activityType: completion?.activityType || 'completion-sync',
    });

    setCompletedTaskIds((currentIds) => {
      if (currentIds.includes(submittedTaskId)) {
        return currentIds;
      }

      const nextIds = [
        ...currentIds,
        submittedTaskId,
      ];

      localStorage.setItem(
        completedTasksStorageKey,
        JSON.stringify(nextIds),
      );

      return nextIds;
    });

    if (!wasAlreadyCompleted) {
      setProgressJustIncreased(true);
      setProgressCelebrationKey(Date.now());
      setJustCompletedTaskId(submittedTaskId);
    }

    if (completion?.autoTransition !== false && taskIndexRef.current < tasksRef.current.length - 1) {
      if (autoTransitionTimerRef.current) {
        clearTimeout(autoTransitionTimerRef.current);
      }
      autoTransitionTimerRef.current = setTimeout(() => {
        setTaskIndex((prev) => {
          const nextIdx = Math.min(tasksRef.current.length - 1, prev + 1);
          updateUrlTaskParam(nextIdx);
          return nextIdx;
        });
        setStateIndex(0);
      }, 1500);
    }
  }, [completedTaskIds, completedTasksStorageKey, updateUrlTaskParam]);

  function gotoTask(nextTaskIndex) {
    if (autoTransitionTimerRef.current) clearTimeout(autoTransitionTimerRef.current);
    setTaskIndex(nextTaskIndex);
    setStateIndex(0);
    updateUrlTaskParam(nextTaskIndex);
  }

  function prevTask() {
    if (autoTransitionTimerRef.current) clearTimeout(autoTransitionTimerRef.current);
    if (!tasks.length) return;
    const prevIdx = Math.max(0, taskIndex - 1);
    setTaskIndex(prevIdx);
    setStateIndex(0);
    updateUrlTaskParam(prevIdx);
  }

  function nextTask() {
    if (autoTransitionTimerRef.current) clearTimeout(autoTransitionTimerRef.current);
    if (!tasks.length) return;
    const nextIdx = Math.min(tasks.length - 1, taskIndex + 1);
    setTaskIndex(nextIdx);
    setStateIndex(0);
    updateUrlTaskParam(nextIdx);
  }

  function prevState() {
    if (!task || !tasks.length) return;

    if (stateIndex > 0) {
      setStateIndex(stateIndex - 1);
      return;
    }

    if (taskIndex > 0) {
      const prevTaskIndex = taskIndex - 1;
      const prevTaskData = tasks[prevTaskIndex];
      const prevStates = getStates(prevTaskData);

      setTaskIndex(prevTaskIndex);
      setStateIndex(Math.max(0, prevStates.length - 1));
    }
  }

  function nextState() {
    if (!task || !tasks.length) return;

    if (stateIndex < states.length - 1) {
      setStateIndex(stateIndex + 1);
      return;
    }

    if (taskIndex < tasks.length - 1) {
      setTaskIndex(taskIndex + 1);
      setStateIndex(0);
    }
  }

  if (error) {
    return (
      <main className="empty-screen">
        <h1>Page failed to load</h1>
        <p>{error}</p>

        <button type="button" onClick={onBackToPages}>
          Back to pages
        </button>
      </main>
    );
  }

  if (manifest && tasks.length === 0) {
    return (
      <div className="app-shell">
        <TopNavigation
          title={pageTitle}
          courseId={courseId}
          courseTitle={courseTitle}
          moduleId={lessonId}
          lessonTitle={lessonTitle}
          pageId={pageId}
          pageTitle={pageTitle}
          tasks={[]}
          currentTaskIndex={0}
          completedTaskIds={completedTaskIds}
          onBackToCatalog={onBackToPages}
          onBackToCourses={onBackToCourses}
        />
        <main style={{ padding: 48, textAlign: 'center', fontFamily: 'Nunito, Arial, sans-serif' }}>
          <h2>Trang {pageId}</h2>
          <p style={{ color: '#64748b', fontSize: 16, marginTop: 8 }}>
            Chưa có bài tập nào được cấu hình cho trang này.
          </p>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
            (Hãy kiểm tra tệp <code>manifest.json</code> trong thư mục của trang để cấu hình bài tập)
          </p>
          <button
            type="button"
            onClick={onBackToPages}
            style={{
              marginTop: 20,
              padding: '10px 24px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Quay lại bài học
          </button>
        </main>
      </div>
    );
  }

  if (!manifest || !pageInstance || !task || !state) {
    return (
      <main className="empty-screen">
        <p>Loading page...</p>

        <button type="button" onClick={handleBackToCourse}>
          Back to pages
        </button>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <button
        type="button"
        className="lms-frame__back-to-course"
        onClick={handleBackToCourse}
        title="Back to Course"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          padding: '10px 16px',
          background: 'rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: 'fit-content',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          transition: 'all 0.2s ease',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Course
      </button>

      <TopNavigation
        title={pageTitle}
        courseId={courseId}
        courseTitle={courseTitle}
        moduleId={lessonId}
        lessonTitle={lessonTitle}
        pageId={pageId}
        pageTitle={pageTitle}
        tasks={tasks}
        currentTaskIndex={taskIndex}
        completedTaskIds={completedTaskIds}
        justCompletedTaskId={justCompletedTaskId}
        progressJustIncreased={progressJustIncreased}
        progressCelebrationKey={progressCelebrationKey}
        onSelectTask={gotoTask}
        onBackToCatalog={handleBackToCourse}
        onBackToCourses={onBackToCourses}
      />

      <ActivityRouter
        pageInstance={pageInstance}
        frameConfig={frameConfig}
        task={task}
        state={state}
        stateIndex={stateIndex}
        onNextTask={nextTask}
        onPrevTask={prevTask}
        onSelectState={setStateIndex}
        onBack={handleBackToCourse}
        tasks={tasks}
        taskIndex={taskIndex}
        completedTaskIds={completedTaskIds}
        onTaskCompleted={handleTaskCompleted}
        onSelectTask={gotoTask}
        onBackToCourses={onBackToCourses}
      />

    </div>
  );
}
