import React, { useEffect, useMemo, useState } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { saveTaskCompletionToSupabase } from '../lib/supabaseProgress.js';
import './FeedbackRatingTask.css';

function getBackendUrl() {
  return String(
    sessionStorage.getItem('lms_backend_url') ||
    localStorage.getItem('lms_backend_url') ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'https://algo-lms-backend.onrender.com'
  ).replace(/\/+$/, '');
}

function getSessionId() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('sessionId') || params.get('session');
  if (query) return query;
  const studentEmail =
    sessionStorage.getItem('lms_student_email') ||
    localStorage.getItem('lms_student_email');
  if (studentEmail) return `user:${studentEmail.trim().toLowerCase()}`;
  return (
    sessionStorage.getItem('lms-session-id') ||
    localStorage.getItem('lms-session-id') ||
    'session-feedback'
  );
}

function getUserId() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('userId') ||
    params.get('studentEmail') ||
    sessionStorage.getItem('lms_student_email') ||
    localStorage.getItem('lms_student_email') ||
    'student@algo.edu.vn'
  );
}

const DEFAULT_CONFIG = {
  eyebrow: 'Quick check-in',
  question: 'Did you like the lesson?',
  helperText: 'Your feedback helps us make lessons better.',
  nextLabel: 'Continue',
  robotImage: '/assets/feedback/robot-main.png',
  options: [
    {
      id: 'difficult',
      type: 'sad',
      label: 'Difficult',
      sublabel: 'It was hard',
      accent: '#ff6b81',
      softBackground: '#fff2f5',
      image: '/assets/feedback/robot-difficult.png',
      title: 'Thanks for telling us!',
      message: 'We’ll use your feedback to make this lesson clearer.',
    },
    {
      id: 'okay',
      type: 'neutral',
      label: 'Okay',
      sublabel: 'It was alright',
      accent: '#f5b700',
      softBackground: '#fff9e9',
      image: '/assets/feedback/robot-okay.png',
      title: 'Thanks for your feedback!',
      message: 'We’ll keep improving the learning experience.',
    },
    {
      id: 'easy',
      type: 'happy',
      label: 'Easy!',
      sublabel: 'It was great',
      accent: '#41c968',
      softBackground: '#effcf3',
      image: '/assets/feedback/robot-easy.png',
      title: 'Awesome!',
      message: 'We’re glad you enjoyed this task.',
    },
  ],
};

function clickNextTaskInHeader() {
  const stepButtons = Array.from(document.querySelectorAll('.lms-topbar__step'));
  if (stepButtons.length > 0) {
    const activeIdx = stepButtons.findIndex((btn) => btn.classList.contains('is-active'));
    if (activeIdx >= 0 && activeIdx < stepButtons.length - 1) {
      stepButtons[activeIdx + 1].click();
      return true;
    }
  }

  const buttons = Array.from(
    document.querySelectorAll(
      'button, a, [role="button"], [data-task-index], [data-task-id]'
    )
  );

  const taskButtons = buttons.filter((element) => {
    const text = String(element.textContent || '').trim();
    const aria = String(element.getAttribute('aria-label') || '').toLowerCase();
    const className = String(element.className || '').toLowerCase();

    return (
      /^\d+$/.test(text) ||
      text === '★' ||
      text === '⭐' ||
      aria.includes('task') ||
      aria.includes('activity') ||
      className.includes('task') ||
      className.includes('activity')
    );
  });

  if (!taskButtons.length) return false;

  const activeIndex = taskButtons.findIndex((element) => {
    const aria = String(element.getAttribute('aria-label') || '').toLowerCase();
    const className = String(element.className || '').toLowerCase();

    return (
      aria.includes('current') ||
      aria.includes('active') ||
      element.getAttribute('aria-current') === 'true' ||
      className.includes('active') ||
      className.includes('current') ||
      className.includes('selected')
    );
  });

  const nextButton = taskButtons[activeIndex >= 0 ? activeIndex + 1 : -1];

  if (nextButton && typeof nextButton.click === 'function') {
    nextButton.click();
    return true;
  }

  return false;
}

