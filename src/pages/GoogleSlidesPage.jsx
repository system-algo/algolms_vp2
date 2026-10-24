import { useState, useEffect, useRef } from 'react';
import TopNavigation from '../components/TopNavigation.jsx';
import LmsActivityFrame from '../components/LmsActivityFrame.jsx';
import { fetchPageProgress, isCompletedProgressRow, submitActivityCompletion } from '../lib/activityCompletion.js';

export default function GoogleSlidesPage({
  activity,
  courseId,
  onBack,
  onBackToCourses,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isViewed, setIsViewed] = useState(false);
  const [canMarkViewed, setCanMarkViewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [progressJustIncreased, setProgressJustIncreased] = useState(false);
  const [progressCelebrationKey, setProgressCelebrationKey] = useState(0);
  const [justCompletedTaskId, setJustCompletedTaskId] = useState('');

  const embedUrl = activity?.embedUrl || '';
  const title = activity?.title || activity?.id || 'Slides Presentation';

  const completedTasksStorageKey = [
    'lms-completed-tasks',
    String(courseId || 'VP'),
    String(activity?.moduleId || ''),
    String(activity?.id || ''),
  ].join(':');

  useEffect(() => {
    if (!courseId || !activity?.id) return;

    // Load from local storage first for offline / instant load
    try {
      const localCompleted = JSON.parse(localStorage.getItem(completedTasksStorageKey) || '[]');
      if (localCompleted.includes(activity.id)) {
        setIsViewed(true);
        setCanMarkViewed(true);
      }
    } catch (e) {}

    let active = true;
    async function loadInitialProgress() {
      try {
        const progressList = await fetchPageProgress({
          courseId,
          lessonId: activity.moduleId || '',
          pageId: activity.id,
        });

        if (!active) return;

        const isMainCompleted = progressList.some(
          (row) => row.task_id === activity.id && isCompletedProgressRow(row)
        );
        if (isMainCompleted) {
          setIsViewed(true);
          setCanMarkViewed(true);
          localStorage.setItem(completedTasksStorageKey, JSON.stringify([activity.id]));
        }
      } catch (err) {
        console.warn('Failed to load initial slides progress:', err);
      }
    }

    loadInitialProgress();
    return () => {
      active = false;
    };
  }, [courseId, activity?.id, activity?.moduleId, completedTasksStorageKey]);

  useEffect(() => {
    if (!embedUrl) {
      setError('No slides URL configured for this activity.');
      setLoading(false);
      return;
    }

    if (isViewed) {
      setCanMarkViewed(true);
      return;
    }

    // Standard timer to allow marking as viewed
    const timerId = setTimeout(() => {
      setCanMarkViewed(true);
    }, 5000);

    return () => {
      clearTimeout(timerId);
    };
  }, [activity?.id, embedUrl, isViewed]);

  async function handleMarkViewed() {
    if (!canMarkViewed || submitting || isViewed) return;

    // Immediately mark as viewed on frontend for instant feedback
    setIsViewed(true);
    setProgressJustIncreased(true);
    setProgressCelebrationKey(Date.now());
    setJustCompletedTaskId(activity.id);
    try {
      localStorage.setItem(completedTasksStorageKey, JSON.stringify([activity.id]));
    } catch (e) {}

    setSubmitting(true);
    try {
      await submitActivityCompletion({
        courseId,
        lessonId: activity.moduleId || '',
        pageId: activity.id,
        taskId: activity.id,
        activityType: 'slides',
        isCorrect: true,
        score: 1,
        maxScore: 1,
        metadata: {
          completionType: 'viewed',
          embedUrl,
          minimumViewSeconds: 5,
        },
      });
    } catch (err) {
      console.error('Failed to submit slide completion:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackToCourse() {
    if (typeof onBackToCourses === 'function') {
      onBackToCourses();
      return;
    }
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  return (
    <div className="app-shell">
      <TopNavigation
        title={title}
        courseId={courseId || 'VP'}
        courseTitle={courseId || 'VP'}
        moduleId={activity?.moduleId || ''}
        lessonTitle={activity?.moduleId || ''}
        pageId={activity?.id || ''}
        pageTitle={title}
        tasks={[{ id: activity?.id || '1', title: title }]}
        currentTaskIndex={0}
        completedTaskIds={isViewed ? [activity?.id] : []}
        justCompletedTaskId={justCompletedTaskId}
        progressJustIncreased={progressJustIncreased}
        progressCelebrationKey={progressCelebrationKey}
        onBackToCatalog={onBack}
        onBackToCourses={handleBackToCourse}
      />

      <LmsActivityFrame
        title={title}
        onBack={onBack}
        onReset={() => {
          window.location.reload();
        }}
        onCheck={isViewed ? null : handleMarkViewed}
        isCheckDisabled={!canMarkViewed || submitting || isViewed}
        isCheckLoading={submitting}
      >
        {error && (
          <section className="kids-hero-section" style={{ marginTop: 20 }}>
            <h1 style={{ marginBottom: 16 }}>Oops! Cannot load presentation 😢</h1>
            <p style={{ fontSize: 16, lineHeight: 1.5 }}>{error}</p>
            <button
              type="button"
              className="kids-back-button"
              style={{ position: 'relative', top: 'auto', left: 'auto', marginTop: 20 }}
              onClick={onBack}
            >
              ← Go back
            </button>
          </section>
        )}

        {!error && (
          <div style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                overflow: 'hidden',
                borderRadius: '16px',
                background: '#ffffff',
                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                position: 'relative'
              }}
            >
              <iframe
                src={embedUrl}
                title={title}
                width="100%"
                height="100%"
                allowFullScreen
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError('Failed to display slides presentation.');
                }}
                style={{
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </div>
        )}
      </LmsActivityFrame>
    </div>
  );
}
