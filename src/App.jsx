import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import { getVp2UnlockedLessonLimit, getVp2PageLessonNumber } from './lib/vp2LessonAccess.js';
import H5pPlayerPage from './pages/H5pPlayerPage.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import BlockGameTask from './components/BlockGame/BlockGameTask.jsx';
import { generatedPages as generatedPageRegistry } from './generated-pages/registry.js';


const SESSION_DURATION_MS = 60 * 60 * 1000;
const SESSION_CHECK_INTERVAL_MS = 1000;

const SESSION_ACTIVE_KEY = 'algo_vp_session_active';
const SESSION_DEADLINE_KEY = 'algo_vp_session_deadline';
const SESSION_EXPIRED_KEY = 'algo_vp_session_expired';

const MAIN_LOGIN_URL =
  import.meta.env.VITE_MAIN_LOGIN_URL ||
  'https://learn.algo.edu.vn';

function clearStoredLmsSession() {
  localStorage.removeItem('lms_student_email');
  localStorage.removeItem('lms_course_id');
  localStorage.removeItem('lms_supabase_url');
  localStorage.removeItem('lms_supabase_key');
  localStorage.removeItem('lms_access_token');
  localStorage.removeItem('lms_backend_url');
  localStorage.removeItem('lms_user_role');
}

function buildMainPlatformUrl(reason) {
  const separator = MAIN_LOGIN_URL.includes('?') ? '&' : '?';
  return `${MAIN_LOGIN_URL}${separator}session=${encodeURIComponent(reason)}`;
}

function getRouteFromUrl() {
  const params = new URLSearchParams(window.location.search);

  return {
    courseId: params.get('course') || '',
    lessonId: params.get('lesson') || '',
    pageId: params.get('page') || '',
    h5pActivityId: params.get('h5p') || '',
  };
}


