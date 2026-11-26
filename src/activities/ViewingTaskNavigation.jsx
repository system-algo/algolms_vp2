import './ImageViewingTask.css';

export default function ViewingTaskNavigation({ taskIndex, tasks, onPrevTask, onNextTask }) {
  const hasPrevious = Number.isInteger(taskIndex) && taskIndex > 0;
  const hasNext = Number.isInteger(taskIndex) && taskIndex < (tasks?.length || 0) - 1;

  return (
    <nav className="viewing-task-nav" aria-label="Task navigation">
      {hasPrevious && onPrevTask && (
        <button type="button" className="viewing-task-nav__previous" onClick={onPrevTask}
          aria-label="Previous task">‹</button>
      )}
      {hasNext && onNextTask && (
        <button type="button" className="viewing-task-nav__next" onClick={onNextTask}
          aria-label="Next task">›</button>
      )}
    </nav>
  );
}
