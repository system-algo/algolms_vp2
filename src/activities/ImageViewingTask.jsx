import { useEffect, useRef, useState } from 'react';
import './ImageViewingTask.css';

const VIEWING_DURATION_MS = 5000;

export default function ImageViewingTask({
  taskId, title, description = [], images, completedTaskIds = [], onTaskCompleted,
}) {
  const [viewed, setViewed] = useState(images.length === 1);
  const [loaded, setLoaded] = useState(() => new Set());
  const [imageError, setImageError] = useState(false);
  const endOfImages = useRef(null);
  const complete = useRef(onTaskCompleted);
  const done = completedTaskIds.includes(taskId);
  const ready = images.every(({ src }) => loaded.has(src));
  const counting = viewed && ready && !done;

  useEffect(() => {
    complete.current = onTaskCompleted;
  }, [onTaskCompleted]);

  useEffect(() => {
    if (viewed || done || !ready) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setViewed(true);
    });
    observer.observe(endOfImages.current);
    return () => observer.disconnect();
  }, [viewed, done, ready]);

  useEffect(() => {
    if (!counting) return;
    const timer = window.setTimeout(() => {
      complete.current?.({ taskId, completionType: 'viewed' });
    }, VIEWING_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [counting, taskId]);

  const status = done ? 'Done' : imageError ? 'An image could not load.' :
    viewed ? 'Viewed' : 'Scroll down to view all images.';

  return (
    <article className="image-viewing-task">
      <header className="image-viewing-task__status">
        <span role="status">{status}</span>
        <div className="image-viewing-task__track" aria-hidden="true">
          <div className={done ? 'is-done' : counting ? 'is-counting' : ''}
            style={{ animationDuration: VIEWING_DURATION_MS + 'ms' }} />
        </div>
      </header>
      {title && <h1>{title}</h1>}
      {description.map((line, index) => <p key={index}>{line}</p>)}
      {images.map(({ src, alt }, index) => (
        <img key={src} src={src} alt={alt || 'Illustration ' + (index + 1)}
          onLoad={() => setLoaded((current) => new Set(current).add(src))}
          onError={() => setImageError(true)} />
      ))}
      <div ref={endOfImages} className="image-viewing-task__end" aria-hidden="true" />
    </article>
  );
}