export default function FeedbackRatingTask(props) {
  const {
    task,
    onNext,
    onComplete,
    onTaskCompleted,
    onNextTask,
    nextTask,
    goNext,
    goToNext,
    handleNext,
    handleNextTask,
    onSelectTask,
    taskIndex,
    tasks,
    courseId = 'VP2',
    lessonId = '',
    pageId = '',
  } = props;

  const currentTaskId = String(task?.id || task?.taskId || 'VP2_M1L2_4_1').trim();

  const config = useMemo(() => {
    const customConfig = task?.feedbackRatingTask || task?.feedbackTask || {};
    return {
      ...DEFAULT_CONFIG,
      ...customConfig,
      question: customConfig.question || task?.title || DEFAULT_CONFIG.question,
      options: customConfig.options || DEFAULT_CONFIG.options,
      robotImage: customConfig.robotImage || DEFAULT_CONFIG.robotImage,
    };
  }, [task]);

  const [selectedId, setSelectedId] = useState(() => {
    try {
      return localStorage.getItem(`feedback_rating_${currentTaskId}`) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`feedback_rating_${currentTaskId}`);
      if (saved) setSelectedId(saved);
    } catch {}
  }, [currentTaskId]);

  // Standard robot card style (like ptsy1 / previous courses) is enabled by default
  const isRobotMode = task?.renderMode !== 'classic-emoji' && task?.style !== 'classic-emoji';

  const handleSelectOption = async (option) => {
    setSelectedId(option.id);

    try {
      localStorage.setItem(`completed_${currentTaskId}`, 'true');
      localStorage.setItem(`feedback_rating_${currentTaskId}`, option.id);
    } catch {}

    playLmsSound(LMS_SOUND_TYPES.COMPLETE_ACTIVITY);

    const targetCourse = courseId || 'VP2';
    const targetLesson = lessonId || 'M1-Visual-Programming-Basics';
    const targetPage = pageId || 'VP2_M1L3_4';

    const payload = {
      sessionId: getSessionId(),
      userId: getUserId(),
      courseId: targetCourse,
      lessonId: targetLesson,
      pageId: targetPage,
      taskId: currentTaskId,
      activityType: 'feedback-rating-task',
      answer: {
        rating: option.id,
        ratingType: option.type,
        ratingLabel: option.label,
      },
      isCorrect: true,
      score: 100,
      maxScore: 100,
    };

    try {
      const accessToken =
        sessionStorage.getItem('lms_access_token') ||
        localStorage.getItem('lms_access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      fetch(`${getBackendUrl()}/api/activity-attempts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).catch((e) => console.warn('[FeedbackRatingTask] backend attempt error:', e));
    } catch (err) {
      console.warn('[FeedbackRatingTask] attempt send error:', err);
    }

    try {
      await saveTaskCompletionToSupabase({
        courseId: targetCourse,
        lessonId: targetLesson,
        pageId: targetPage,
        taskId: currentTaskId,
        activityType: 'feedback-rating-task',
      });
    } catch (err) {
      console.warn('[FeedbackRatingTask] Supabase save error:', err);
    }

    onTaskCompleted?.({
      taskId: currentTaskId,
      activityType: 'feedback-rating-task',
      isCorrect: true,
      completed: true,
      score: 100,
      maxScore: 100,
      metadata: {
        ratingId: option.id,
        ratingType: option.type,
        ratingLabel: option.label,
      },
    });
  };

  const handleResetRating = () => {
    try {
      localStorage.removeItem(`feedback_rating_${currentTaskId}`);
    } catch {}
    setSelectedId(null);
  };

  const handleSelectEmoji = async (option) => {
    setSelectedId(option.id);

    try {
      localStorage.setItem(`completed_${currentTaskId}`, 'true');
      localStorage.setItem(`feedback_rating_${currentTaskId}`, option.id);
    } catch {}

    playLmsSound(LMS_SOUND_TYPES.COMPLETE_ACTIVITY);

    const targetCourse = courseId || 'VP2';
    const targetLesson = lessonId || 'M1-Visual-Programming-Basics';
    const targetPage = pageId || 'VP2_M1L3_4';

    const payload = {
      sessionId: getSessionId(),
      userId: getUserId(),
      courseId: targetCourse,
      lessonId: targetLesson,
      pageId: targetPage,
      taskId: currentTaskId,
      activityType: 'feedback-rating-task',
      answer: {
        rating: option.id,
        ratingType: option.type,
        ratingLabel: option.label,
      },
      isCorrect: true,
      score: 100,
      maxScore: 100,
    };

    try {
      const accessToken =
        sessionStorage.getItem('lms_access_token') ||
        localStorage.getItem('lms_access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      fetch(`${getBackendUrl()}/api/activity-attempts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).catch((e) => console.warn('[FeedbackRatingTask] backend attempt error:', e));
    } catch (err) {
      console.warn('[FeedbackRatingTask] attempt send error:', err);
    }

    try {
      await saveTaskCompletionToSupabase({
        courseId: targetCourse,
        lessonId: targetLesson,
        pageId: targetPage,
        taskId: currentTaskId,
        activityType: 'feedback-rating-task',
      });
    } catch (err) {
      console.warn('[FeedbackRatingTask] Supabase save error:', err);
    }

    onTaskCompleted?.({
      taskId: currentTaskId,
      activityType: 'feedback-rating-task',
      isCorrect: true,
      completed: true,
      score: 100,
      maxScore: 100,
      metadata: {
        ratingId: option.id,
        ratingType: option.type,
        ratingLabel: option.label,
      },
    });

    window.setTimeout(() => {
      moveNext();
    }, 500);
  };

  const moveNext = () => {
    const selectedOption = config.options.find((option) => option.id === selectedId);
    onTaskCompleted?.({
      taskId: currentTaskId,
      activityType: 'feedback-rating-task',
      isCorrect: true,
      completed: true,
      score: 100,
      maxScore: 100,
      metadata: {
        ratingId: selectedOption?.id || selectedId,
        ratingType: selectedOption?.type || '',
        ratingLabel: selectedOption?.label || '',
      },
    });

    if (typeof onNextTask === 'function') {
      onNextTask();
      return;
    }

    if (
      typeof onSelectTask === 'function' &&
      typeof taskIndex === 'number' &&
      Array.isArray(tasks) &&
      taskIndex < tasks.length - 1
    ) {
      onSelectTask(taskIndex + 1);
      return;
    }

    const callbacks = [
      onNext,
      onComplete,
      nextTask,
      goNext,
      goToNext,
      handleNext,
      handleNextTask,
    ];
    const callback = callbacks.find((cb) => typeof cb === 'function');
    if (callback) {
      callback();
      return;
    }

    const detail = {
      taskKey: task?.taskKey || task?.id || task?.taskId,
    };
    window.dispatchEvent(new CustomEvent('activity-next', { detail }));
    window.dispatchEvent(new CustomEvent('go-next-task', { detail }));
    window.dispatchEvent(new CustomEvent('next-task', { detail }));

    clickNextTaskInHeader();
  };

  // Robot card mode (ptsy1 style)
  if (isRobotMode) {
    const selectedOption = config.options.find((option) => option.id === selectedId);

    if (selectedOption) {
      return (
        <main
          className="feedback-rating-page feedback-rating-page--result"
          style={{
            '--feedback-result-accent': selectedOption.accent,
            '--feedback-result-soft': selectedOption.softBackground,
          }}
        >
          <section className="feedback-rating-shell">
            <div className="feedback-result-card">
              <div className="feedback-result-copy">
                <div className="feedback-result-chip">
                  <span className="feedback-result-chip__dot" aria-hidden="true" />
                  Feedback received
                </div>

                <h1>{selectedOption.title || 'Thanks!'}</h1>
                <p>{selectedOption.message}</p>

                <div className="feedback-result-note">
                  <span className="feedback-result-note__icon" aria-hidden="true">♥</span>
                  <span>Your feedback helps us build better lessons.</span>
                </div>

                <button className="feedback-next-button" type="button" onClick={moveNext}>
                  <span>{config.nextLabel || 'Continue'}</span>
                  <span aria-hidden="true">→</span>
                </button>

                <div style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={handleResetRating}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8b39e6',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    Change rating
                  </button>
                </div>
              </div>

              <div className="feedback-result-visual" aria-hidden="true">
                <div className="feedback-result-halo" />
                <img
                  className="feedback-result-robot"
                  src={selectedOption.image || config.robotImage}
                  alt=""
                />
                <span className="feedback-confetti feedback-confetti--1">✦</span>
                <span className="feedback-confetti feedback-confetti--2">★</span>
                <span className="feedback-confetti feedback-confetti--3">◆</span>
                <span className="feedback-confetti feedback-confetti--4">✦</span>
              </div>
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="feedback-rating-page feedback-rating-page--question">
        <section className="feedback-rating-shell">
          <div className="feedback-question-card">
            <div className="feedback-intro-badge">
              <img src={config.robotImage} alt="" />
              <span>
                <strong>{config.eyebrow || 'Quick check-in'}</strong>
                <small>Your opinion matters</small>
              </span>
            </div>

            <header className="feedback-question-copy">
              <h1>{config.question || 'Did you like the task?'}</h1>
              <p>{config.helperText || 'Your feedback helps us make lessons better.'}</p>
            </header>

            <div
              className="feedback-options"
              role="radiogroup"
              aria-label={config.question || 'Task feedback'}
            >
              {config.options.map((option) => (
                <button
                  key={option.id}
                  className="feedback-option-card"
                  type="button"
                  role="radio"
                  aria-checked={selectedId === option.id}
                  aria-label={`${option.label}. ${option.sublabel || ''}`}
                  style={{
                    '--feedback-option-accent': option.accent,
                    '--feedback-option-soft': option.softBackground,
                  }}
                  onClick={() => handleSelectOption(option)}
                >
                  <div className="feedback-option-image-wrap">
                    <span className="feedback-option-dot feedback-option-dot--1" />
                    <span className="feedback-option-dot feedback-option-dot--2" />
                    <span className="feedback-option-dot feedback-option-dot--3" />
                    <span className="feedback-option-dot feedback-option-dot--4" />
                    <img src={option.image} alt="" className="feedback-rating-robot" />
                  </div>

                  <strong>{option.label}</strong>
                  <span>{option.sublabel}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Official LMS Standard 3-Emoji Rating Layout
  return (
    <main className="lms-feedback-page" role="main">
      <section className="lms-feedback-content">
        <h1 className="lms-feedback-title">
          {config.question || 'Did you like the lesson?'}
        </h1>

        <div
          className="lms-feedback-emojis"
          role="radiogroup"
          aria-label={config.question || 'Did you like the lesson?'}
        >
          {/* 1. Sad face 🙁 */}
          <button
            type="button"
            className={`lms-feedback-emoji-btn ${selectedId === 'difficult' || selectedId === 'sad' ? 'is-selected' : ''}`}
            role="radio"
            aria-checked={selectedId === 'difficult' || selectedId === 'sad'}
            aria-label="Sad / Difficult"
            onClick={() => handleSelectEmoji(config.options[0])}
          >
            <svg viewBox="0 0 121 121" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60.5" cy="60.5" r="59" fill="#ffffff" />
              <circle cx="37.5" cy="45" r="7.5" fill="#0f1c2c" />
              <circle cx="83.5" cy="45" r="7.5" fill="#0f1c2c" />
              <path d="M 37.5 86 C 45 68, 76 68, 83.5 86" stroke="#0f1c2c" strokeWidth="7" strokeLinecap="round" fill="none" />
            </svg>
          </button>

          {/* 2. Neutral face 😐 */}
          <button
            type="button"
            className={`lms-feedback-emoji-btn ${selectedId === 'okay' || selectedId === 'neutral' ? 'is-selected' : ''}`}
            role="radio"
            aria-checked={selectedId === 'okay' || selectedId === 'neutral'}
            aria-label="Neutral / Okay"
            onClick={() => handleSelectEmoji(config.options[1])}
          >
            <svg viewBox="0 0 121 121" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60.5" cy="60.5" r="59" fill="#ffffff" />
              <circle cx="37.5" cy="45" r="7.5" fill="#0f1c2c" />
              <circle cx="83.5" cy="45" r="7.5" fill="#0f1c2c" />
              <path d="M 37.5 75 L 83.5 75" stroke="#0f1c2c" strokeWidth="7" strokeLinecap="round" />
            </svg>
          </button>

          {/* 3. Happy face 🙂 */}
          <button
            type="button"
            className={`lms-feedback-emoji-btn ${selectedId === 'easy' || selectedId === 'happy' ? 'is-selected' : ''}`}
            role="radio"
            aria-checked={selectedId === 'easy' || selectedId === 'happy'}
            aria-label="Happy / Easy"
            onClick={() => handleSelectEmoji(config.options[2])}
          >
            <svg viewBox="0 0 121 121" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60.5" cy="60.5" r="59" fill="#ffffff" />
              <circle cx="37.5" cy="45" r="7.5" fill="#0f1c2c" />
              <circle cx="83.5" cy="45" r="7.5" fill="#0f1c2c" />
              <path d="M 37.5 68 C 45 86, 76 86, 83.5 68" stroke="#0f1c2c" strokeWidth="7" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>
      </section>
    </main>
  );
}
