import { useEffect, useState } from 'react';

export default function GoogleSlidesTask({
  task,
  pageInstance,
  onTaskCompleted,
}) {
  const taskId = task?.id || task?.taskId;

  const url =
    task?.googleSlides?.embedUrl ||
    pageInstance?.taskRenderers?.[taskId]?.googleSlides?.embedUrl ||
    null;

  const [canMarkViewed, setCanMarkViewed] = useState(false);
  const [isViewed, setIsViewed] = useState(false);

  useEffect(() => {
    setCanMarkViewed(false);
    setIsViewed(false);

    const timerId = window.setTimeout(() => {
      setCanMarkViewed(true);
    }, 3000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [taskId, url]);

  function markViewed() {
    if (!canMarkViewed) return;

    setIsViewed(true);

    onTaskCompleted?.({
      completionType: 'viewed',
      feedback: 'Slides reviewed.',
      metadata: {
        embedUrl: url,
        minimumViewSeconds: 3,
      },
    });
  }

  if (!url) {
    return (
      <div style={{ padding: '24px' }}>
        No Google Slides URL configured.
      </div>
    );
  }

  return (
    <section
      style={{
        width: '100%',
        minHeight: 'calc(100vh - 118px)',
        padding: '18px 24px 74px',
        background: '#eef2f6',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 'min(1240px, 100%)',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            borderRadius: 14,
            background: '#ffffff',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
          }}
        >
          <iframe
            src={url}
            title={task?.title || 'Google Slides activity'}
            width="100%"
            height="100%"
            allowFullScreen
            style={{
              border: 'none',
              display: 'block',
            }}
          />
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <span
            style={{
              color: '#64748b',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Review the slides, then mark this activity as viewed.
          </span>

          <button
            type="button"
            onClick={markViewed}
            disabled={!canMarkViewed}
            style={{
              minHeight: 42,
              border: 0,
              borderRadius: 12,
              padding: '0 18px',
              background: isViewed ? '#16a34a' : '#8943ef',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 850,
              cursor: canMarkViewed ? 'pointer' : 'not-allowed',
              opacity: canMarkViewed ? 1 : 0.55,
              boxShadow: canMarkViewed
                ? '0 8px 18px rgba(137, 67, 239, 0.22)'
                : 'none',
            }}
          >
            {isViewed
              ? 'Viewed ✓'
              : canMarkViewed
                ? 'Mark as viewed'
                : 'Reviewing…'}
          </button>
        </div>
      </div>
    </section>
  );
}
