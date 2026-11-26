import { useEffect, useRef, useState } from 'react';
import './ImageViewingTask.css';
import ViewingTaskNavigation from './ViewingTaskNavigation.jsx';

const VIEWING_DURATION_MS = 5000;

export default function ImageViewingTask({
  taskId, title, description = [], images, completedTaskIds = [], onTaskCompleted, ...navigation
}) {
  const scroller = useRef(null);
  const complete = useRef(onTaskCompleted);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(new Set());
  const [loaded, setLoaded] = useState(new Set());
  const [failed, setFailed] = useState(false);
  const done = completedTaskIds.includes(taskId);
  const viewed = done || images.every(({ src }) => loaded.has(src) && visible.has(src));

  useEffect(() => {
    complete.current = onTaskCompleted;
  }, [onTaskCompleted]);

  useEffect(() => {
    const root = scroller.current;
    const observer = new IntersectionObserver((entries) => {
      const shown = entries.find((entry) => entry.isIntersecting);
      if (!shown) return;
      setActiveIndex(Number(shown.target.dataset.index));
      setVisible((previous) => new Set([
        ...previous,
        ...entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target.dataset.src),
      ]));
    }, { root, threshold: 0.55 });

    for (const slide of root.children) observer.observe(slide);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (done || !viewed) return;
    const timer = window.setTimeout(() => {
      complete.current?.({ taskId, activityType: 'image-viewing', completionType: 'viewed' });
    }, VIEWING_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [done, viewed, taskId]);

  const viewedCount = images.filter(({ src }) => loaded.has(src) && visible.has(src)).length;

  return (
    <article className="image-viewing-task" aria-label={title || 'Comic'}>
      <ViewingTaskNavigation {...navigation} />
      {description.map((line, index) => <p key={index}>{line}</p>)}
      <div className="image-viewing-task__panel">
        <div ref={scroller} className="image-viewing-task__scroll" tabIndex={0} aria-label="Comic pages">
          {images.map(({ src, alt }, index) => (
            <div className="image-viewing-task__slide" data-index={index} data-src={src} key={src}>
              <img src={src} alt={alt || 'Illustration ' + (index + 1)} draggable={false}
                onLoad={() => setLoaded((previous) => new Set(previous).add(src))}
                onError={() => setFailed(true)} />
            </div>
          ))}
        </div>
        <div className="image-viewing-task__status">
          <span>{activeIndex + 1} / {images.length}</span>
          {images.length > 1 && (
            <div className="image-viewing-task__pages">
              {images.map(({ src }, index) => (
                <button key={src} type="button" aria-label={'Show page ' + (index + 1)}
                  aria-current={index === activeIndex ? 'page' : undefined}
                  onClick={() => {
                    const root = scroller.current;
                    root.scrollTo({ top: root.children[index].offsetTop, behavior: 'smooth' });
                  }} />
              ))}
            </div>
          )}
          <span role="status" className={viewed ? 'is-viewed' : ''}>
            {viewed ? 'Viewed ✓' : failed ? 'An image could not load.' : viewedCount + '/' + images.length + ' viewed'}
          </span>
        </div>
      </div>
    </article>
  );
}
