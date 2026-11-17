import React, { useState, useEffect } from 'react';
import { playLmsSound, LMS_SOUND_TYPES } from '../utils/lmsSounds';
import { saveTaskCompletionToSupabase } from '../lib/supabaseProgress.js';
import './MarsBotQuizTask.css';

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
    'session-marsbot'
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

const QUIZ_CONFIG_BY_PAGE = {
  // Lesson 1 Task 4: MarsBot Navigation Quiz
  VP2_M1L1_4: {
    1: {
      prompt: 'Which script will help the MarsBot get to the x?',
      bannerBg: '#cf5228',
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
      correctOptionId: 3,
      feedbackCorrect: 'Correct! MarsBot reached the target successfully.',
      feedbackIncorrect: 'Not quite right. Check the turns and moves again!'
    },
    2: {
      prompt: 'Which script will help the MarsBot get to the x?',
      bannerBg: '#cf5228',
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
      correctOptionId: 3,
      feedbackCorrect: 'Correct! MarsBot reached the target successfully.',
      feedbackIncorrect: 'Not quite right. Check the turns and moves again!'
    },
    3: {
      prompt: 'Which script will help the MarsBot get to the x?',
      bannerBg: '#cf5228',
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
      correctOptionId: 3,
      feedbackCorrect: 'Correct! MarsBot reached the target successfully.',
      feedbackIncorrect: 'Not quite right. Check the turns and moves again!'
    },
    4: {
      prompt: 'Which script will help the MarsBot get to the x?',
      bannerBg: '#cf5228',
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
      correctOptionId: 3,
      feedbackCorrect: 'Correct! MarsBot reached the target successfully.',
      feedbackIncorrect: 'Not quite right. Check the turns and moves again!'
    }
  },

  // Lesson 2 Task 4: Test yourself. Loops (Robot Construction Quiz)
  VP2_M1L2_4: {
    2: {
      prompt: 'The robot is building in the picture.\nWhich program is it running?',
      bannerBg: '#ffffff',
      gridImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/grid_question_1.png',
      options: [
        {
          id: 1,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_1.png',
          label: 'repeat 3 [factory, move forward], move forward, wind generator'
        },
        {
          id: 2,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_2.png',
          label: 'repeat 3 [move forward, factory], move forward, wind generator'
        },
        {
          id: 3,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_3.png',
          label: 'repeat 3 [move forward, factory], wind generator'
        },
        {
          id: 4,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_4.png',
          label: 'repeat 4 [move forward, factory], wind generator'
        }
      ],
      correctOptionId: 2,
      feedbackCorrect: 'Correct! The robot follows this program to build 3 factories and 1 wind generator.',
      feedbackIncorrect: 'Not quite right. Trace the repeat block and check what the robot builds first and last!'
    },
    3: {
      prompt: 'The robot is building in the picture.\nWhich program is it running?',
      bannerBg: '#ffffff',
      gridImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/grid_question_1.png',
      options: [
        {
          id: 1,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_1.png',
          label: 'Option 1'
        },
        {
          id: 2,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_2.png',
          label: 'Option 2'
        },
        {
          id: 3,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_3.png',
          label: 'Option 3'
        },
        {
          id: 4,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_4.png',
          label: 'Option 4'
        }
      ],
      correctOptionId: 2,
      feedbackCorrect: 'Correct! The robot follows this program to build 3 factories and 1 wind generator.',
      feedbackIncorrect: 'Not quite right. Trace the repeat block and check what the robot builds first and last!'
    },
    4: {
      prompt: 'The robot is building in the picture.\nWhich program is it running?',
      bannerBg: '#ffffff',
      gridImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/grid_question_1.png',
      options: [
        {
          id: 1,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_1.png',
          label: 'Option 1'
        },
        {
          id: 2,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_2.png',
          label: 'Option 2'
        },
        {
          id: 3,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_3.png',
          label: 'Option 3'
        },
        {
          id: 4,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/script_option_4.png',
          label: 'Option 4'
        }
      ],
      correctOptionId: 2,
      feedbackCorrect: 'Correct! The robot follows this program to build 3 factories and 1 wind generator.',
      feedbackIncorrect: 'Not quite right. Trace the repeat block and check what the robot builds first and last!'
    }
  }
};

