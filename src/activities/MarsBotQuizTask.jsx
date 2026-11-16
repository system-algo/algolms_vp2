import React, { useState, useEffect } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import './MarsBotQuizTask.css';

const QUIZ_QUESTIONS = {
  1: {
    prompt: 'Which script will help the MarsBot get to the x?',
    gridImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/grid_question_1.png',
    options: [
      {
        id: 1,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_1.png',
        label: 'Script Option 1'
      },
      {
        id: 2,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_2.png',
        label: 'Script Option 2'
      },
      {
        id: 3,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_3.png',
        label: 'Script Option 3'
      },
      {
        id: 4,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_4.png',
        label: 'Script Option 4'
      }
    ],
    correctOptionId: 3
  },
  2: {
    prompt: 'Which script will help the MarsBot get to the x?',
    gridImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/grid_question_1.png',
    options: [
      {
        id: 1,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_1.png',
        label: 'Script Option 1'
      },
      {
        id: 2,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_2.png',
        label: 'Script Option 2'
      },
      {
        id: 3,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_3.png',
        label: 'Script Option 3'
      },
      {
        id: 4,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_4.png',
        label: 'Script Option 4'
      }
    ],
    correctOptionId: 3
  },
  3: {
    prompt: 'Which script will help the MarsBot get to the x?',
    gridImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/grid_question_1.png',
    options: [
      {
        id: 1,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_1.png',
        label: 'Script Option 1'
      },
      {
        id: 2,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_2.png',
        label: 'Script Option 2'
      },
      {
        id: 3,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_3.png',
        label: 'Script Option 3'
      },
      {
        id: 4,
        scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L1_4/images/script_option_4.png',
        label: 'Script Option 4'
      }
    ],
    correctOptionId: 3
  }
};

export default function MarsBotQuizTask(props) {
  const { task, onTaskCompleted, onNextTask } = props;

  const questionNum = (function () {
    const taskId = String(task?.id || task?.taskId || '');
    const match = taskId.match(/_(\d+)$/);
    if (match) return parseInt(match[1], 10);
    return Number(task?.position || task?.level_position || 1);
  })();

  const questionData = QUIZ_QUESTIONS[questionNum] || QUIZ_QUESTIONS[1];

  const [selectedOption, setSelectedOption] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'correct' | 'incorrect' | null
  const [feedbackText, setFeedbackText] = useState('');

  // Reset state whenever switching tasks/questions
  useEffect(() => {
    setSelectedOption(null);
    setSubmissionStatus(null);
    setFeedbackText('');
  }, [task?.id, questionNum]);

  const handleSelectOption = (optionId) => {
    if (submissionStatus === 'correct') return; // Locked once correctly solved
    setSelectedOption(optionId);
    if (submissionStatus === 'incorrect') {
      setSubmissionStatus(null);
      setFeedbackText('');
    }
  };

  const handleReset = () => {
    setSelectedOption(null);
    setSubmissionStatus(null);
    setFeedbackText('');
  };

  const handleAnswerOrNext = () => {
    if (submissionStatus === 'correct') {
      if (typeof onNextTask === 'function') {
        onNextTask();
      }
      return;
    }

    if (!selectedOption) return;

    if (selectedOption === questionData.correctOptionId) {
      setSubmissionStatus('correct');
      setFeedbackText('Correct! MarsBot reached the target successfully.');
      playLmsSound(LMS_SOUND_TYPES.COMPLETE_ACTIVITY);

      if (typeof onTaskCompleted === 'function') {
        onTaskCompleted({
          isCorrect: true,
          score: 1,
          maxScore: 1,
          taskId: task?.id || `VP2_M1L1_4_${questionNum}`,
          activityType: 'marsbot-quiz'
        });
      }
    } else {
      setSubmissionStatus('incorrect');
      setFeedbackText('Not quite right. Check the turns and moves again!');
    }
  };

  return (
    <div className="marsbot-quiz-page">
      <div className="marsbot-quiz-container">
        {/* Left Card: Question Banner, Prompt & Actions */}
        <div className="marsbot-question-card">
          <div className="marsbot-banner">
            <img
              src={questionData.gridImage}
              alt="MarsBot Grid"
            />
          </div>

          <div className="marsbot-question-body">
            <h2 className="marsbot-prompt">{questionData.prompt}</h2>

            {feedbackText && (
              <div className={`marsbot-feedback ${submissionStatus}`}>
                {feedbackText}
              </div>
            )}
          </div>

          <div className="marsbot-action-bar">
            <button
              type="button"
              className="marsbot-reset-btn"
              onClick={handleReset}
              title="Reset choice"
              aria-label="Reset choice"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4a156f"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>

            <button
              type="button"
              className={`marsbot-answer-btn ${
                submissionStatus === 'correct'
                  ? 'next'
                  : selectedOption
                  ? 'active'
                  : 'disabled'
              }`}
              onClick={handleAnswerOrNext}
              disabled={!selectedOption && submissionStatus !== 'correct'}
            >
              {submissionStatus === 'correct' ? 'Next' : 'Answer'}
            </button>
          </div>
        </div>

        {/* Right Cards: 2x2 Option Grid */}
        <div className="marsbot-options-grid">
          {questionData.options.map((option) => {
            const isSelected = selectedOption === option.id;
            const isCorrect = submissionStatus === 'correct' && isSelected;
            const isWrong = submissionStatus === 'incorrect' && isSelected;

            const cardClasses = [
              'marsbot-option-card',
              isSelected ? 'selected' : '',
              isCorrect ? 'is-correct' : '',
              isWrong ? 'is-wrong' : ''
            ]
              .filter(Boolean)
              .join(' ');

            const radioClasses = [
              'marsbot-radio-btn',
              isSelected ? 'checked' : '',
              isCorrect ? 'correct-dot' : ''
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={option.id}
                className={cardClasses}
                onClick={() => handleSelectOption(option.id)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handleSelectOption(option.id);
                  }
                }}
              >
                <div className={radioClasses}>
                  {isSelected && <div className="marsbot-radio-dot" />}
                </div>

                <div className="marsbot-script-wrapper">
                  <img
                    src={option.scriptImage}
                    alt={option.label}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
