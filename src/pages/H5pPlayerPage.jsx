import { useState, useEffect, useRef } from 'react';
import { H5P } from 'h5p-standalone';
import TopNavigation from '../components/TopNavigation.jsx';
import LmsActivityFrame from '../components/LmsActivityFrame.jsx';
import {
  fetchPageProgress,
  isCompletedProgressRow,
  submitActivityCompletion,
} from '../lib/activityCompletion.js';

/**
 * Full-screen H5P player page.
 * Loads the H5P content in an iframe and listens for xAPI messages
 * to submit progress back to the classroom backend.
 */
export default function H5pPlayerPage({
  activity,
  courseId,
  onBack,
  onBackToCourses,
}) {
  const iframeRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Progress animation states
  const [justCompletedTaskId, setJustCompletedTaskId] = useState('');
  const [progressJustIncreased, setProgressJustIncreased] = useState(false);
  const [progressCelebrationKey, setProgressCelebrationKey] = useState(0);

  // Custom states for sub-task splitting
  const [tasks, setTasks] = useState([]);
  const [completedTaskIds, setCompletedTaskIds] = useState([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  const playUrl = activity?.h5pPlayUrl || '';
  const title = activity?.title || activity?.id || 'H5P Activity';

  // Get student/user role info from localStorage
  const studentEmail = localStorage.getItem('lms_student_email') || '';
  const userRole = (
    localStorage.getItem('lms_user_role') || 'student'
  ).toLowerCase();

  const isStudent = userRole !== 'teacher' && userRole !== 'admin';

  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const submitRef = useRef(null);

  /**
   * Hide "Show Solution" button for student role
   * and hide correct answers on failure.
   */
  useEffect(() => {
    const injectStyles = () => {
      const el =
        containerRef.current || document.getElementById('h5p-container');

      if (!el) return;

      let css = `
        /* Make unselected correct alternative look exactly like unselected wrong alternatives */
        ul.h5p-sc-alternatives.h5p-sc-selected li.h5p-sc-alternative.h5p-sc-reveal-correct:not(.h5p-sc-selected) {
          background: #ddd !important;
          color: #2b2b2b !important;
          -webkit-transform: scale(.95) !important;
          transform: scale(.95) !important;
          -webkit-box-shadow: none !important;
          -moz-box-shadow: none !important;
          box-shadow: none !important;
          text-shadow: none !important;
        }

        ul.h5p-sc-alternatives.h5p-sc-selected li.h5p-sc-alternative.h5p-sc-reveal-correct:not(.h5p-sc-selected):hover,
        ul.h5p-sc-alternatives.h5p-sc-selected li.h5p-sc-alternative.h5p-sc-reveal-correct:not(.h5p-sc-selected):active,
        ul.h5p-sc-alternatives.h5p-sc-selected li.h5p-sc-alternative.h5p-sc-reveal-correct:not(.h5p-sc-selected):focus {
          background: #ddd !important;
          -webkit-transform: scale(.95) !important;
          transform: scale(.95) !important;
        }

        ul.h5p-sc-alternatives.h5p-sc-selected li.h5p-sc-alternative.h5p-sc-reveal-correct:not(.h5p-sc-selected) .h5p-sc-status:after {
          content: none !important;
          display: none !important;
        }
      `;

      if (isStudent) {
        css += `
          .h5p-question-show-solution,
          .h5p-show-solution,
          .h5p-solution-button,
          .h5p-image-sequencing-solution,
          .h5p-joubelui-button[class*="solution"],
          .h5p-joubelui-button[class*="Solution"],
          [class*="show-solution"],
          [class*="showSolution"],
          [class*="ShowSolution"],
          [data-h5p-button="show-solution"],
          [data-h5p-button="solution"],
          .h5p-actions .h5p-question-show-solution,
          button.h5p-question-show-solution {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
      }

      const processDocument = (doc) => {
        if (!doc) return;

        let styleTag = doc.querySelector('#hide-h5p-solution-style');

        if (!styleTag && doc.head) {
          styleTag = doc.createElement('style');
          styleTag.id = 'hide-h5p-solution-style';
          doc.head.appendChild(styleTag);
        }

        if (styleTag) {
          styleTag.textContent = css;
        }

        if (isStudent) {
          // JS inspection fallback for buttons containing
          // "Show Solution" or "ShowSolution"
          const buttons = doc.querySelectorAll(
            'button, a, [role="button"]'
          );

          buttons.forEach((btn) => {
            const text = (btn.innerText || btn.textContent || '')
              .replace(/\s+/g, '')
              .toLowerCase();

            const cls = String(btn.className || '').toLowerCase();

            if (
              text.includes('showsolution') ||
              cls.includes('solution') ||
              cls.includes('show-solution')
            ) {
              btn.style.setProperty('display', 'none', 'important');
              btn.style.setProperty('visibility', 'hidden', 'important');
              btn.style.setProperty('opacity', '0', 'important');
              btn.style.setProperty('pointer-events', 'none', 'important');
            }
          });
        }
      };

      // Process main document
      processDocument(document);

      // Process any inner iframes
      const iframes = el.querySelectorAll('iframe');

      iframes.forEach((iframe) => {
        try {
          const doc =
            iframe.contentDocument ||
            iframe.contentWindow?.document;

          processDocument(doc);
        } catch {
          // Ignore cross-origin iframe restrictions
        }
      });
    };

    const interval = setInterval(injectStyles, 200);

    return () => clearInterval(interval);
  }, [isStudent]);

  /**
   * Fetch initial progress.
   *
   * IMPORTANT:
   * completedTaskIds loaded here represent tasks that were already completed
   * previously. They should NOT trigger progress animation.
   */
  useEffect(() => {
    if (!courseId || !activity?.id) return;

    let active = true;

    async function loadInitialProgress() {
      try {
        const progressList = await fetchPageProgress({
          courseId,
          lessonId: activity.moduleId || '',
          pageId: activity.id,
        });

        if (!active) return;

        const completedIds = progressList
          .filter(isCompletedProgressRow)
          .map((row) => row.task_id)
          .filter(Boolean);

        const uniqueCompletedIds = [...new Set(completedIds)];

        setCompletedTaskIds(uniqueCompletedIds);

        const storageKey = [
          'lms-completed-tasks',
          String(courseId),
          String(activity.moduleId || ''),
          String(activity.id || ''),
        ].join(':');

        try {
          localStorage.setItem(storageKey, JSON.stringify(uniqueCompletedIds));
        } catch (e) {
          // ignore
        }

        // Check if the main task itself is completed.
        const isMainCompleted = progressList.some(
          (row) =>
            row.task_id === activity.id &&
            isCompletedProgressRow(row)
        );

        if (isMainCompleted) {
          setSubmitted(true);
        }
      } catch (err) {
        console.warn(
          'Failed to load initial H5P progress:',
          err
        );
      }
    }

    loadInitialProgress();

    return () => {
      active = false;
    };
  }, [courseId, activity?.id, activity?.moduleId]);

  /**
   * Initialize H5P.
   */
  useEffect(() => {
    if (!playUrl) {
      setError('No H5P play URL configured for this activity.');
      setLoading(false);
      return;
    }

    if (initializedRef.current) return;

    initializedRef.current = true;

    let handler = null;
    let syncTimer = null;
    let initPoll = null;

    const getH5pContext = () => {
      const el =
        containerRef.current ||
        document.getElementById('h5p-container');

      const iframe = el?.querySelector('iframe');

      if (iframe?.contentWindow?.H5P) {
        return iframe.contentWindow;
      }

      if (window.H5P) {
        return window;
      }

      return null;
    };

    /**
     * Initialize H5P standalone.
     */
    const initH5p = async () => {
      try {
        const el =
          containerRef.current ||
          document.getElementById('h5p-container');

        if (!el) return;

        // Clear previous content
        el.innerHTML = '';

        const options = {
          h5pJsonPath: playUrl,
          frameJs: '/h5p-standalone/frame.bundle.js',
          frameCss: '/h5p-standalone/styles/h5p.css',
        };

        await new H5P(el, options);

        setLoading(false);

        // Poll until H5P instance is ready
        let attempts = 0;

        initPoll = setInterval(() => {
          attempts++;

          const h5pWin = getH5pContext();
          const inst = h5pWin?.H5P?.instances?.[0];

          if (inst) {
            clearInterval(initPoll);
            setupH5pOverrides(h5pWin, inst);
          } else if (attempts > 50) {
            clearInterval(initPoll);

            // Stop polling after ~10 seconds
            setTasks([
              {
                id: activity.id,
                title: title,
              },
            ]);
          }
        }, 200);
      } catch (err) {
        console.error('Failed to init H5P:', err);

        setError(
          'Failed to load H5P content. Please try again later.'
        );

        setLoading(false);
      }
    };

    /**
     * Apply H5P custom overrides and xAPI listeners.
     */
    const setupH5pOverrides = (h5pWin, inst) => {
      const H5P = h5pWin.H5P;

      /**
       * Intercept fetch inside iframe to silence
       * positive H5P sounds.
       */
      if (h5pWin.fetch) {
        const originalFetch = h5pWin.fetch;

        h5pWin.fetch = function (input, init) {
          const url =
            typeof input === 'string'
              ? input
              : input?.url || '';

          if (
            url &&
            (
              url.includes('positive-short') ||
              url.includes('positive') ||
              url.includes('correct')
            )
          ) {
            return Promise.resolve(
              new h5pWin.Response(
                new h5pWin.Blob(),
                { status: 200 }
              )
            );
          }

          return originalFetch.apply(this, arguments);
        };
      }

      /**
       * 1. Dynamic sub-tasks for SingleChoiceSet.
       */
      const choices = inst.options?.choices || [];

      if (choices.length > 0) {
        const dynamicTasks = choices.map(
          (choice, idx) => {
            const plainText = (
              choice.question || ''
            )
              .replace(/<[^>]*>/g, '')
              .trim();

            return {
              id: `${activity.id}_q${idx + 1}`,
              title:
                plainText ||
                `Question ${idx + 1}`,
            };
          }
        );

        setTasks(dynamicTasks);
      } else {
        setTasks([
          {
            id: activity.id,
            title: title,
          },
        ]);
      }

      /**
       * 2. Override SingleChoice result display.
       *
       * Do not reveal the correct answer when
       * the student's answer is incorrect.
       */
      if (H5P.SingleChoiceSet?.SingleChoice) {
        H5P.SingleChoiceSet.SingleChoice.prototype.showResult =
          function (correct, answerIndex) {
            const self = this;

            const $correctAlternative =
              self.$choice.find(
                '.h5p-sc-is-correct'
              );

            H5P.Transition.onTransitionEnd(
              $correctAlternative,
              function () {
                self.trigger('finished', {
                  correct: correct,
                  index: self.index,
                  answerIndex: answerIndex,
                });

                self.setAriaAttributes();
              },
              600
            );

            if (correct) {
              $correctAlternative.addClass(
                'h5p-sc-reveal-correct'
              );
            } else {
              self.$choice
                .find('.h5p-sc-is-wrong')
                .addClass(
                  'h5p-sc-reveal-wrong'
                );
            }
          };
      }

      /**
       * 3. Override SingleChoiceSet continue.
       *
       * Only advance when answer is correct.
       * Incorrect answers stay on the current question.
       */
      if (H5P.SingleChoiceSet) {
        H5P.SingleChoiceSet.prototype.continue =
          function (index) {
            const self = this;

            self.choices[
              index
            ].setA11yTextReadable();

            if (self.lastAnswerIsCorrect) {
              // Auto-advance to next slide if correct
              const timeout = setTimeout(() => {
                self.$container.off(
                  'click.impatient keydown.impatient'
                );

                self.next();
              }, self.options.behaviour.timeoutCorrect || 2000);

              self.$container.off(
                'click.impatient keydown.impatient'
              );

              self.$container.one(
                'click.impatient',
                () => {
                  clearTimeout(timeout);
                  self.next();
                }
              );
            } else {
              /**
               * Incorrect:
               * do not advance.
               * Wait, then reset current slide visually.
               */
              const timeout = setTimeout(() => {
                self.$container.off(
                  'click.impatient keydown.impatient'
                );

                const currentChoice =
                  self.choices[index];

                currentChoice.setAnswered(false);

                const classes = [
                  'h5p-sc-reveal-wrong',
                  'h5p-sc-reveal-correct',
                  'h5p-sc-selected',
                  'h5p-sc-drummed',
                  'h5p-sc-correct-answer',
                ];

                classes.forEach((cls) => {
                  currentChoice.$choice
                    .find('.' + cls)
                    .removeClass(cls);
                });
              }, self.options.behaviour.timeoutWrong || 2000);

              self.$container.off(
                'click.impatient keydown.impatient'
              );

              self.$container.one(
                'click.impatient',
                () => {
                  clearTimeout(timeout);

                  const currentChoice =
                    self.choices[index];

                  currentChoice.setAnswered(
                    false
                  );

                  const classes = [
                    'h5p-sc-reveal-wrong',
                    'h5p-sc-reveal-correct',
                    'h5p-sc-selected',
                    'h5p-sc-drummed',
                    'h5p-sc-correct-answer',
                  ];

                  classes.forEach((cls) => {
                    currentChoice.$choice
                      .find('.' + cls)
                      .removeClass(cls);
                  });
                }
              );
            }
          };
      }

      /**
       * 4. Silence H5P positive sounds.
       *
       * LMS handles its own progress/completion sound.
       */
      if (H5P.SingleChoiceSet?.SoundEffects) {
        const originalPlay =
          H5P.SingleChoiceSet.SoundEffects.play;

        H5P.SingleChoiceSet.SoundEffects.play =
          function (type, delay) {
            if (
              type === 'positive-short' ||
              type === 'positive' ||
              type === 'correct'
            ) {
              return;
            }

            originalPlay.call(
              this,
              type,
              delay
            );
          };
      }

      /**
       * 5. Sync current H5P question index
       * to TopNavigation.
       */
      syncTimer = setInterval(() => {
        if (
          typeof inst.currentIndex ===
          'number'
        ) {
          setCurrentTaskIndex(
            inst.currentIndex
          );
        }
      }, 150);

      /**
       * 6. Listen for H5P xAPI events.
       */
      if (H5P.externalDispatcher) {
        handler = (event) => {
          const statement =
            event.data?.statement;

          if (
            !statement ||
            !statement.verb
          ) {
            return;
          }

          const verbId =
            statement.verb.id || '';

          const verbDisplay =
            statement.verb.display?.[
              'en-US'
            ] || '';

          const normalizedVerbDisplay =
            verbDisplay.toLowerCase();

          const isCompleted =
            verbId.includes('completed') ||
            normalizedVerbDisplay.includes(
              'completed'
            );

          const isPassed =
            verbId.includes('passed') ||
            normalizedVerbDisplay.includes(
              'passed'
            );

          const isAnswered =
            verbId.includes('answered') ||
            normalizedVerbDisplay.includes(
              'answered'
            );

          const isReset =
            verbId.includes('reset') ||
            normalizedVerbDisplay.includes(
              'reset'
            );

          /**
           * IMPORTANT:
           *
           * H5P reset only resets the H5P UI.
           * It must NOT erase LMS completion state.
           *
           * Otherwise a task that was completed before
           * would appear "new" again and trigger animation
           * when answered correctly again.
           */
          if (isReset) {
            return;
          }

          /**
           * SingleChoiceSet sub-task.
           */
          if (
            choices.length > 0 &&
            isAnswered
          ) {
            const objectId =
              statement.object?.id || '';

            const match =
              objectId.match(
                /subContentId=([a-f0-9-]+)/i
              );

            const subContentId =
              match ? match[1] : null;

            let questionIndex = -1;

            if (subContentId) {
              questionIndex =
                choices.findIndex(
                  (choice) =>
                    choice.subContentId ===
                    subContentId
                );
            }

            if (
              questionIndex === -1 &&
              typeof inst.currentIndex ===
                'number'
            ) {
              questionIndex =
                inst.currentIndex;
            }

            if (questionIndex >= 0) {
              const subTaskId =
                `${activity.id}_q${
                  questionIndex + 1
                }`;

              const isCorrectAnswer =
                statement.result?.success ===
                true;

              const isCompletedAnswer =
                statement.result
                  ?.completion === true;

              submitRef.current?.(
                statement,
                verbId,
                isCompletedAnswer,
                isCorrectAnswer,
                subTaskId
              );
            }
          }

          /**
           * Normal H5P task.
           */
          else if (
            isCompleted ||
            isPassed
          ) {
            submitRef.current?.(
              statement,
              verbId,
              isCompleted,
              isPassed,
              activity.id
            );
          }
        };

        H5P.externalDispatcher.on(
          'xAPI',
          handler
        );
      }
    };

    initH5p();

    return () => {
      if (initPoll) {
        clearInterval(initPoll);
      }

      if (syncTimer) {
        clearInterval(syncTimer);
      }

      const h5pWin =
        getH5pContext();

      if (
        h5pWin?.H5P
          ?.externalDispatcher &&
        handler
      ) {
        h5pWin.H5P.externalDispatcher.off(
          'xAPI',
          handler
        );
      }
    };
  }, [playUrl]);

  function getSessionId() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const querySessionId =
      params.get('sessionId') ||
      params.get('session');

    if (querySessionId) {
      localStorage.setItem(
        'lms-session-id',
        querySessionId
      );

      return querySessionId;
    }

    let sessionId =
      localStorage.getItem(
        'lms-session-id'
      );

    if (!sessionId) {
      sessionId =
        `session-${Math.random()
          .toString(36)
          .substring(2, 11)}`;

      localStorage.setItem(
        'lms-session-id',
        sessionId
      );
    }

    return sessionId;
  }

  function getUserId() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    return (
      params.get('userId') ||
      localStorage.getItem(
        'lms-user-id'
      ) ||
      localStorage.getItem(
        'lms_student_email'
      ) ||
      'tim.tran@algo.edu.vn'
    );
  }

  /**
   * Submit H5P progress.
   *
   * IMPORTANT LOGIC:
   *
   * Animation is triggered ONLY when:
   * - the answer is correct
   * - AND finalTaskId is NOT already in completedTaskIds
   *
   * Therefore:
   *
   * first correct answer:
   *   ✅ progress increases
   *   ✅ animation runs
   *
   * correct answer again on an already completed task:
   *   ✅ attempt can still be submitted
   *   ❌ progress does not increase
   *   ❌ animation does not run
   */
  async function submitH5pProgress(
    xapiData,
    verbId,
    completed,
    success,
    targetTaskId
  ) {
    if (
      !courseId ||
      !activity?.id
    ) {
      return;
    }

    const scoreRaw =
      xapiData?.result?.score?.raw ??
      0;

    const scoreMax =
      xapiData?.result?.score?.max ??
      1;

    const finalTaskId =
      targetTaskId ||
      activity.id;

    /**
     * Only update progress + animation
     * for a NEWLY completed task.
     */
    if (success) {
      setCompletedTaskIds(
        (prev) => {
          /**
           * Already completed before.
           *
           * Do NOT trigger:
           * - justCompletedTaskId
           * - progressJustIncreased
           * - progressCelebrationKey
           */
          if (
            prev.includes(
              finalTaskId
            )
          ) {
            return prev;
          }

          /**
           * First successful completion.
           */
          const next = [
            ...prev,
            finalTaskId,
          ];

          if (
            tasks.length > 0 &&
            next.length ===
              tasks.length
          ) {
            setSubmitted(true);
          }

          /**
           * Trigger progress animation ONLY here,
           * because this is genuinely new progress.
           */
          setJustCompletedTaskId(
            finalTaskId
          );

          setProgressJustIncreased(
            true
          );

          setProgressCelebrationKey(
            Date.now()
          );

          // Save to localStorage so PageCatalog sees it
          const storageKey = [
            'lms-completed-tasks',
            String(courseId),
            String(activity.moduleId || ''),
            String(activity.id || ''),
          ].join(':');

          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch (e) {
            // ignore
          }

          return next;
        }
      );
    }

    /**
     * Still submit the attempt to backend
     * even when the task was already completed.
     *
     * The backend can preserve attempt history,
     * while frontend progress remains unchanged.
     */
    try {
      await submitActivityCompletion({
        courseId,
        lessonId:
          activity.moduleId || '',
        pageId: activity.id,
        taskId: finalTaskId,
        activityType: 'h5p',
        isCorrect: success,
        score: scoreRaw,
        maxScore: scoreMax,
        metadata: {
          verb: verbId,
          rawStatement:
            xapiData,
        },
      });
    } catch (err) {
      console.error(
        'Failed to submit H5P attempt:',
        err
      );
    }
  }

  submitRef.current =
    submitH5pProgress;

  function getApiBase() {
    const savedUrl =
      localStorage.getItem(
        'lms_backend_url'
      ) ||
      localStorage.getItem(
        'lms_supabase_url'
      );

    if (savedUrl) {
      return savedUrl.replace(
        /\/+$/,
        ''
      );
    }

    const envUrl =
      import.meta.env
        .VITE_API_BASE_URL ||
      import.meta.env
        .VITE_API_URL ||
      window.__CLASSROOM_API_BASE ||
      '';

    return envUrl.replace(
      /\/+$/,
      ''
    );
  }

  function handleIframeLoad() {
    setLoading(false);
  }

  function handleIframeError() {
    setLoading(false);

    setError(
      'Failed to load H5P content. Please try again later.'
    );
  }

  function handleBackToCourse() {
    if (
      typeof onBackToCourses ===
      'function'
    ) {
      onBackToCourses();
      return;
    }

    /**
     * Generated VP activity wrappers may not
     * forward App routing props.
     *
     * Update URL and notify App so correct
     * student/teacher course dashboard is restored
     * without reloading the whole LMS.
     */
    window.history.pushState(
      {},
      '',
      '/'
    );

    window.dispatchEvent(
      new PopStateEvent(
        'popstate'
      )
    );
  }

  return (
    <div className="app-shell">
      {/* Standard Page Shell Top Navigation */}
      <TopNavigation
        title={title}
        courseId={courseId || 'VP'}
        courseTitle={
          courseId || 'VP'
        }
        moduleId={
          activity?.moduleId || ''
        }
        lessonTitle={
          activity?.moduleId || ''
        }
        pageId={
          activity?.id || ''
        }
        pageTitle={title}
        tasks={
          tasks.length > 0
            ? tasks
            : [
                {
                  id:
                    activity?.id ||
                    '1',
                  title: title,
                },
              ]
        }
        currentTaskIndex={
          currentTaskIndex
        }
        completedTaskIds={
          completedTaskIds
        }
        justCompletedTaskId={
          justCompletedTaskId
        }
        progressJustIncreased={
          progressJustIncreased
        }
        progressCelebrationKey={
          progressCelebrationKey
        }
        onBackToCatalog={
          onBack
        }
        onBackToCourses={
          handleBackToCourse
        }
      />

      <LmsActivityFrame
        title={title}
        onBack={onBack}
        onReset={() => {
          initializedRef.current =
            false;

          window.location.reload();
        }}
      >
        {/* Error state */}
        {error && (
          <section
            className="kids-hero-section"
            style={{
              marginTop: 20,
            }}
          >
            <h1
              style={{
                marginBottom: 16,
              }}
            >
              Oops! Cannot load
              activity 😢
            </h1>

            <p
              style={{
                fontSize: 16,
                lineHeight: 1.5,
              }}
            >
              {error}
            </p>

            <button
              type="button"
              className="kids-back-button"
              style={{
                position:
                  'relative',
                top: 'auto',
                left: 'auto',
                marginTop: 20,
              }}
              onClick={onBack}
            >
              ← Go back
            </button>
          </section>
        )}

        {/* Loading spinner */}
        {loading && !error && (
          <section
            className="kids-hero-section"
            style={{
              marginTop: 20,
            }}
          >
            <div className="kids-loading-spinner"></div>

            <h1>
              Loading... ⏳
            </h1>
          </section>
        )}

        {/* H5P Container */}
        {playUrl && (
          <div
            ref={containerRef}
            id="h5p-container"
            className="h5p-player-container"
            style={{
              width: '100%',
              minHeight: '520px',
              padding: '10px',
            }}
          />
        )}
      </LmsActivityFrame>
    </div>
  );
}