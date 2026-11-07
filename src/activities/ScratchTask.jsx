import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ScratchTask.css';

export default function ScratchTask({
  task,
  state,
  onTaskCompleted,
  onNextTask,
  onPrevTask,
}) {
  const taskTitle = task?.title || 'Scratch Activity';

  // Online project ID from LMS config / Supabase vp2_activities
  const projectId =
    task?.starter_project_id ||
    task?.config?.project?.id ||
    task?.projectId ||
    '';

  // Flyout categories / command keys
  const categoriesQuery = Array.isArray(task?.command_keys) && task.command_keys.length > 0
    ? task.command_keys.join(',')
    : 'motion,looks,events,control';

  // Drawer open/collapse state (open by default)
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [drawerWidth, setDrawerWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);

  // Accordion open/collapse state inside drawer
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);

  const levelPosition = task?.level_position || task?.position || 1;

  const initialUrl = `/scratch-gui/index.html?${projectId ? `project=${encodeURIComponent(projectId)}&` : ''}categories=${encodeURIComponent(categoriesQuery)}&level=${encodeURIComponent(levelPosition)}`;
  const [editorUrl, setEditorUrl] = useState(initialUrl);

  useEffect(() => {
    const url = `/scratch-gui/index.html?${projectId ? `project=${encodeURIComponent(projectId)}&` : ''}categories=${encodeURIComponent(categoriesQuery)}&level=${encodeURIComponent(levelPosition)}`;
    setEditorUrl(url);
  }, [projectId, categoriesQuery, levelPosition]);
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  const lowerTitle = (taskTitle || '').toLowerCase();

  // Modal confirm state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract checklist criteria from task instructions or vp_activities
  const [completedItems, setCompletedItems] = useState({});

  // Checklist from vp_activities requirements or default fallback
  const checklistItems = React.useMemo(() => {
    if (Array.isArray(task?.requirements) && task.requirements.length > 0) {
      return task.requirements.map((item, idx) => ({
        id: item.id || `item_${idx + 1}`,
        text: item.text || item.title || `Requirement ${idx + 1}`,
      }));
    }
    if (lowerTitle.includes('potion')) {
      return [
        { id: 'item_1', text: 'The potion sends a message' },
        { id: 'item_2', text: 'The Sorceress receives the message' },
        { id: 'item_3', text: 'Sorceress transformations' },
        { id: 'item_4', text: 'Initial placement' },
      ];
    }
    if (lowerTitle.includes('knight')) {
      return [
        { id: 'k_1', text: 'Initial placement' },
        { id: 'k_2', text: 'The knight walks around one side of the tower' },
        { id: 'k_3', text: 'The knight turns' },
        { id: 'k_4', text: 'Loop' },
      ];
    }
    return [
      { id: 'c_1', text: 'Task requirements completed' },
      { id: 'c_2', text: 'Check with teacher' },
    ];
  }, [task?.requirements, lowerTitle]);

  const toggleCheckItem = (id) => {
    setCompletedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
      if (newWidth >= 300 && newWidth <= 680) {
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
    <div className={`scratch-task-container ${isResizing ? 'is-resizing' : ''}`} ref={containerRef}>
      {/* Left: Scratch Editor iframe (Full width background) */}
      <div className="scratch-task-editor-pane">
        <div className="scratch-task-toolbar">
          <div className="scratch-task-toolbar-left">
            <span className="scratch-task-badge">Scratch 3.0</span>
            <span className="scratch-task-title">{taskTitle}</span>
          </div>

          <div className="scratch-task-toolbar-right">
            <button
              type="button"
              className="scratch-task-btn-tool check"
              onClick={handleCheck}
              title="Kiểm tra kết quả bài làm"
              style={{
                background: '#10b981',
                borderColor: '#059669',
                color: '#ffffff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              ✓ Check
            </button>

            <button
              type="button"
              className="scratch-task-btn-tool"
              onClick={() => {
                if (iframeRef.current) {
                  iframeRef.current.src = editorUrl;
                }
              }}
              title="Tải lại trình soạn thảo Scratch"
            >
              🔄 Tải lại
            </button>
          </div>
        </div>

        <div className="scratch-task-iframe-wrapper">
          <iframe
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
          <div className="scratch-task-divider-handle">
            <span className="scratch-task-divider-arrow">
              {isDrawerOpen ? '›' : '‹'}
            </span>
          </div>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="scratch-task-drawer-body">
          {/* Drawer Header (Yellow) */}
          <div className="scratch-task-drawer-header">
            <div className="scratch-task-drawer-title-row">
              <h2 className="scratch-task-drawer-title">
                Tasks to check with the teacher
              </h2>
              <button
                type="button"
                className="scratch-task-drawer-close-btn"
                onClick={() => setIsDrawerOpen(false)}
                title="Thu gọn bảng bài tập"
              >
                ✕
              </button>
            </div>
          </div>

        {/* Drawer Body Content */}
        <div className="scratch-task-drawer-content">
          <div className="scratch-task-card">
            <div
              className="scratch-task-card-header"
              onClick={() => setIsAccordionOpen((v) => !v)}
            >
              <h3 className="scratch-task-card-title">
                {lowerTitle.includes('potion') ? 'Potion' : taskTitle}
              </h3>
              <span className={`scratch-task-card-arrow ${isAccordionOpen ? 'open' : ''}`}>
                ▼
              </span>
            </div>

            {isAccordionOpen && (
              <div className="scratch-task-card-body">
                {/* Scratch Demo Player / Media Preview */}
                {task?.media?.[0]?.url ? (
                  <div style={{ marginBottom: '16px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <img
                      src={task.media[0].url}
                      alt={task.media[0].title || 'Illustration'}
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </div>
                ) : (
                  <div className="scratch-task-preview-box">
                    <svg className="scratch-task-preview-cat" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-4h2v4zm0-6h-2v-2h2v2z" />
                    </svg>
                    <h4 className="scratch-task-preview-title">Scratch Project</h4>
                    <p className="scratch-task-preview-sub">Thực hiện các yêu cầu theo checklist bên dưới</p>
                  </div>
                )}

                <p className="scratch-task-description">
                  {task?.description || task?.media?.[0]?.text || ''}
                </p>

                {/* Checklist */}
                <div className="scratch-task-checklist">
                  <div className="scratch-task-checklist-heading">
                    TASKS WILL BE CHECKED BY THE TEACHER
                  </div>

                  {checklistItems.map((item) => {
                    const isDone = !!completedItems[item.id];
                    return (
                      <div
                        key={item.id}
                        className={`scratch-task-checklist-item ${isDone ? 'completed' : ''}`}
                        onClick={() => toggleCheckItem(item.id)}
                      >
                        <div className="scratch-task-checkbox">
                          {isDone && (
                            <svg viewBox="0 0 24 24" fill="none">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span className="scratch-task-item-label">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
    </div>
  );
}
