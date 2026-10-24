import React, { useMemo, useState } from 'react';
import './FeedbackRatingTask.css';

const DEFAULT_CONFIG = {
  eyebrow: 'Quick check-in',
  question: 'How was this lesson for you?',
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
  } = props;

  const config = useMemo(() => {
    const customConfig = task?.feedbackRatingTask || task?.feedbackTask || {};

    return {
      ...DEFAULT_CONFIG,
      ...customConfig,
      options: customConfig.options || DEFAULT_CONFIG.options,
      robotImage: customConfig.robotImage || DEFAULT_CONFIG.robotImage,
    };
  }, [task]);

  const [selectedId, setSelectedId] = useState(null);
  const selectedOption = config.options.find((option) => option.id === selectedId);

  const moveNext = () => {
    onTaskCompleted?.({
      completionType: 'feedback-submitted',
      feedback: 'Feedback submitted.',
      metadata: {
        ratingId: selectedOption?.id || selectedId,
        ratingType: selectedOption?.type || '',
        ratingLabel: selectedOption?.label || '',
      },
    });

    const callbacks = [
      onNext,
      onComplete,
      onNextTask,
      nextTask,
      goNext,
      goToNext,
      handleNext,
      handleNextTask,
    ];

    const callback = callbacks.find((candidate) => typeof candidate === 'function');

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

    window.setTimeout(clickNextTaskInHeader, 0);
  };

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
                <span className="feedback-result-note__icon" aria-hidden="true">
                  ♥
                </span>
                <span>Your feedback helps us build better lessons.</span>
              </div>

              <button className="feedback-next-button" type="button" onClick={moveNext}>
                <span>{config.nextLabel || 'Continue'}</span>
                <span aria-hidden="true">→</span>
              </button>
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
            <h1>{config.question || 'How was this task for you?'}</h1>
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
                aria-checked="false"
                aria-label={`${option.label}. ${option.sublabel || ''}`}
                style={{
                  '--feedback-option-accent': option.accent,
                  '--feedback-option-soft': option.softBackground,
                }}
                onClick={() => setSelectedId(option.id)}
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
