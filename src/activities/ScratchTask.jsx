import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ScratchTask.css';
import { DEMO_SOURCE_CODE } from './demoSourceCode';

export default function ScratchTask({
  task,
  state,
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

  // Online project ID from LMS config / Supabase vp2_activities
  const projectId =
    task?.starter_project_id ||
    task?.config?.project?.id ||
    task?.config?.project ||
    task?.projectId ||
    '';

  // Flyout categories / command keys: prioritize task definition, then state definition, then fall back
  const taskCommandKeys =
    (Array.isArray(task?.command_keys) && task.command_keys.length > 0 ? task.command_keys : null) ||
    (Array.isArray(task?.commandKeys) && task.commandKeys.length > 0 ? task.commandKeys : null) ||
    (Array.isArray(task?.states?.[0]?.command_keys) && task.states[0].command_keys.length > 0 ? task.states[0].command_keys : null) ||
    (Array.isArray(state?.command_keys) && state.command_keys.length > 0 ? state.command_keys : null);

  // Specific allowed command blocks (opcodes)
  const taskCommandBlocks =
    (Array.isArray(task?.command_blocks) && task.command_blocks.length > 0 ? task.command_blocks : null) ||
    (Array.isArray(task?.commandBlocks) && task.commandBlocks.length > 0 ? task.commandBlocks : null) ||
    (Array.isArray(task?.states?.[0]?.command_blocks) && task.states[0].command_blocks.length > 0 ? task.states[0].command_blocks : null) ||
    (Array.isArray(state?.command_blocks) && state.command_blocks.length > 0 ? state.command_blocks : null);

  const categoriesQuery = taskCommandKeys
    ? taskCommandKeys.join(',')
    : ['motion', 'looks', 'events', 'control'].join(',');

  const blocksQuery = taskCommandBlocks ? taskCommandBlocks.join(',') : '';

  const hasDrawerContent = (Array.isArray(task?.requirements) && task.requirements.length > 0) ||
                           (Array.isArray(task?.media) && task.media.length > 0);

  // Drawer open/collapse state
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

  // Toolbar File / Edit menu states
  const [openFileMenu, setOpenFileMenu] = useState(false);
  const [openEditMenu, setOpenEditMenu] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(() => {
    const d = new Date();
    return `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTurboMode, setIsTurboMode] = useState(false);

  const handleSaveClick = () => {
    setIsSaving(true);
    setTimeout(() => {
      const d = new Date();
      setLastSaveTime(
        `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      );
      setIsSaving(false);
    }, 400);
  };

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

  const projectTitle =
    task?.project_title ||
    task?.projectName ||
    '';

  const editorUrl = `/scratch-gui/index.html?${projectId ? `project=${encodeURIComponent(projectId)}&` : ''}${projectTitle ? `title=${encodeURIComponent(projectTitle)}&` : ''}categories=${encodeURIComponent(categoriesQuery)}${blocksQuery ? `&blocks=${encodeURIComponent(blocksQuery)}` : ''}&level=${encodeURIComponent(levelPosition)}`;
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

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
    setDemoViewMode('stage');
    setCopiedXml(false);
  }, [task?.activity_id, task?.id, task?.taskId, levelPosition, hasDrawerContent, task?.drawerOpen]);

  const lowerTitle = (taskTitle || '').toLowerCase();
  const isAutoCheck = levelPosition >= 9 && levelPosition <= 11;

  // Modal confirm state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Checklist from static manifest requirements or default fallback
  const checklistItems = React.useMemo(() => {
    if (Array.isArray(task?.requirements) && task.requirements.length > 0) {
      return task.requirements.map((item, idx) => ({
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

  useEffect(() => {
    if (checklistItems && checklistItems.length > 0) {
      setOpenReqs({ [checklistItems[0].id]: true });
    }
  }, [task?.id, task?.taskId, task?.activity_id, checklistItems]);

  const selectedReq = React.useMemo(() => {
    return checklistItems.find((it) => it.id === selectedReqId) || null;
  }, [checklistItems, selectedReqId]);

  const previewMediaUrl = selectedReq?.url || task?.media?.[0]?.url || checklistItems.find((it) => it.url)?.url || '';
  const previewMediaTitle = selectedReq?.title || task?.media?.[0]?.title || taskTitle;

  const demoProjectId =
    task?.demo_project_id ||
    task?.demoProjectId ||
    task?.config?.presentation?.projectId ||
    task?.config?.presentation?.project ||
    (levelPosition === 7 ? 'level_7_demo' : levelPosition === 8 ? 'level_8_demo' : '');

  const activeDemoCode = DEMO_SOURCE_CODE[demoProjectId] || DEMO_SOURCE_CODE[`level_${levelPosition}_demo`] || null;

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

  // Student confirms in popup: Save to activity_progress by email, run progress bar, go next
  const confirmAndProceed = async () => {
    setIsSubmitting(true);
    const studentEmail = localStorage.getItem('lms_student_email') || '';
    const supabaseUrl = localStorage.getItem('lms_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = localStorage.getItem('lms_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;
    const taskId = task?.activity_id || task?.id || task?.taskId || 'scratch-level';

    // 1. Lưu vào activity_progress của Supabase theo studentEmail
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
            activity_type: 'scratch',
            status: 'completed',
            is_completed: true,
            updated_at: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.warn('Lỗi lưu activity_progress:', err);
      }
    }

    // 2. Kích hoạt hoàn thành để TopNavigation cập nhật thanh progress bar
    if (typeof onTaskCompleted === 'function') {
      onTaskCompleted({
        taskId,
        completed: true,
        activityType: 'scratch-task',
      });
    }

    setShowConfirmModal(false);
    setIsSubmitting(false);

    // 3. Chuyển sang level / task tiếp theo
    if (typeof onNextTask === 'function') {
      onNextTask();
    }
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
            {onBackToCourses && (
              <button
                type="button"
                className="scratch-task-btn-tool back"
                onClick={onBackToCourses}
                title="Quay lại khóa học (Dashboard)"
              >
                ← Back to Course
              </button>
            )}

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
            <span className="scratch-task-save-status">
              Last save {lastSaveTime}
            </span>

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
              title="Kiểm tra kết quả bài làm"
            >
              ✓ Check
            </button>
          </div>
        </div>

        <div className="scratch-task-iframe-wrapper">
          <iframe
            key={`scratch-${task?.id || task?.taskId || levelPosition}-${projectId}-${categoriesQuery}-${projectTitle}`}
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
          {/* Clean Drawer Header (No yellow bar!) */}
          <div className="scratch-task-drawer-header-clean">
            <h2 className="scratch-task-drawer-task-title">{taskTitle}</h2>
            <button
              type="button"
              className="scratch-task-drawer-close-btn"
              onClick={() => setIsDrawerOpen(false)}
              title="Thu gọn bảng bài tập"
            >
              ✕
            </button>
          </div>

          <div className="scratch-task-drawer-content">
            {/* Demo stage preview (if demoProjectId exists) */}
            {demoProjectId ? (
              <div className="scratch-task-demo-wrapper">
                <div className="scratch-task-demo-player-box">
                  <div className="scratch-task-demo-iframe-container">
                    <iframe
                      key={`demo-${demoProjectId}-${levelPosition}`}
                      src={`/scratch-gui/index.html?project=${encodeURIComponent(demoProjectId)}&isPlayerOnly=true&level=${encodeURIComponent(levelPosition)}`}
                      className="scratch-task-demo-iframe"
                      title="Scratch Demo Preview"
                      allow="autoplay"
                    />
                  </div>
                  <div className="scratch-task-demo-hint">
                    <span className="scratch-task-demo-flag-icon">⚑</span> Bấm lá cờ xanh trong khung để xem hoạt động mẫu
                  </div>
                </div>
              </div>
            ) : previewMediaUrl ? (
              /* Standalone GIF / Media image preview */
              <div className="scratch-task-preview-media-standalone">
                <img
                  src={previewMediaUrl}
                  alt={previewMediaTitle}
                  className="scratch-task-preview-media-img"
                  onClick={() => setModalImage({ url: previewMediaUrl, title: previewMediaTitle })}
                  loading="lazy"
                />
                <div className="scratch-task-media-caption">
                  {previewMediaTitle} <span className="scratch-task-media-zoom-hint">(Nhấn để phóng to)</span>
                </div>
              </div>
            ) : null}

            {task?.description && (
              <p className="scratch-task-description">
                {task.description}
              </p>
            )}

            {/* Requirements Accordion List for THIS task */}
            {checklistItems.length > 0 && (
              <div className="scratch-task-checklist-section">
                <div className="scratch-task-checklist-heading">
                  {isAutoCheck ? 'TASKS WITH AUTOMATIC CHECK' : 'TASKS WILL BE CHECKED BY THE TEACHER'}
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
                          <div
                            className="scratch-task-checkbox"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCheckItem(item.id);
                            }}
                            title={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu đã hoàn thành'}
                          >
                            {isDone && (
                              <svg viewBox="0 0 24 24" fill="none">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>

                          <span className="scratch-task-req-title">
                            {item.title || item.text}
                          </span>

                          <span className={`scratch-task-req-arrow ${isOpen ? 'open' : ''}`}>
                            ▼
                          </span>
                        </div>

                        {isOpen && (
                          <div className="scratch-task-req-body">
                            {item.text && item.text !== item.title && (
                              <p className="scratch-task-req-desc">
                                {item.text}
                              </p>
                            )}

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
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Popup Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '32px 28px 24px',
            maxWidth: '440px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            transform: 'scale(1)',
            animation: 'modalPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#e0e7ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '32px',
            }}>
              🎯
            </div>

            <h3 style={{
              margin: '0 0 10px',
              fontSize: '20px',
              fontWeight: 700,
              color: '#1e293b',
            }}>
              Kiểm tra kết quả bài làm
            </h3>

            <p style={{
              margin: '0 0 24px',
              fontSize: '15px',
              lineHeight: 1.5,
              color: '#64748b',
            }}>
              Hãy đối chiếu với sản phẩm mẫu: Bạn đã hoàn thành các bước và dự án đã hoạt động đúng yêu cầu chưa?
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
            }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
              >
                Kiểm tra lại
              </button>

              <button
                type="button"
                onClick={confirmAndProceed}
                disabled={isSubmitting}
                style={{
                  flex: 1.2,
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {isSubmitting ? 'Đang lưu...' : 'Đã giống mẫu 🚀'}
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
