import React, { useState, useEffect, useMemo } from 'react';
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

  // Lesson 2 Task 4: Test yourself. Loops
  VP2_M1L2_4: {
    // Question 1 (level 1 in test): Robot building quiz
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
    // Question 2 (level 2 in test): Brush drawing quiz
    3: {
      prompt: 'What drawing will we get when this program is run (the brush is the start cell):',
      bannerBg: '#ffffff',
      gridImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/grid_question_2.png',
      options: [
        {
          id: 1,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/grid_option_1.png',
          label: 'Option 1'
        },
        {
          id: 2,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/grid_option_2.png',
          label: 'Option 2'
        },
        {
          id: 3,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/grid_option_3.png',
          label: 'Option 3'
        },
        {
          id: 4,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L2_4/images/grid_option_4.png',
          label: 'Option 4'
        }
      ],
      correctOptionId: 3,
      feedbackCorrect: 'Correct! The brush moves right and up 3 times, then draws a square.',
      feedbackIncorrect: 'Not quite right. Follow the loop steps (right, up) 3 times and check the final shape drawn!'
    },
    // Question 3 (level 3 in test / Task 4 in manifest): Real life looping algorithms
    4: {
      prompt: 'Choose the examples of looping algorithms in real life.',
      gridImage: null,
      multiple: true,
      layout: 'vertical',
      options: [
        {
          id: 1,
          text: 'A flower opening and closing during the day'
        },
        {
          id: 2,
          text: 'The change of seasons'
        },
        {
          id: 3,
          text: 'A tree sprouting from a seed'
        },
        {
          id: 4,
          text: 'How a traffic light works'
        }
      ],
      correctOptionIds: [1, 2, 4],
      feedbackCorrect: 'Correct! Flowers opening/closing, seasons changing, and traffic lights are all looping processes in real life.',
      feedbackIncorrect: 'Not quite right. Think about which processes repeat over and over again continuously!'
    }
  },

  // Lesson 3 Task 4: Test yourself. Initial placement
  VP2_M1L3_4: {
    // Question 1 (level 2 in LMS): Bear initial properties
    2: {
      prompt: 'What properties do we need to set for the bear sprite at the very beginning? What changes?',
      bannerBg: '#ffffff',
      bannerFlush: true,
      gridImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L3_4/images/bear_initial_placement.png',
      multiple: true,
      layout: 'vertical',
      options: [
        { id: 1, text: 'Size', label: 'Size' },
        { id: 2, text: 'Visibility', label: 'Visibility' },
        { id: 3, text: 'Background', label: 'Background' },
        { id: 4, text: 'Costume', label: 'Costume' }
      ],
      correctOptionIds: [1, 4],
      allowedOptionIdSets: [[1, 4], [1, 2, 4]],
      feedbackCorrect: 'Correct! The bear changes size as it walks along the path and changes costumes for the walking animation.',
      feedbackIncorrect: 'Not quite right. Background is a property of the Stage, not a sprite. Think about what changes for the bear sprite!'
    },
    // Question 2 (level 3 in LMS / Task 3 in manifest): Dialogue timing quiz
    3: {
      prompt: 'The code for one of the sprites is shown on the left. Which of the scripts works for the other character? The sprites should not speak at the same time.',
      bannerBg: '#ffffff',
      gridImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L3_4/images/script_dialogue_question.png',
      options: [
        {
          id: 1,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L3_4/images/script_dialogue_opt1.png',
          label: 'Option 1'
        },
        {
          id: 2,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L3_4/images/script_dialogue_opt2.png',
          label: 'Option 2'
        },
        {
          id: 3,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L3_4/images/script_dialogue_opt3.png',
          label: 'Option 3'
        },
        {
          id: 4,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L3_4/images/script_dialogue_opt4.png',
          label: 'Option 4'
        }
      ],
      correctOptionId: 1,
      feedbackCorrect: 'Correct! The second sprite waits while the first sprite speaks, so they take turns speaking without overlapping.',
      feedbackIncorrect: 'Not quite right. Trace each wait and say block in seconds to ensure the sprites never speak at the same time!'
    }
  },
  VP2_M1L4_4: {
    // Question 1 (level 2 in LMS / Task 2 in manifest): Costume change on click quiz
    2: {
      prompt: 'What script will lead to a change of costume after clicking on the sprite?',
      options: [
        {
          id: 1,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L4_4/images/costume_change_opt1.png',
          label: 'Option 1'
        },
        {
          id: 2,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L4_4/images/costume_change_opt2.png',
          label: 'Option 2'
        },
        {
          id: 3,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L4_4/images/costume_change_opt3.png',
          label: 'Option 3'
        },
        {
          id: 4,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L4_4/images/costume_change_opt4.png',
          label: 'Option 4'
        }
      ],
      correctOptionId: 2,
      feedbackCorrect: 'Correct! The "when this sprite clicked" event combined with "next costume" changes the costume upon clicking.',
      feedbackIncorrect: 'Not quite right. Look for an event block that triggers when clicking the sprite, and a looks block that changes costume!'
    },
    // Question 2 (level 3 in LMS / Task 3 in manifest): Rooster spacebar animation quiz
    3: {
      prompt: 'Look at the rooster scripts. Choose the animation that shows what it will do when you press the spacebar.',
      bannerBg: '#ffffff',
      gridImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L4_4/images/rooster_scripts_question.png',
      options: [
        {
          id: 1,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L4_4/images/rooster_anim_opt1.gif',
          label: 'Option 1'
        },
        {
          id: 2,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L4_4/images/rooster_anim_opt2.gif',
          label: 'Option 2'
        },
        {
          id: 3,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L4_4/images/rooster_anim_opt3.gif',
          label: 'Option 3'
        },
        {
          id: 4,
          scriptImage: '/courses/VP2/M1-Visual-Programming-Basics/pages/VP2_M1L4_4/images/rooster_anim_opt4.gif',
          label: 'Option 4'
        }
      ],
      correctOptionId: 3,
      feedbackCorrect: 'Correct! When the spacebar is pressed, the rooster executes the repeat 9 loop to cycle through its costumes.',
      feedbackIncorrect: 'Not quite right. Look closely at the "when space key pressed" script: it repeats changing costumes 9 times, and does not say Hello!'
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
    pageQuestions[4] ||
    pageQuestions[3] ||
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

  const isMultiple = Boolean(
    questionData.multiple ||
    (Array.isArray(questionData.correctOptionIds) && questionData.correctOptionIds.length > 1)
  );

  const correctOptionIds = useMemo(() => {
    if (Array.isArray(questionData.correctOptionIds)) {
      return questionData.correctOptionIds;
    }
    if (questionData.correctOptionId != null) {
      return [questionData.correctOptionId];
    }
    return [];
  }, [questionData]);

  const isAlreadyCompleted =
    completedTaskIds.includes(currentTaskId) ||
    localStorage.getItem(`marsbot_completed_${currentTaskId}`) === 'true';

  const [selectedOptionIds, setSelectedOptionIds] = useState(() => {
    if (isAlreadyCompleted) return correctOptionIds;
    return [];
  });

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
      setSelectedOptionIds(correctOptionIds);
      setSubmissionStatus('correct');
      setFeedbackText(questionData.feedbackCorrect || 'Correct! MarsBot reached the target successfully.');
    } else {
      setSelectedOptionIds([]);
      setSubmissionStatus(null);
      setFeedbackText('');
    }
  }, [currentTaskId, completedTaskIds, questionNum, questionData, correctOptionIds]);

  const handleSelectOption = (optionId) => {
    if (isSubmitting) return;

    if (isMultiple) {
      setSelectedOptionIds((prev) => {
        if (prev.includes(optionId)) {
          return prev.filter((id) => id !== optionId);
        } else {
          return [...prev, optionId];
        }
      });
    } else {
      setSelectedOptionIds([optionId]);
    }

    if (submissionStatus) {
      setSubmissionStatus(null);
      setFeedbackText('');
    }
  };

  const handleReset = () => {
    if (isSubmitting) return;
    setSelectedOptionIds([]);
    setSubmissionStatus(null);
    setFeedbackText('');
    try {
      localStorage.removeItem(`marsbot_completed_${currentTaskId}`);
    } catch {}
  };

  // Nộp bài & Chấm điểm qua Backend /api/activity-attempts (chuẩn LMS Algorithmics)
  const submitTaskAttempt = async (chosenIds) => {
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
        selectedOptionIds: chosenIds.map(String),
        selectedOptionId: chosenIds[0],
      },
    };

    let isCorrect = false;
    if (Array.isArray(questionData.allowedOptionIdSets)) {
      isCorrect = questionData.allowedOptionIdSets.some((validSet) => {
        return (
          validSet.length === chosenIds.length &&
          validSet.every((id) => chosenIds.includes(id))
        );
      });
    } else {
      isCorrect =
        chosenIds.length === correctOptionIds.length &&
        correctOptionIds.every((id) => chosenIds.includes(id));
    }

    let feedback = isCorrect
      ? (questionData.feedbackCorrect || 'Correct! Answer submitted successfully.')
      : (questionData.feedbackIncorrect || 'Not quite right. Check your choices again!');

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
      setFeedbackText(feedback || 'Correct! Answer submitted successfully.');
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
      setFeedbackText(feedback || 'Not quite right. Check your choices again!');
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

    if (selectedOptionIds.length === 0 || isSubmitting) return;

    submitTaskAttempt(selectedOptionIds);
  };

  const isLastTask = taskIndex >= (tasks.length - 1);
  const isVerticalLayout = questionData.layout === 'vertical' || !questionData.options.some((o) => o.scriptImage);

  return (
    <div className="marsbot-quiz-page">
      <div className="marsbot-quiz-container">
        {/* Left Card: Question Banner, Prompt & Actions */}
        <div className="marsbot-question-card">
          {questionData.gridImage ? (
            <div
              className={`marsbot-banner ${questionData.bannerFlush ? 'flush' : ''}`}
              style={{ background: questionData.bannerBg || '#ffffff' }}
            >
              <img
                src={questionData.gridImage}
                alt="Quiz Banner"
              />
            </div>
          ) : null}

          <div className="marsbot-question-body">
            <h2 className="marsbot-prompt">{questionData.prompt}</h2>
            {questionData.description ? (
              <p className="marsbot-description">{questionData.description}</p>
            ) : null}

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
                  : selectedOptionIds.length > 0
                  ? 'active'
                  : 'disabled'
              }`}
              onClick={handleAnswerOrNext}
              disabled={(selectedOptionIds.length === 0 && submissionStatus !== 'correct') || isSubmitting}
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

        {/* Right Cards: Either 2x2 Option Grid or Vertical Stack of Checkboxes */}
        <div
          className={`marsbot-options-grid ${isVerticalLayout ? 'vertical-layout' : ''}`}
          style={questionData.columns === 1 && !isVerticalLayout ? { gridTemplateColumns: '1fr' } : undefined}
        >
          {questionData.options.map((option) => {
            const isSelected = selectedOptionIds.includes(option.id);
            const isCorrect = submissionStatus === 'correct' && isSelected;
            const isWrong = submissionStatus === 'incorrect' && isSelected;

            const cardClasses = [
              'marsbot-option-card',
              isVerticalLayout ? 'vertical-card' : '',
              isSelected ? 'selected' : '',
              isCorrect ? 'is-correct' : '',
              isWrong ? 'is-wrong' : ''
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={option.id}
                className={cardClasses}
                onClick={() => handleSelectOption(option.id)}
                role={isMultiple ? 'checkbox' : 'radio'}
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handleSelectOption(option.id);
                  }
                }}
              >
                {isMultiple ? (
                  <div className={`marsbot-checkbox-box ${isSelected ? 'checked' : ''} ${isCorrect ? 'correct-check' : ''}`}>
                    {isSelected && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                ) : (
                  <div className={`marsbot-radio-btn ${isSelected ? 'checked' : ''} ${isCorrect ? 'correct-dot' : ''}`}>
                    {isSelected && <div className="marsbot-radio-dot" />}
                  </div>
                )}

                {option.scriptImage ? (
                  <div className="marsbot-script-wrapper">
                    <img
                      src={option.scriptImage}
                      alt={option.label || `Option ${option.id}`}
                    />
                  </div>
                ) : (
                  <div className="marsbot-option-label">
                    {option.text || option.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