function resolveQuestionData(task, taskIndex) {
  // 1. Task object directly has custom quiz configuration
  if (task?.marsbotQuiz || task?.quizData || task?.quiz) {
    return task.marsbotQuiz || task.quizData || task.quiz;
  }

  // 2. Identify pageId & questionNum
  const taskId = String(task?.id || task?.taskId || '');
  const urlParams = new URLSearchParams(window.location.search);
  const rawPageId = String(
    urlParams.get('page') ||
    task?.pageId ||
    (taskId.includes('_') ? taskId.substring(0, taskId.lastIndexOf('_')) : '') ||
    'VP2_M1L1_4'
  );
  const normPageId = rawPageId.toUpperCase().replace(/^VP_/, 'VP2_');

  const match = taskId.match(/_(\d+)$/);
  const questionNum = match ? parseInt(match[1], 10) : Number(task?.position || (taskIndex + 1));

  const pageQuestions = QUIZ_CONFIG_BY_PAGE[normPageId] || QUIZ_CONFIG_BY_PAGE['VP2_M1L1_4'];
  return (
    pageQuestions[questionNum] ||
    pageQuestions[2] ||
    pageQuestions[1] ||
    Object.values(pageQuestions)[0]
  );
}

export default function MarsBotQuizTask(props) {
  const { task, completedTaskIds = [], onTaskCompleted, onNextTask, tasks = [], taskIndex = 0 } = props;

  const questionNum = (function () {
    const taskId = String(task?.id || task?.taskId || '');
    const match = taskId.match(/_(\d+)$/);
    if (match) return parseInt(match[1], 10);
    return Number(task?.position || task?.level_position || (taskIndex + 1));
  })();

  const currentTaskId = String(task?.id || task?.taskId || `VP2_M1L2_4_${questionNum}`);
  const questionData = resolveQuestionData(task, taskIndex);

  const isAlreadyCompleted =
    completedTaskIds.includes(currentTaskId) ||
    localStorage.getItem(`marsbot_completed_${currentTaskId}`) === 'true';

  const [selectedOption, setSelectedOption] = useState(() =>
    isAlreadyCompleted ? questionData.correctOptionId : null
  );
  const [submissionStatus, setSubmissionStatus] = useState(() =>
    isAlreadyCompleted ? 'correct' : null
  ); // 'correct' | 'incorrect' | null
  const [feedbackText, setFeedbackText] = useState(() =>
    isAlreadyCompleted
      ? (questionData.feedbackCorrect || 'Correct! MarsBot reached the target successfully.')
      : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever switching question/task
  useEffect(() => {
    const isDone =
      completedTaskIds.includes(currentTaskId) ||
      localStorage.getItem(`marsbot_completed_${currentTaskId}`) === 'true';

    if (isDone) {
      setSelectedOption(questionData.correctOptionId);
      setSubmissionStatus('correct');
      setFeedbackText(questionData.feedbackCorrect || 'Correct! MarsBot reached the target successfully.');
    } else {
      setSelectedOption(null);
      setSubmissionStatus(null);
      setFeedbackText('');
    }
  }, [currentTaskId, completedTaskIds, questionNum, questionData]);

  const handleSelectOption = (optionId) => {
    if (isSubmitting) return;
    setSelectedOption(optionId);
    if (submissionStatus) {
      setSubmissionStatus(null);
      setFeedbackText('');
    }
  };

  const handleReset = () => {
    if (isSubmitting) return;
    setSelectedOption(null);
    setSubmissionStatus(null);
    setFeedbackText('');
    try {
      localStorage.removeItem(`marsbot_completed_${currentTaskId}`);
    } catch {}
  };

  // Nộp bài & Chấm điểm qua Backend /api/activity-attempts (chuẩn LMS Algorithmics)
  const submitTaskAttempt = async (chosenOptionId) => {
    setIsSubmitting(true);

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course') || 'VP2';
    const lessonId = urlParams.get('lesson') || 'M1-Visual-Programming-Basics';
    const pageId = urlParams.get('page') || task?.pageId || 'VP2_M1L2_4';

    const payload = {
      sessionId: getSessionId(),
      userId: getUserId(),
      courseId,
      lessonId,
      pageId,
      taskId: currentTaskId,
      activityType: 'mcq-checkbox',
      answer: {
        selectedOptionIds: [String(chosenOptionId)],
        selectedOptionId: chosenOptionId,
      },
    };

    let isCorrect = chosenOptionId === questionData.correctOptionId;
    let feedback = isCorrect
      ? (questionData.feedbackCorrect || 'Correct! MarsBot reached the target successfully.')
      : (questionData.feedbackIncorrect || 'Not quite right. Check the turns and moves again!');

    const backendUrl = getBackendUrl();
    const endpoint = `${backendUrl}/api/activity-attempts`;

    try {
      const accessToken =
        sessionStorage.getItem('lms_access_token') ||
        localStorage.getItem('lms_access_token');
      const headers = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      // Gọi endpoint /api/activity-attempts của backend
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const gradingResult = data?.result || data?.attempt?.result;
        if (gradingResult && typeof gradingResult.isCorrect === 'boolean') {
          isCorrect = gradingResult.isCorrect;
          if (gradingResult.feedback) {
            feedback = gradingResult.feedback;
          }
        }
      }
    } catch (err) {
      console.warn('[MarsBotQuizTask] Backend attempt call fallback:', err);
    }

    if (isCorrect) {
      setSubmissionStatus('correct');
      setFeedbackText(feedback || 'Correct! MarsBot reached the target successfully.');
      playLmsSound(LMS_SOUND_TYPES.COMPLETE_ACTIVITY);

      // Lưu Supabase activity_progress chuẩn LMS
      await saveTaskCompletionToSupabase({
        courseId,
        lessonId,
        pageId,
        taskId: currentTaskId,
        activityType: 'marsbot-quiz',
      });

      try {
        localStorage.setItem(`marsbot_completed_${currentTaskId}`, 'true');
      } catch {}

      if (typeof onTaskCompleted === 'function') {
        onTaskCompleted({
          taskId: currentTaskId,
          isCorrect: true,
          completed: true,
          score: 1,
          maxScore: 1,
          activityType: 'marsbot-quiz',
          autoTransition: true,
        });
      }
    } else {
      setSubmissionStatus('incorrect');
      setFeedbackText(feedback || 'Not quite right. Check the turns and moves again!');
    }

    setIsSubmitting(false);
  };

  const handleAnswerOrNext = () => {
    // Nếu đã hoàn thành bài đúng và ấn nút -> chuyển bài tiếp theo
    if (submissionStatus === 'correct') {
      if (typeof onNextTask === 'function') {
        onNextTask();
      }
      return;
    }

    if (!selectedOption || isSubmitting) return;

    submitTaskAttempt(selectedOption);
  };

  const isLastTask = taskIndex >= (tasks.length - 1);

  return (
    <div className="marsbot-quiz-page">
      <div className="marsbot-quiz-container">
        {/* Left Card: Question Banner, Prompt & Actions */}
        <div className="marsbot-question-card">
          <div
            className="marsbot-banner"
            style={{ background: questionData.bannerBg || '#ffffff' }}
          >
            <img
              src={questionData.gridImage}
              alt="Quiz Grid"
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
              disabled={isSubmitting}
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
              disabled={(!selectedOption && submissionStatus !== 'correct') || isSubmitting}
            >
              {isSubmitting
                ? 'Checking...'
                : submissionStatus === 'correct'
                ? isLastTask
                  ? 'Finish'
                  : 'Next'
                : 'Answer'}
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
