import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ScratchTask.css';
import { DEMO_SOURCE_CODE } from './demoSourceCode';

export default function ScratchTask({
  task,
  state,
  lessonId,
  pageId,
  onTaskCompleted,
  onNextTask,
  onPrevTask,
  tasks = [],
  taskIndex = 0,
  completedTaskIds = [],
  onSelectTask,
  onBackToCourses,
}) {
  const taskTitle = task?.title || 'Scratch Activity';

  const matchPos = String(task?.activity_id || task?.id || task?.taskId || '').match(/_(\d+)$/);
  const derivedPos = matchPos ? parseInt(matchPos[1], 10) : 1;
  const levelPosition = Number(task?.level_position || task?.position || task?.levelPosition || derivedPos);

  // Task 1 starts from the original bare Bear project, not the walking-bear exercise.
  // Keep this fallback even if an older LMS/Supabase task payload overrides the manifest.
  const isBearStarterTask = String(task?.activity_id || task?.id || task?.taskId || '') === 'VP2_M1L2_3_1';
  const projectId = isBearStarterTask ? 'M1L1 Bear.sb3' : (
    task?.starter_project_id ||
    task?.config?.project?.id ||
    task?.config?.project ||
    task?.projectId ||
    ''
  );

  const tipItems = React.useMemo(() => {
    const candidates = [task?.tips, task?.config?.tips, task?.states?.[0]?.tips, state?.tips];
    return candidates.find((items) => Array.isArray(items) && items.length > 0) || [];
  }, [task?.tips, task?.config?.tips, task?.states, state?.tips]);

  const hasDrawerContent = (Array.isArray(task?.requirements) && task.requirements.length > 0) ||
                           (Array.isArray(task?.media) && task.media.length > 0) || tipItems.length > 0;

  // Drawer open/collapse state
  const iframeRef = useRef(null);
  const demoIframeRef = useRef(null);
  const [demoReady, setDemoReady] = useState(false);
  const containerRef = useRef(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(
    task?.drawerOpen !== undefined ? !!task.drawerOpen : hasDrawerContent
  );
  const [drawerWidth, setDrawerWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.max(450, Math.min(680, Math.round(window.innerWidth * 0.42)));
    }
    return 480;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [completedItems, setCompletedItems] = useState({});

  const bonusItems = React.useMemo(() => {
    const requirements = task?.requirements || task?.states?.[0]?.requirements || state?.requirements || [];
    return Array.isArray(requirements) ? requirements.filter((item) => item.taskType === 'bonus') : [];
  }, [task?.requirements, task?.states, state?.requirements]);

  // Toolbar File / Edit menu states
  const [openFileMenu, setOpenFileMenu] = useState(false);
  const [openEditMenu, setOpenEditMenu] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const saveTimeoutRef = useRef(null);
  const [isTurboMode, setIsTurboMode] = useState(false);

  // Shared storage key for projects that span multiple weeks/lessons (such as M3L4, M3L5, M3L6 and M5L5, M5L6)
  const isM3L4_L6 =
    ['VP2_M3L4_1', 'VP2_M3L5_1', 'VP2_M3L6_1'].includes(String(task?.page_id || task?.pageId || '')) ||
    String(task?.activity_id || task?.id || task?.taskId || '').includes('M3L4') ||
    String(task?.activity_id || task?.id || task?.taskId || '').includes('M3L5') ||
    String(task?.activity_id || task?.id || task?.taskId || '').includes('M3L6') ||
    (task?.title || '').toLowerCase().includes('game planning') ||
    (task?.title || '').toLowerCase().includes('game testing') ||
    (task?.title || '').toLowerCase().includes('hackathon game');

  const isM5L5_L6 =
    ['VP2_M5L5_1', 'VP2_M5L6_1'].includes(String(task?.page_id || task?.pageId || '')) ||
    String(task?.activity_id || task?.id || task?.taskId || '').includes('M5L5') ||
    String(task?.activity_id || task?.id || task?.taskId || '').includes('M5L6') ||
    (task?.title || '').toLowerCase().includes('chatbot') ||
    (task?.title || '').toLowerCase().includes('chatbot. planning') ||
    (task?.title || '').toLowerCase().includes('project. presentation');

  const draftTaskId = String(task?.id || task?.taskId || task?.activity_id || '');
  const draftLesson = lessonId || task?.lesson_id || task?.lessonId || '';
  const draftPage = pageId || task?.page_id || task?.pageId || '';
  const storageKey = isM3L4_L6
    ? 'M3L4_Shared_Game_BlankStarter'
    : isM5L5_L6
    ? 'M5L5_Shared_Chatbot'
    : (projectId || task?.id || task?.taskId || '');

  const handleSaveClick = () => {
    setIsSaving(true);
    setSaveError('');
    iframeRef.current?.contentWindow?.postMessage({ type: 'SAVE_TO_STORAGE' }, window.location.origin);
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setIsSaving(false);
      setSaveError('Online save was not confirmed. Try again before switching lessons.');
    }, 80000);
  };

  useEffect(() => {
    const handleSavedMsg = (e) => {
      if (e.origin !== window.location.origin || e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.type === 'PROJECT_RESTORE_FAILED') {
        setSaveError('Could not restore the online draft. Reopen this task to retry.');
      }
      if (e.data?.type === 'PROJECT_SAVE_FAILED') {
        clearTimeout(saveTimeoutRef.current);
        setIsSaving(false);
        setSaveError('Could not save the project online. Try again or download a copy.');
      }
      if (e.data?.type === 'PROJECT_SAVED_SUCCESS') {
        clearTimeout(saveTimeoutRef.current);
        setSaveError('');
        const d = new Date();
        setLastSaveTime(
          `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
        );
        setIsSaving(false);
      }
    };
    window.addEventListener('message', handleSavedMsg);
    return () => {
      clearTimeout(saveTimeoutRef.current);
      window.removeEventListener('message', handleSavedMsg);
    };
  }, []);

  useEffect(() => {
    const handleTurboMsg = (e) => {
      if (e.data?.type === 'TURBO_MODE_CHANGED') {
        setIsTurboMode(!!e.data.turboMode);
      }
    };
    window.addEventListener('message', handleTurboMsg);
    return () => window.removeEventListener('message', handleTurboMsg);
  }, []);

  useEffect(() => {
    const closeMenus = () => {
      setOpenFileMenu(false);
      setOpenEditMenu(false);
    };
    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  // Requirements accordion open state
  const [openReqs, setOpenReqs] = useState({});

  const toggleReqAccordion = (id) => {
    setOpenReqs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const derivedProjectTitle = (
    (isBearStarterTask ? 'M1L1 Bear' : '') ||
    task?.project_title ||
    task?.projectName ||
    (projectId && typeof projectId === 'string' && projectId.toLowerCase().endsWith('.sb3')
      ? projectId.replace(/\.sb3$/i, '').replace(/[_]+/g, ' ').trim()
      : '') ||
    task?.title ||
    ''
  );

  const editorProjectId = isM3L4_L6 ? '' : projectId;
  const draftScope = isM3L4_L6 || isM5L5_L6 ? storageKey : [draftLesson, draftPage, draftTaskId].join(':');
  const draftParams = new URLSearchParams({
    draftScope, draftLesson, draftPage, draftTask: draftTaskId,
  });
  const editorUrl = `/scratch-gui/index.html?${editorProjectId ? `project=${encodeURIComponent(editorProjectId)}&` : ''}${derivedProjectTitle ? `title=${encodeURIComponent(derivedProjectTitle)}&` : ''}level=${encodeURIComponent(levelPosition)}${storageKey ? `&storageKey=${encodeURIComponent(storageKey)}` : ''}&${draftParams}`;

  // Selected requirement ID for highlighting and displaying its image/GIF
  const [selectedReqId, setSelectedReqId] = useState(null);

  // Sub-view in Demo tab: 'stage' (interactive Scratch output) or 'code' (Scratch block code & XML)
  const [demoViewMode, setDemoViewMode] = useState('stage');

  // Lightbox modal for enlarged image/GIF preview
  const [modalImage, setModalImage] = useState(null);

  // XML copy notification state
  const [copiedXml, setCopiedXml] = useState(false);

  // Reset checklist checkboxes and update drawer state when task switches
  useEffect(() => {
    setIsDrawerOpen(
      task?.drawerOpen !== undefined ? !!task.drawerOpen : hasDrawerContent
    );
    setCompletedItems({});
    setSelectedReqId(null);
    clearTimeout(saveTimeoutRef.current);
    setSaveError('');
    setIsSaving(false);
    setLastSaveTime('');
    setDemoViewMode('stage');
    setCopiedXml(false);
  }, [task?.activity_id, task?.id, task?.taskId, levelPosition, hasDrawerContent, task?.drawerOpen]);

  const lowerTitle = (taskTitle || '').toLowerCase();
  const isAutoCheck = levelPosition >= 9 && levelPosition <= 11;

  // Modal confirm state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Checklist from static manifest requirements or default fallback
  const checklistItems = React.useMemo(() => {
    if (Array.isArray(task?.requirements) && task.requirements.length > 0) {
      return task.requirements.filter((item) => item.taskType !== 'bonus').map((item, idx) => ({
        id: item.id || `item_${idx + 1}`,
        title: item.title || '',
        text: item.text || item.title || `Requirement ${idx + 1}`,
        url: item.url || '',
      }));
    }
    if (lowerTitle.includes('potion')) {
      return [
        { id: 'item_1', text: 'The potion sends a message', title: '', url: '' },
        { id: 'item_2', text: 'The Sorceress receives the message', title: '', url: '' },
        { id: 'item_3', text: 'Sorceress transformations', title: '', url: '' },
        { id: 'item_4', text: 'Initial placement', title: '', url: '' },
      ];
    }
    if (lowerTitle.includes('knight')) {
      return [
        { id: 'k_1', text: 'Initial placement', title: '', url: '' },
        { id: 'k_2', text: 'The knight walks around one side of the tower', title: '', url: '' },
        { id: 'k_3', text: 'The knight turns', title: '', url: '' },
        { id: 'k_4', text: 'Loop', title: '', url: '' },
      ];
    }
    return [
      { id: 'c_1', text: 'Task requirements completed', title: '', url: '' },
      { id: 'c_2', text: 'Check with teacher', title: '', url: '' },
    ];
  }, [task?.requirements, lowerTitle]);

  const [isPresentationOpen, setIsPresentationOpen] = useState(true);

  useEffect(() => {
    setOpenReqs({});
    setIsPresentationOpen(true);
  }, [task?.id, task?.taskId, task?.activity_id, levelPosition]);

  const selectedReq = React.useMemo(() => {
    return checklistItems.find((it) => it.id === selectedReqId) || null;
  }, [checklistItems, selectedReqId]);

  const isM1L2Task = String(task?.activity_id || task?.id || task?.taskId || '').includes('M1L2') ||
                     String(task?.lesson_id || task?.lessonId || '').includes('M1L2');
  const demoProjectId = task?.hide_demo === true ? '' : (
    task?.demo_project_id ||
    task?.demoProjectId ||
    task?.config?.presentation?.projectId ||
    task?.config?.presentation?.project ||
    (isM1L2Task && levelPosition === 7 ? 'level_7_demo' : isM1L2Task && levelPosition === 8 ? 'level_8_demo' : '')
  );

  const previewMediaUrl = task?.media?.[0]?.url || task?.preview_url || '';
  const presentationMedia =
    task?.media?.find?.((item) => item.type === 'presentation') ||
    state?.media?.find?.((item) => item.type === 'presentation') ||
    task?.states?.[0]?.media?.find?.((item) => item.type === 'presentation') ||
    task?.media?.[0] ||
    state?.media?.[0] ||
    task?.states?.[0]?.media?.[0] ||
    (previewMediaUrl || task?.description
      ? { url: previewMediaUrl, text: (previewMediaUrl && task?.instruction) || task?.description }
      : null);
  const presentationTitle = state?.config?.presentation?.title ||
    task?.config?.presentation?.title || presentationMedia?.title || taskTitle;
  const demoInstructionText = [
    presentationMedia?.text,
    state?.config?.presentation?.text,
    task?.config?.presentation?.text,
    state?.instruction,
    task?.instruction,
    state?.description,
    task?.description,
  ].find((value) => typeof value === 'string' && value.trim())?.trim();

  const activeDemoCode = DEMO_SOURCE_CODE[demoProjectId] || DEMO_SOURCE_CODE[`level_${levelPosition}_demo`] || null;

  // Demo runs in a separate Scratch VM iframe. Wait for its project to load before
  // enabling controls, and never send commands to the student's editable project.
  useEffect(() => {
    setDemoReady(false);
  }, [demoProjectId, levelPosition, isPresentationOpen]);

  useEffect(() => {
    const onDemoMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== demoIframeRef.current?.contentWindow) return;
      if (event.data?.type === 'SCRATCH_DEMO_READY') setDemoReady(true);
    };
    window.addEventListener('message', onDemoMessage);
    return () => window.removeEventListener('message', onDemoMessage);
  }, []);

  // Reload-safe handshake: late React listeners and iframe loads cannot lose READY.
  useEffect(() => {
    if (!demoProjectId || !isPresentationOpen || demoReady) return;
    const ping = () => demoIframeRef.current?.contentWindow?.postMessage(
      { type: 'SCRATCH_DEMO_PING' },
      window.location.origin
    );
    ping();
    const timer = window.setInterval(ping, 300);
    return () => window.clearInterval(timer);
  }, [demoProjectId, levelPosition, isPresentationOpen, demoReady]);

  const controlDemo = (type) => {
    const demoWindow = demoIframeRef.current?.contentWindow;
    if (!demoReady || !demoWindow) return;
    if (type === 'SCRATCH_DEMO_RUN') demoWindow.focus();
    demoWindow.postMessage({ type }, window.location.origin);
  };

  const [activeTab, setActiveTab] = useState(demoProjectId ? 'demo' : 'media');

  useEffect(() => {
    setActiveTab(demoProjectId ? 'demo' : 'media');
  }, [task?.activity_id, task?.id, task?.taskId, levelPosition, demoProjectId]);

  const toggleCheckItem = (id) => {
    setCompletedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyXml = (xmlString) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(xmlString).then(() => {
        setCopiedXml(true);
        setTimeout(() => setCopiedXml(false), 2000);
      });
    }
  };

  // Click Check: Open confirmation popup
  const handleCheck = () => {
    setShowConfirmModal(true);
  };

  const confirmAndProceed = () => {
    if (isSaving || !draftTaskId) return;
    onTaskCompleted?.({
      taskId: draftTaskId,
      completed: true,
      activityType: 'scratch-task',
      autoTransition: false,
    });
    setShowConfirmModal(false);
    onNextTask?.();
  };

  // Toggle drawer open/close
  const toggleDrawer = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, time: 0 });

  // Drag resizer
  const handleDividerPointerDown = (e) => {
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, time: Date.now() };
    isDraggingRef.current = false;
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e) => {
      const dist = Math.abs(e.clientX - dragStartRef.current.x);
      if (dist > 4) {
        isDraggingRef.current = true;
      }
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const minW = 320;
      const maxW = typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.75) : 800;
      if (newWidth >= minW && newWidth <= maxW) {
        setDrawerWidth(newWidth);
      }
    };

    const handlePointerUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing]);

  const handleDividerClick = (e) => {
    if (isDraggingRef.current) return;
    setIsDrawerOpen((prev) => !prev);
  };

  const [selectedVote, setSelectedVote] = useState(null);
  const isRatingTask =
    task?.level_type === 'rating' ||
    task?.type === 'rating' ||
    lowerTitle.includes('rate') ||
    lowerTitle.includes('rating') ||
    lowerTitle.includes('like the task');

  const handleVoteClick = async (voteValue) => {
    setSelectedVote(voteValue);
    const studentEmail = localStorage.getItem('lms_student_email') || '';
    const supabaseUrl = localStorage.getItem('lms_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = localStorage.getItem('lms_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;
    const taskId = task?.activity_id || task?.id || task?.taskId || 'rating-task';

    if (supabaseUrl && supabaseKey && studentEmail) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/activity_progress`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            user_id: studentEmail,
            course_id: task?.course_id || 'VP2',
            lesson_id: String(task?.lesson_id || task?.lessonId || 'VP2_L1'),
            page_id: String(task?.page_id || task?.pageId || 'page_1'),
            task_id: taskId,
            activity_type: 'rating',
            status: 'completed',
            is_completed: true,
            updated_at: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.warn('Lỗi lưu rating activity_progress:', err);
      }
    }

    if (typeof onTaskCompleted === 'function') {
      onTaskCompleted({
        taskId,
        completed: true,
        activityType: 'rating',
      });
    }

    setTimeout(() => {
      if (typeof onNextTask === 'function') {
        onNextTask();
      }
    }, 700);
  };

  if (isRatingTask) {
    return (
      <div className="scratch-rating-screen">
        <h1 className="scratch-rating-title">Did you like the task?</h1>
        <div className="scratch-rating-emojis">
          {/* Sad */}
          <button
            type="button"
            className={`scratch-rating-btn ${selectedVote === 'sad' ? 'selected' : ''}`}
            onClick={() => handleVoteClick('sad')}
            title="Didn't like it"
          >
            <svg viewBox="0 0 100 100" className="scratch-rating-svg">
              <circle cx="50" cy="50" r="46" fill="#ffffff" />
              <circle cx="35" cy="40" r="5" fill="#6c2eb9" />
              <circle cx="65" cy="40" r="5" fill="#6c2eb9" />
              <path d="M 32 68 Q 50 50 68 68" stroke="#6c2eb9" strokeWidth="6" strokeLinecap="round" fill="none" />
            </svg>
          </button>

          {/* Neutral */}
          <button
            type="button"
            className={`scratch-rating-btn ${selectedVote === 'neutral' ? 'selected' : ''}`}
            onClick={() => handleVoteClick('neutral')}
            title="Neutral"
          >
            <svg viewBox="0 0 100 100" className="scratch-rating-svg">
              <circle cx="50" cy="50" r="46" fill="#ffffff" />
              <circle cx="35" cy="40" r="5" fill="#6c2eb9" />
              <circle cx="65" cy="40" r="5" fill="#6c2eb9" />
              <line x1="32" y1="62" x2="68" y2="62" stroke="#6c2eb9" strokeWidth="6" strokeLinecap="round" />
            </svg>
          </button>

          {/* Happy */}
          <button
            type="button"
            className={`scratch-rating-btn ${selectedVote === 'happy' ? 'selected' : ''}`}
            onClick={() => handleVoteClick('happy')}
            title="Liked it!"
          >
            <svg viewBox="0 0 100 100" className="scratch-rating-svg">
              <circle cx="50" cy="50" r="46" fill="#ffffff" />
              <circle cx="35" cy="40" r="5" fill="#6c2eb9" />
              <circle cx="65" cy="40" r="5" fill="#6c2eb9" />
              <path d="M 32 58 Q 50 76 68 58" stroke="#6c2eb9" strokeWidth="6" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>
        {selectedVote && (
          <div className="scratch-rating-feedback">
            <span>✓ Thank you for your feedback!</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`scratch-task-container ${isResizing ? 'is-resizing' : ''} ${isDrawerOpen ? 'has-drawer-open' : 'has-drawer-closed'}`}
      ref={containerRef}
    >
      {/* Left: Scratch Editor iframe (Full width, overlayed by drawer on the right) */}
      <div className="scratch-task-editor-pane">
        <div className="scratch-task-toolbar">
          <div className="scratch-task-toolbar-left">
            <div
              className="scratch-task-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                setOpenFileMenu((v) => !v);
                setOpenEditMenu(false);
              }}
            >
              <span>File</span>
              {openFileMenu && (
                <div className="scratch-task-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="scratch-task-dropdown-item"
                    onClick={() => {
                      setOpenFileMenu(false);
                      const win = iframeRef.current?.contentWindow;
                      if (win?.loadProjectFromComputer) {
                        win.loadProjectFromComputer();
                      } else {
                        win?.postMessage({ type: 'LOAD_FROM_COMPUTER' }, '*');
                      }
                    }}
                  >
                    Load from your computer
                  </div>
                  <div
                    className="scratch-task-dropdown-item"
                    onClick={async () => {
                      setOpenFileMenu(false);
                      const win = iframeRef.current?.contentWindow;
                      const title = projectTitle || taskTitle || task?.title || 'project';

                      // 1. Direct download via Scratch VM in top-level window
                      try {
                        const vm = win?.vm || win?.__scratchProjectLoader?.props?.vm;
                        if (vm && typeof vm.saveProjectSb3 === 'function') {
                          const blob = await vm.saveProjectSb3();
                          const filename = title.endsWith('.sb3') ? title : `${title}.sb3`;
                          const blobUrl = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = blobUrl;
                          link.download = filename;
                          document.body.appendChild(link);
                          link.click();
                          setTimeout(() => {
                            document.body.removeChild(link);
                            URL.revokeObjectURL(blobUrl);
                          }, 1000);
                          return;
                        }
                      } catch (err) {
                        console.warn('[ScratchTask] Direct save from VM failed, trying fallback:', err);
                      }

                      // 2. Call helper on iframe window
                      try {
                        if (win?.saveProjectToComputer) {
                          win.saveProjectToComputer(title);
                          return;
                        }
                      } catch (err) {
                        console.warn('[ScratchTask] Call to win.saveProjectToComputer failed:', err);
                      }

                      // 3. Fallback: postMessage to iframe
                      win?.postMessage({ type: 'SAVE_TO_COMPUTER', title }, '*');
                    }}
                  >
                    Save to your computer
                  </div>
                  <div
                    className="scratch-task-dropdown-item"
                    onClick={() => {
                      setOpenFileMenu(false);
                      const ok = window.confirm('Revert back to the draft project? Any unsaved changes will be lost.');
                      if (ok) {
                        const win = iframeRef.current?.contentWindow;
                        if (win?.revertToDraftProject) {
                          win.revertToDraftProject();
                        } else {
                          win?.postMessage({ type: 'REVERT_DRAFT_PROJECT' }, '*');
                        }
                      }
                    }}
                  >
                    scratch.menuBar-Back to the draft project
                  </div>
                </div>
              )}
            </div>

            <div
              className="scratch-task-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                const win = iframeRef.current?.contentWindow;
                if (win?.getTurboMode) {
                  setIsTurboMode(win.getTurboMode());
                }
                setOpenEditMenu((v) => !v);
                setOpenFileMenu(false);
              }}
            >
              <span>Edit</span>
              {openEditMenu && (
                <div className="scratch-task-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="scratch-task-dropdown-item"
                    onClick={() => {
                      setOpenEditMenu(false);
                      const win = iframeRef.current?.contentWindow;
                      if (win?.restoreLastItem) {
                        win.restoreLastItem();
                      } else {
                        win?.postMessage({ type: 'RESTORE_LAST_ITEM' }, '*');
                      }
                    }}
                  >
                    Restore
                  </div>
                  <div
                    className="scratch-task-dropdown-item"
                    onClick={() => {
                      setOpenEditMenu(false);
                      const win = iframeRef.current?.contentWindow;
                      let next = !isTurboMode;
                      if (win?.toggleTurboMode) {
                        next = win.toggleTurboMode();
                      } else {
                        win?.postMessage({ type: 'TOGGLE_TURBO_MODE' }, '*');
                      }
                      setIsTurboMode(next);
                    }}
                  >
                    {isTurboMode ? 'Turn off Turbo Mode' : 'Turn on Turbo Mode'}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="scratch-task-toolbar-right">
            {saveError && <span role="status" className="scratch-task-save-status">{saveError}</span>}
            {!saveError && lastSaveTime && (
              <span className="scratch-task-save-status">Last save {lastSaveTime}</span>
            )}

            <button
              type="button"
              className="scratch-task-save-btn"
              onClick={handleSaveClick}
              disabled={isSaving}
              title="Save project changes"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            <button
              type="button"
              className="scratch-task-check-btn"
              onClick={handleCheck}
              disabled={isSaving}
              title="Check your project"
            >
              ✓ Check
            </button>
          </div>
        </div>

        <div className="scratch-task-iframe-wrapper">
          <iframe
            key={`scratch-${task?.id || task?.taskId || levelPosition}-${projectId}-${derivedProjectTitle}`}
            ref={iframeRef}
            src={editorUrl}
            className="scratch-task-iframe"
            title="Scratch Editor"
            allow="camera; microphone; clipboard-read; clipboard-write; fullscreen"
            allowFullScreen
          />
        </div>
      </div>

      {/* Right: Task Drawer (Overlays on top of the right side without shrinking Scratch) */}
      <div
        className={`scratch-task-drawer-pane ${isDrawerOpen ? 'open' : 'closed'}`}
        style={{
          width: `${drawerWidth}px`,
        }}
      >
        {/* Purple Divider / Toggle Handle attached to left edge of drawer */}
        <div
          className="scratch-task-divider"
          onPointerDown={handleDividerPointerDown}
          onClick={handleDividerClick}
          title={isDrawerOpen ? 'Thu gọn bảng bài tập' : 'Mở bảng bài tập'}
        >
          <div className="scratch-task-divider-handle" />
        </div>

        {/* Scrollable Drawer Body */}
        <div className="scratch-task-drawer-body">
          <div className="scratch-task-drawer-content">
            {/* Demo stage preview (if demoProjectId exists) */}
            {demoProjectId ? (
              <div className="scratch-task-demo-wrapper">
                <button
                  type="button"
                  className="scratch-task-demo-heading"
                  onClick={() => setIsPresentationOpen((open) => !open)}
                  aria-expanded={isPresentationOpen}
                >
                  <span>{presentationTitle}</span>
                  <span className={`scratch-task-demo-chevron ${isPresentationOpen ? 'open' : ''}`} aria-hidden="true">⌄</span>
                </button>
                {isPresentationOpen && (
                  <div className="scratch-task-demo-player-box">
                    <div className="scratch-task-demo-controls" role="group" aria-label="Scratch demo controls">
                      <button
                        type="button"
                        className="scratch-task-demo-control"
                        disabled={!demoReady}
                        title={demoReady ? 'Run demo (green flag)' : 'Loading demo'}
                        aria-label="Run demo"
                        onClick={() => controlDemo('SCRATCH_DEMO_RUN')}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="#28a745" d="M5 2h2v20H5zM7 3c3-2 6 2 9 0 1-.6 2-.8 3-.8v11c-4 0-7 3-12 1z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="scratch-task-demo-control"
                        disabled={!demoReady}
                        title={demoReady ? 'Stop demo' : 'Loading demo'}
                        aria-label="Stop demo"
                        onClick={() => controlDemo('SCRATCH_DEMO_STOP')}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="#f08080" d="M8 2h8l6 6v8l-6 6H8l-6-6V8z"/>
                        </svg>
                      </button>
                    </div>
                    <div className="scratch-task-demo-iframe-container">
                      <iframe
                        ref={demoIframeRef}
                        key={`demo-${demoProjectId}-${levelPosition}`}
                        src={`/scratch-gui/index.html?project=${encodeURIComponent(demoProjectId)}&isPlayerOnly=true&fitStage=true&bridge=2&level=${encodeURIComponent(levelPosition)}`}
                        className="scratch-task-demo-iframe"
                        title="Scratch Demo Preview"
                        allow="autoplay"
                      />
                    </div>
                    {!demoReady && (
                      <p className="scratch-task-demo-loading" role="status">Đang tải project demo...</p>
                    )}
                    {demoInstructionText && (
                      <p className="scratch-task-demo-instruction">{demoInstructionText}</p>
                    )}
                  </div>
                )}
              </div>
            ) : presentationMedia ? (
              /* Presentation hint card at top matching LMS */
              <div className="scratch-task-presentation-card">
                <div
                  className="scratch-task-presentation-header"
                  onClick={() => setIsPresentationOpen((v) => !v)}
                >
                  <span className="scratch-task-presentation-title">
                    {presentationTitle}
                  </span>
                  <span className={`scratch-task-presentation-arrow ${isPresentationOpen ? 'open' : ''}`}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: isPresentationOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </div>
                {isPresentationOpen && (
                  <div className="scratch-task-presentation-body">
                    {presentationMedia.url && (
                      <div
                        className="scratch-task-presentation-media-box"
                        onClick={() => setModalImage({ url: presentationMedia.url, title: presentationMedia.title || '' })}
                        title="Bấm để xem ảnh phóng to"
                      >
                        <img
                          src={presentationMedia.url}
                          alt={presentationMedia.title || ''}
                          className="scratch-task-presentation-img"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {presentationMedia.text && (
                      <p className="scratch-task-presentation-text">
                        {presentationMedia.text}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="scratch-task-presentation-card">
                <div className="scratch-task-presentation-header">
                  <span className="scratch-task-presentation-title">{taskTitle}</span>
                </div>
              </div>
            )}

            {task?.description && task.description !== presentationMedia?.text && (!demoProjectId || task.description.trim() !== demoInstructionText) && (
              <p className="scratch-task-description">
                {task.description}
              </p>
            )}

            {/* Divider between presentation card and checklist */}
            {presentationMedia && checklistItems.length > 0 && (
              <div className="scratch-task-drawer-divider" />
            )}

            {/* Requirements Accordion List for THIS task */}
            {checklistItems.length > 0 && (
              <div className="scratch-task-checklist-section">
                <div className="scratch-task-checklist-heading">
                  <span>{task?.checklist_heading || (task?.isAutoCheck === true ? 'TASKS WITH AUTOMATIC CHECK' : 'TASKS WILL BE CHECKED BY THE TEACHER')}</span>
                  <span className="scratch-task-info-icon" title="Checklist info">ⓘ</span>
                </div>

                <div className="scratch-task-req-accordion-list">
                  {checklistItems.map((item) => {
                    const isDone = !!completedItems[item.id];
                    const isOpen = !!openReqs[item.id];
                    const hasMedia = !!item.url;

                    return (
                      <div
                        key={item.id}
                        className={`scratch-task-req-card ${isOpen ? 'is-open' : ''} ${isDone ? 'is-done' : ''}`}
                      >
                        <div
                          className="scratch-task-req-header"
                          onClick={() => toggleReqAccordion(item.id)}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isDone}
                            className="scratch-task-checkbox"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCheckItem(item.id);
                            }}
                            title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                          >
                            {isDone && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>

                          <span className="scratch-task-req-title">
                            {item.title || item.text}
                          </span>

                          <span className={`scratch-task-req-arrow ${isOpen ? 'open' : ''}`}>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                transform: isOpen ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s ease',
                              }}
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </span>
                        </div>

                        {isOpen && (
                          <div className="scratch-task-req-body">
                            {hasMedia && (
                              <div
                                className="scratch-task-req-media-box"
                                onClick={() => setModalImage({ url: item.url, title: item.title || item.text })}
                                title="Bấm để xem ảnh/GIF khối lệnh phóng to"
                              >
                                <img
                                  src={item.url}
                                  alt={item.title || 'Khối lệnh Scratch'}
                                  className="scratch-task-req-media-thumb"
                                  loading="lazy"
                                />
                                <div className="scratch-task-req-media-overlay">
                                  <span>🔍 Phóng to</span>
                                </div>
                              </div>
                            )}

                            {item.text && item.text !== item.title && (
                              <p className="scratch-task-req-desc">
                                {item.text}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {bonusItems.length > 0 && (
              <section className="scratch-task-bonus" aria-label="Bonus tasks">
                <div className="scratch-task-checklist-heading">BONUS TASKS</div>
                {bonusItems.map((item, index) => (
                  <details key={`${task?.id || levelPosition}-bonus-${item.id || index}`} className="scratch-task-bonus-card" open>
                    <summary className="scratch-task-bonus-heading">
                      <span>{item.title}</span>
                      <span className="scratch-task-tip-chevron" aria-hidden="true">⌄</span>
                    </summary>
                    <div className="scratch-task-bonus-body">
                      {item.text && <p>{item.text}</p>}
                      {item.url && (
                        <button type="button" className="scratch-task-tip-image"
                          onClick={() => setModalImage({ url: item.url, title: item.title })}
                          aria-label={`Enlarge ${item.title || 'bonus hint'}`}>
                          <img src={item.url} alt={item.title || 'Bonus hint'} loading="lazy" />
                        </button>
                      )}
                    </div>
                  </details>
                ))}
              </section>
            )}
            {tipItems.length > 0 && (
              <section className="scratch-task-tips" aria-label="Tips">
                <div className="scratch-task-checklist-heading">TIPS</div>
                {tipItems.map((tip, index) => (
                  <details
                    key={`${task?.activity_id || task?.id || levelPosition}-${tip.id || index}`}
                    className="scratch-task-tip-card"
                    open
                  >
                    <summary className="scratch-task-tip-heading">
                      <span className="scratch-task-tip-icon" aria-hidden="true">!</span>
                      <span>{tip.title}</span>
                      <span className="scratch-task-tip-chevron" aria-hidden="true">⌄</span>
                    </summary>
                    <div className="scratch-task-tip-body">
                      {tip.description && <p>{tip.description}</p>}
                      {tip.url && (
                        <button
                          type="button"
                          className="scratch-task-tip-image"
                          onClick={() => setModalImage({ url: tip.url, title: tip.title })}
                          aria-label={`Enlarge ${tip.title || 'tip image'}`}
                        >
                          <img src={tip.url} alt={tip.title || 'Tip'} loading="lazy" />
                        </button>
                      )}
                    </div>
                  </details>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Popup Modal */}
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

            <h2>Does your project match?</h2>
            <p>
              Compare <strong>Your Project</strong> with the <strong>Sample Output</strong>.
              <br />
              <br />
              If they work the same, you’re ready to finish.
              <br />
              Not sure? Ask your teacher for help.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center', alignItems: 'center' }}>
              <button
                type="button"
                className="lms-badge-unlock__name"
                style={{ cursor: 'pointer', margin: 0, minHeight: '42px', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowConfirmModal(false)}
                disabled={isSaving}
              >
                Check Again
              </button>
              <button
                type="button"
                style={{ margin: 0, minWidth: '150px', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                onClick={confirmAndProceed}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Yes, It Matches!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for enlarged GIFs/images */}
      {modalImage && (
        <div
          className="scratch-task-modal-backdrop"
          onClick={() => setModalImage(null)}
        >
          <div
            className="scratch-task-lightbox-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="scratch-task-lightbox-header">
              <span className="scratch-task-lightbox-title">
                {modalImage.title || 'Hình minh họa khối lệnh Scratch'}
              </span>
              <button
                type="button"
                className="scratch-task-lightbox-close"
                onClick={() => setModalImage(null)}
                title="Đóng (Esc)"
              >
                ✕
              </button>
            </div>
            <div className="scratch-task-lightbox-body">
              <img
                src={modalImage.url}
                alt={modalImage.title || 'Hình minh họa khối lệnh'}
                className="scratch-task-lightbox-img"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