export default function App() {
  const initialRoute = getRouteFromUrl();

  const [courseId, setCourseId] = useState(initialRoute.courseId);
  const [lessonId, setLessonId] = useState(initialRoute.lessonId);
  const [pageId, setPageId] = useState(initialRoute.pageId);

  // H5P state
  const [h5pActivity, setH5pActivity] = useState(null);

  // Role checking state
  const [role, setRole] = useState('student');
  const [loadingRole, setLoadingRole] = useState(true);
  const [lessonAccess, setLessonAccess] = useState({ route: '', status: 'checking' });
  const sessionRedirectStartedRef = useRef(false);


  const GeneratedPage = useMemo(() => {
    const pageLoader = generatedPageRegistry?.[courseId]?.[lessonId]?.[pageId];
    if (!pageLoader) return null;
    return lazy(pageLoader);
  }, [courseId, lessonId, pageId]);

  useEffect(() => {
    // Wait for the portal's verified postMessage handoff instead of redirecting
    // before the identity and JWT have arrived.
    if (window.__algoSecureLmsHandoffPending) return;
    const params = new URLSearchParams(window.location.search);

    const email = params.get('studentEmail');
    const incomingCourseId = params.get('courseId');
    const supabaseUrl = params.get('supabaseUrl');
    const supabaseKey = params.get('supabaseKey');
    const accessToken = params.get('accessToken');
    const backendUrl = params.get('backendUrl');

    const normalizedEmail = email?.trim().toLowerCase() || '';

    const hasIncomingSession = Boolean(
      normalizedEmail &&
      supabaseUrl &&
      supabaseKey,
    );

    function redirectToMainPlatform(reason) {
      if (sessionRedirectStartedRef.current) {
        return;
      }

      sessionRedirectStartedRef.current = true;

      clearStoredLmsSession();

      sessionStorage.removeItem(SESSION_ACTIVE_KEY);
      sessionStorage.removeItem(SESSION_DEADLINE_KEY);

      if (reason === 'expired') {
        sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
      }

      window.location.replace(
        buildMainPlatformUrl(reason),
      );
    }

    if (hasIncomingSession) {
      localStorage.setItem(
        'lms_student_email',
        normalizedEmail,
      );

      localStorage.removeItem(
        'lms_user_role',
      );

      if (incomingCourseId) {
        localStorage.setItem(
          'lms_course_id',
          incomingCourseId,
        );
      }

      localStorage.setItem(
        'lms_supabase_url',
        supabaseUrl,
      );

      localStorage.setItem(
        'lms_supabase_key',
        supabaseKey,
      );

      if (accessToken) {
        localStorage.setItem(
          'lms_access_token',
          accessToken,
        );
      } else {
        localStorage.removeItem(
          'lms_access_token',
        );
      }

      if (backendUrl) {
        localStorage.setItem(
          'lms_backend_url',
          backendUrl,
        );
      } else {
        localStorage.removeItem(
          'lms_backend_url',
        );
      }

      sessionStorage.setItem(
        SESSION_ACTIVE_KEY,
        '1',
      );

      sessionStorage.setItem(
        SESSION_DEADLINE_KEY,
        String(Date.now() + SESSION_DURATION_MS),
      );

      sessionStorage.removeItem(
        SESSION_EXPIRED_KEY,
      );

      sessionRedirectStartedRef.current = false;
    } else {
      const hasActiveSession =
        sessionStorage.getItem(
          SESSION_ACTIVE_KEY,
        ) === '1';

      if (!hasActiveSession) {
        redirectToMainPlatform('required');
        return;
      }

      const storedRole =
        localStorage.getItem('lms_user_role') ||
        '';

      const enforceDeadline =
        storedRole !== 'teacher' &&
        storedRole !== 'admin';

      const storedDeadlineValue =
        sessionStorage.getItem(
          SESSION_DEADLINE_KEY,
        );

      const storedDeadline = storedDeadlineValue
        ? Number(storedDeadlineValue)
        : Number.NaN;

      const sessionExpired =
        sessionStorage.getItem(
          SESSION_EXPIRED_KEY,
        ) === '1' ||
        (
          enforceDeadline &&
          (
            !Number.isFinite(storedDeadline) ||
            storedDeadline <= Date.now()
          )
        );

      if (sessionExpired) {
        redirectToMainPlatform('expired');
        return;
      }
    }

    // Remove transferred credentials from the browser address bar
    // after they have been stored locally.
    if (window.location.search) {
      const cleanUrl =
        window.location.protocol +
        '//' +
        window.location.host +
        window.location.pathname;

      window.history.replaceState(
        { path: cleanUrl },
        '',
        cleanUrl,
      );
    }

    const activeEmail =
      normalizedEmail ||
      localStorage.getItem(
        'lms_student_email',
      ) ||
      '';

    const activeUrl =
      supabaseUrl ||
      localStorage.getItem(
        'lms_supabase_url',
      ) ||
      '';

    const activeKey =
      supabaseKey ||
      localStorage.getItem(
        'lms_supabase_key',
      ) ||
      '';

    const activeToken =
      accessToken ||
      localStorage.getItem(
        'lms_access_token',
      ) ||
      activeKey;

    if (!activeEmail || !activeUrl || !activeKey) {
      redirectToMainPlatform('required');
      return;
    }

    async function determineRole() {
      let parsedRole = 'student';

      try {
        // 1. Try user_profiles table.
        const profileUrl =
          `${activeUrl}/rest/v1/user_profiles` +
          `?email=eq.${encodeURIComponent(activeEmail)}` +
          '&select=role';

        const profileRes = await fetch(
          profileUrl,
          {
            headers: {
              apikey: activeKey,
              Authorization:
                `Bearer ${activeToken}`,
            },
          },
        );

        if (profileRes.ok) {
          const profileData =
            await profileRes.json();

          if (
            Array.isArray(profileData) &&
            profileData[0]?.role
          ) {
            parsedRole = String(
              profileData[0].role,
            )
              .toLowerCase()
              .trim();
          }
        } else {
          console.warn(
            'LMS user_profiles check returned:',
            profileRes.status,
          );
        }
      } catch (error) {
        console.warn(
          'LMS user_profiles check failed:',
          error,
        );
      }

      // 2. Fallback: check teacher membership.
      if (parsedRole === 'student') {
        try {
          const memberUrl =
            `${activeUrl}/rest/v1/classroom_course_members` +
            `?email=eq.${encodeURIComponent(activeEmail)}` +
            '&role=eq.teacher' +
            '&select=role' +
            '&limit=1';

          const memberRes = await fetch(
            memberUrl,
            {
              headers: {
                apikey: activeKey,
                Authorization:
                  `Bearer ${activeToken}`,
              },
            },
          );

          if (memberRes.ok) {
            const memberData =
              await memberRes.json();

            if (
              Array.isArray(memberData) &&
              memberData.length > 0
            ) {
              parsedRole = 'teacher';
            }
          } else {
            console.warn(
              'LMS classroom_course_members check returned:',
              memberRes.status,
            );
          }
        } catch (error) {
          console.warn(
            'LMS classroom_course_members check failed:',
            error,
          );
        }
      }

      // 3. Existing fallback heuristics.
      if (parsedRole === 'student') {
        const emailLower =
          activeEmail.toLowerCase();

        if (
          emailLower.includes('teacher') ||
          emailLower.includes('academic') ||
          emailLower.includes('kevin')
        ) {
          parsedRole = 'teacher';
        } else if (
          emailLower.includes('admin')
        ) {
          parsedRole = 'admin';
        }
      }

      console.log(
        'LMS final parsed user role:',
        parsedRole,
      );

      localStorage.setItem(
        'lms_user_role',
        parsedRole,
      );

      setRole(parsedRole);
      setLoadingRole(false);
    }

    void determineRole();
  }, []);

  useEffect(() => {
    if (loadingRole || role !== 'student') {
      return;
    }

    sessionRedirectStartedRef.current = false;

    function redirectExpiredSession() {
      if (sessionRedirectStartedRef.current) {
        return;
      }

      sessionRedirectStartedRef.current = true;

      clearStoredLmsSession();

      sessionStorage.removeItem(SESSION_ACTIVE_KEY);
      sessionStorage.removeItem(SESSION_DEADLINE_KEY);
      sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');

      window.location.replace(
        buildMainPlatformUrl('expired'),
      );
    }

    const storedDeadline = Number(
      sessionStorage.getItem(
        SESSION_DEADLINE_KEY,
      ),
    );

    if (
      sessionStorage.getItem(
        SESSION_ACTIVE_KEY,
      ) !== '1' ||
      !Number.isFinite(storedDeadline)
    ) {
      redirectExpiredSession();
      return;
    }

    function checkSessionDeadline() {
      if (Date.now() >= storedDeadline) {
        redirectExpiredSession();
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState === 'visible'
      ) {
        checkSessionDeadline();
      }
    }

    checkSessionDeadline();

    const intervalId = window.setInterval(
      checkSessionDeadline,
      SESSION_CHECK_INTERVAL_MS,
    );

    window.addEventListener(
      'focus',
      checkSessionDeadline,
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(intervalId);

      window.removeEventListener(
        'focus',
        checkSessionDeadline,
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );
    };
  }, [loadingRole, role]);

  useEffect(() => {
    function handlePopState() {
      const nextRoute = getRouteFromUrl();

      setCourseId(nextRoute.courseId);
      setLessonId(nextRoute.lessonId);
      setPageId(nextRoute.pageId);

      // If no h5p param in URL, clear h5p state
      if (!nextRoute.h5pActivityId) {
        setH5pActivity(null);
      }
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  function openCourse(nextCourseId) {
    const nextUrl = `/?course=${encodeURIComponent(nextCourseId)}`;

    window.history.pushState({}, '', nextUrl);
    setCourseId(nextCourseId);
    setLessonId('');
    setPageId('');
    setH5pActivity(null);
  }

  function openLesson(nextLesson) {
    const nextLessonId = typeof nextLesson === 'string'
      ? nextLesson
      : nextLesson?.id || nextLesson?.lessonId || '';

    if (!nextLessonId) return;

    const nextUrl = `/?course=${encodeURIComponent(courseId)}&lesson=${encodeURIComponent(nextLessonId)}`;

    window.history.pushState({}, '', nextUrl);
    setLessonId(nextLessonId);
    setPageId('');
    setH5pActivity(null);
  }



  function openH5pActivity(activity) {
    if (!activity) return;

    const nextUrl = `/?course=${encodeURIComponent(courseId)}&h5p=${encodeURIComponent(activity.id)}`;

    window.history.pushState({}, '', nextUrl);
    setH5pActivity(activity);
    setLessonId('');
    setPageId('');
  }

  function backToCourseCatalog() {
    window.history.pushState({}, '', '/');
    setCourseId('');
    setLessonId('');
    setPageId('');
    setH5pActivity(null);
  }

  function backToLessonCatalog() {
    const nextUrl = `/?course=${encodeURIComponent(courseId)}`;

    window.history.pushState({}, '', nextUrl);
    setLessonId('');
    setPageId('');
    setH5pActivity(null);
  }



  function openPageFromDashboard(moduleId, pageId) {
    const nextUrl = `/?course=${encodeURIComponent(courseId || 'VP2')}&lesson=${encodeURIComponent(moduleId)}&page=${encodeURIComponent(pageId)}`;
    window.history.pushState({}, '', nextUrl);
    setCourseId(courseId || 'VP2');
    setLessonId(moduleId);
    setPageId(pageId);
  }

  // ─── Role Check redirects ──────────────────────────
  // Check direct page URLs as well as dashboard buttons; a locked VP2
  // lesson must not be accessible by typing its generated-page address.
  // This check is isolated to the VP2 LMS (never reads schedules for VP).
  useEffect(() => {
    if (!pageId || loadingRole || role !== 'student') return;
    const route = `${courseId}/${lessonId}/${pageId}`;
    let cancelled = false;
    setLessonAccess({ route, status: 'checking' });
    async function verify() {
      try {
        if (courseId !== 'VP2') throw new Error('Unknown VP2 course route');
        const email = localStorage.getItem('lms_student_email') || '';
        const [lessonNumber, highestUnlocked] = await Promise.all([
          getVp2PageLessonNumber(pageId),
          getVp2UnlockedLessonLimit(email),
        ]);
        if (!cancelled) {
          setLessonAccess({
            route,
            status: lessonNumber && lessonNumber <= highestUnlocked ? 'allowed' : 'denied',
          });
        }
      } catch (error) {
        console.warn('VP2 page access verification failed:', error);
        if (!cancelled) {
          try {
            const lessonNum = await getVp2PageLessonNumber(pageId);
            setLessonAccess({
              route,
              status: lessonNum && lessonNum <= 2 ? 'allowed' : 'denied',
            });
          } catch {
            setLessonAccess({ route, status: 'denied' });
          }
        }
      }
    }
    void verify();
    return () => { cancelled = true; };
  }, [courseId, lessonId, pageId, loadingRole, role]);

  const params = new URLSearchParams(window.location.search);
  const gameParam = params.get('game');
  if (gameParam) {
    return (
      <BlockGameTask
        standalone
        initialLevelId={gameParam === 'plants' ? 'plant_level_1' : 'mars_level_7'}
        onTaskCompleted={(res) => console.log('Game level completed:', res)}
      />
    );
  }

  if (loadingRole) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'Nunito, Arial, sans-serif',
        background: '#faf8ff',
        color: '#7c22d4'
      }}>
        <h2>Getting your learning space ready...</h2>
        <p>Please wait a moment.</p>
      </div>
    );
  }

  // Render TeacherDashboard only if they are not currently previewing a specific page
  if ((role === 'teacher' || role === 'admin') && !pageId) {
    return <TeacherDashboard />;
  }

  // ─── H5P Player view ────────────────────────────────
  if (h5pActivity && courseId) {
    return (
      <H5pPlayerPage
        activity={h5pActivity}
        courseId={courseId}
        onBack={() => {
          if (h5pActivity?.moduleId) {
            const nextUrl = `/?course=${encodeURIComponent(courseId)}&lesson=${encodeURIComponent(h5pActivity.moduleId)}`;
            window.history.pushState({}, '', nextUrl);
            setLessonId(h5pActivity.moduleId);
            setH5pActivity(null);
            setPageId('');
          } else {
            backToLessonCatalog();
          }
        }}
        onBackToCourses={backToCourseCatalog}
      />
    );
  }

  if (!courseId) {
    return (
      <Dashboard
        onOpenCourse={openCourse}
        onOpenPage={openPageFromDashboard}
        initialCourseId=""
      />
    );
  }

  if (!lessonId || !pageId) {
    return (
      <Dashboard
        onOpenCourse={openCourse}
        onOpenPage={openPageFromDashboard}
        initialCourseId={courseId}
      />
    );
  }

  if (pageId && role === 'student') {
    const route = `${courseId}/${lessonId}/${pageId}`;
    const status = lessonAccess.route === route ? lessonAccess.status : 'checking';
    if (status === 'checking') {
      return (
        <main style={{ padding: 36, fontFamily: 'Nunito, Arial, sans-serif', textAlign: 'center' }}>
          <h2>Verifying lesson access...</h2>
        </main>
      );
    }
    if (status !== 'allowed') {
      return (
        <main style={{ padding: 36, fontFamily: 'Nunito, Arial, sans-serif', textAlign: 'center' }}>
          <h2>Lesson Locked</h2>
          <p>This VP2 lesson has not been scheduled for your account.</p>
          <button type="button" onClick={backToLessonCatalog}>Back to lessons</button>
        </main>
      );
    }
  }

  if (GeneratedPage) {
    return (
      <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>}>
        <GeneratedPage
          courseId={courseId}
          lessonId={lessonId}
          pageId={pageId}
          onBackToPages={backToLessonCatalog}
          onBackToLessons={backToLessonCatalog}
          onBackToCourses={backToCourseCatalog}
        />
      </Suspense>
    );
  }

  return (
    <main
      className="empty-screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
      }}
    >
      <h1>404 - Page Not Found</h1>
      <p>
        The requested page <strong>{pageId}</strong> could not be found.
      </p>

      <button
        type="button"
        onClick={backToCourseCatalog}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Back to Dashboard
      </button>
    </main>
  );
}