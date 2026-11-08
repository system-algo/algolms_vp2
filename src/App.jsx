import { getMainPlatformUrl } from './lib/authConfig';
import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import { getVp2UnlockedLessonLimit, getVp2PageLessonNumber } from './lib/vp2LessonAccess.js';
import H5pPlayerPage from './pages/H5pPlayerPage.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import BlockGameTask from './components/BlockGame/BlockGameTask.jsx';
import ScratchTask from './activities/ScratchTask.jsx';
import GeneratedPageShell from './templates/GeneratedPageShell.jsx';
import { generatedPages as generatedPageRegistry } from './generated-pages/registry.js';
import { installTabIsolatedLmsStorage } from './security/secureLmsHandoffReceiver.js';

installTabIsolatedLmsStorage();

// Synchronously persist session query parameters on first load (e.g. incognito window or direct URL redirect)
(function initSessionFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('studentEmail') || params.get('email');
    const incomingCourseId = params.get('courseId');
    const supabaseUrl = params.get('supabaseUrl');
    const supabaseKey = params.get('supabaseKey');
    const accessToken = params.get('accessToken');
    const backendUrl = params.get('backendUrl');

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      localStorage.setItem('lms_student_email', normalizedEmail);
      localStorage.setItem('lms_user_email', normalizedEmail);
    }
    if (incomingCourseId) localStorage.setItem('lms_course_id', incomingCourseId);
    if (supabaseUrl) localStorage.setItem('lms_supabase_url', supabaseUrl);
    if (supabaseKey) localStorage.setItem('lms_supabase_key', supabaseKey);
    if (accessToken) {
      localStorage.setItem('lms_access_token', accessToken);
      sessionStorage.setItem('lms_access_token', accessToken);
    }
    if (backendUrl) localStorage.setItem('lms_backend_url', backendUrl);
  } catch {}
})();

function getRouteFromUrl() {
  const params = new URLSearchParams(window.location.search);
  let courseId = params.get('course') || '';

  if (!courseId && typeof window !== 'undefined') {
    const host = window.location.hostname;
    const sub = host.split('.')[0].toUpperCase();
    if (['CK', 'VP', 'VP2', 'DL', 'GD', 'WD', 'PTSY1', 'PTSY2', 'PTPY1', 'PTPY2', 'FED', 'CS50X', 'CS50P'].includes(sub)) {
      courseId = sub;
    }
  }

  const lessonFromUrl = params.get('lesson');
  const pageFromUrl = params.get('page');

  if (courseId) sessionStorage.setItem('lms_active_course', courseId);
  if (lessonFromUrl) sessionStorage.setItem('lms_active_lesson', lessonFromUrl);
  if (pageFromUrl) sessionStorage.setItem('lms_active_page', pageFromUrl);

  return {
    courseId: courseId || sessionStorage.getItem('lms_active_course') || 'VP2',
    lessonId: lessonFromUrl || sessionStorage.getItem('lms_active_lesson') || '',
    pageId: pageFromUrl || sessionStorage.getItem('lms_active_page') || '',
    h5pActivityId: params.get('h5p') || '',
  };
}

const CHILD_SESSION_DURATION_MS = 60 * 60 * 1000;
const CHILD_SESSION_CHECK_INTERVAL_MS = 1000;
const CHILD_SESSION_DEADLINE_KEY = 'algo_child_session_deadline';
const CHILD_SESSION_EXPIRED_KEY = 'algo_child_session_expired';

const MAIN_LOGIN_URL = getMainPlatformUrl();

function buildSupabaseHeaders(apiKey, accessToken) {
  const headers = {
    apikey: apiKey,
  };

  const normalizedToken = String(accessToken || '').trim();

  // Supabase publishable keys belong in the apikey header.
  // Only attach Authorization when a real JWT access token is available.
  if (
    normalizedToken &&
    normalizedToken !== apiKey &&
    normalizedToken.split('.').length === 3
  ) {
    headers.Authorization = `Bearer ${normalizedToken}`;
  } else if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
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
    const params = new URLSearchParams(window.location.search);

    const email = params.get('studentEmail');
    const incomingCourseId = params.get('courseId');
    const supabaseUrl = params.get('supabaseUrl');
    const supabaseKey = params.get('supabaseKey');
    const accessToken = params.get('accessToken');
    const backendUrl = params.get('backendUrl');

    const hasIncomingSessionPayload = Boolean(
      email ||
      incomingCourseId ||
      supabaseUrl ||
      supabaseKey ||
      accessToken ||
      backendUrl,
    );

    /*
     * Mỗi redirect mới từ trang chính sang project con
     * sẽ bắt đầu một deadline mới là 1 giờ.
     *
     * Refresh project con không reset deadline vì deadline
     * được giữ trong sessionStorage của project con.
     */
    if (hasIncomingSessionPayload) {
      const nextDeadline = Date.now() + CHILD_SESSION_DURATION_MS;

      sessionStorage.setItem(
        CHILD_SESSION_DEADLINE_KEY,
        String(nextDeadline),
      );

      sessionStorage.removeItem(
        CHILD_SESSION_EXPIRED_KEY,
      );

      sessionRedirectStartedRef.current = false;
    }

    if (email) {
      localStorage.setItem('lms_student_email', email);
      localStorage.setItem('lms_user_email', email);
    } else if (
      !localStorage.getItem('lms_student_email') &&
      !localStorage.getItem('lms_user_email')
    ) {
      localStorage.setItem('lms_student_email', 'guest@algo.edu.vn');
      localStorage.setItem('lms_user_email', 'guest@algo.edu.vn');
    }

    if (incomingCourseId) {
      localStorage.setItem('lms_course_id', incomingCourseId);
    }

    if (supabaseUrl) {
      localStorage.setItem('lms_supabase_url', supabaseUrl);
    }

    if (supabaseKey) {
      localStorage.setItem('lms_supabase_key', supabaseKey);
    }

    if (accessToken) {
      localStorage.setItem('lms_access_token', accessToken);
    }

    if (backendUrl) {
      localStorage.setItem('lms_backend_url', backendUrl);
    }

    /*
     * Chỉ xóa các param session/auth khỏi thanh địa chỉ,
     * giữ lại các param routing (course, lesson, page, h5p, game, scratch)
     * để reload hoặc copy link không bị mất state bài học.
     */
    if (window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);

      searchParams.delete('studentEmail');
      searchParams.delete('courseId');
      searchParams.delete('supabaseUrl');
      searchParams.delete('supabaseKey');
      searchParams.delete('accessToken');
      searchParams.delete('backendUrl');

      const remainingQuery = searchParams.toString();
      const cleanUrl =
        window.location.protocol +
        '//' +
        window.location.host +
        window.location.pathname +
        (remainingQuery ? `?${remainingQuery}` : '');

      if (cleanUrl !== window.location.href) {
        window.history.replaceState(
          { path: cleanUrl },
          '',
          cleanUrl,
        );
      }
    }

    const activeEmail =
      email ||
      localStorage.getItem('lms_student_email') ||
      localStorage.getItem('lms_user_email') ||
      'guest@algo.edu.vn';

    const activeUrl =
      supabaseUrl ||
      localStorage.getItem('lms_supabase_url');

    const activeKey =
      supabaseKey ||
      localStorage.getItem('lms_supabase_key');

    const activeToken =
      accessToken ||
      localStorage.getItem('lms_access_token') ||
      '';

    if (activeUrl && activeKey && activeEmail) {
      async function determineRole() {
        let parsedRole = 'student';

        try {
          const profileUrl =
            `${activeUrl}/rest/v1/user_profiles` +
            `?email=eq.${encodeURIComponent(activeEmail)}` +
            '&select=role';

          const profileRes = await fetch(
            profileUrl,
            {
              headers: buildSupabaseHeaders(
                activeKey,
                activeToken,
              ),
            },
          );

          if (profileRes.ok) {
            const profileData = await profileRes.json();

            if (
              profileData &&
              profileData[0] &&
              profileData[0].role
            ) {
              parsedRole = String(
                profileData[0].role,
              )
                .toLowerCase()
                .trim();
            }
          }
        } catch (error) {
          console.warn(
            'LMS user_profiles check failed:',
            error,
          );
        }

        /*
         * Fallback: kiểm tra người dùng có role teacher
         * trong classroom_course_members hay không.
         */
        if (parsedRole === 'student') {
          try {
            const memberUrl =
              `${activeUrl}/rest/v1/classroom_course_members` +
              `?email=eq.${encodeURIComponent(activeEmail)}` +
              '&role=eq.teacher&select=role';

            const memberRes = await fetch(
              memberUrl,
              {
                headers: buildSupabaseHeaders(
                  activeKey,
                  activeToken,
                ),
              },
            );

            if (memberRes.ok) {
              const memberData = await memberRes.json();

              if (
                Array.isArray(memberData) &&
                memberData.length > 0
              ) {
                parsedRole = 'teacher';
              }
            }
          } catch (error) {
            console.warn(
              'LMS classroom_course_members check failed:',
              error,
            );
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

      determineRole();
    } else {
      const parsedRole = 'student';

      console.log(
        'LMS final parsed user role (no authenticated role source):',
        parsedRole,
      );

      localStorage.setItem(
        'lms_user_role',
        parsedRole,
      );

      setRole(parsedRole);
      setLoadingRole(false);
    }
  }, []);

  /*
   * Timer riêng của project con.
   *
   * Chỉ chạy cho student.
   * Teacher và admin không bị timeout.
   */
  useEffect(() => {
    if (loadingRole || role !== 'student') {
      return;
    }

    sessionRedirectStartedRef.current = false;

    function redirectToMainLogin() {
      if (sessionRedirectStartedRef.current) {
        return;
      }

      sessionRedirectStartedRef.current = true;

      sessionStorage.removeItem(
        CHILD_SESSION_DEADLINE_KEY,
      );

      sessionStorage.setItem(
        CHILD_SESSION_EXPIRED_KEY,
        '1',
      );

      /*
       * Xóa thông tin đăng nhập đã được chuyển từ
       * trang chính sang project con.
       */
      localStorage.removeItem('lms_student_email');
      localStorage.removeItem('lms_course_id');
      localStorage.removeItem('lms_supabase_url');
      localStorage.removeItem('lms_supabase_key');
      localStorage.removeItem('lms_access_token');
      localStorage.removeItem('lms_backend_url');
      localStorage.removeItem('lms_user_role');
      localStorage.removeItem('lms_viewer_role');
      localStorage.removeItem('lms_user_email');
      localStorage.removeItem('lms_platform_origin');

      const separator = MAIN_LOGIN_URL.includes('?')
        ? '&'
        : '?';

      window.location.replace(
        `${MAIN_LOGIN_URL}${separator}session=expired`,
      );
    }

    /*
     * Nếu session đã hết, sử dụng nút Back không được
     * tự động bắt đầu thêm một giờ mới.
     *
     * Chỉ một redirect mới từ trang chính có query session
     * mới xóa expired marker.
     */
    if (
      sessionStorage.getItem(
        CHILD_SESSION_EXPIRED_KEY,
      ) === '1'
    ) {
      redirectToMainLogin();
      return;
    }

    const storedValue = sessionStorage.getItem(
      CHILD_SESSION_DEADLINE_KEY,
    );

    const storedDeadline = storedValue
      ? Number(storedValue)
      : Number.NaN;

    /*
     * Chưa có deadline thì bắt đầu tính một giờ
     * kể từ lúc student mở project con.
     */
    const deadline =
      Number.isFinite(storedDeadline) && storedDeadline > 0
        ? storedDeadline
        : Date.now() + CHILD_SESSION_DURATION_MS;

    if (!Number.isFinite(storedDeadline) || storedDeadline <= 0) {
      sessionStorage.setItem(
        CHILD_SESSION_DEADLINE_KEY,
        String(deadline),
      );
    }

    function checkSessionDeadline() {
      if (Date.now() >= deadline) {
        redirectToMainLogin();
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
      CHILD_SESSION_CHECK_INTERVAL_MS,
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
    sessionStorage.removeItem('lms_active_course');
    sessionStorage.removeItem('lms_active_lesson');
    sessionStorage.removeItem('lms_active_page');
    sessionStorage.removeItem('lms_active_task');
    window.history.pushState({}, '', '/');
    setCourseId('');
    setLessonId('');
    setPageId('');
    setH5pActivity(null);
  }

  function backToLessonCatalog() {
    sessionStorage.removeItem('lms_active_page');
    sessionStorage.removeItem('lms_active_task');
    const nextUrl = `/?course=${encodeURIComponent(courseId)}`;

    window.history.pushState({}, '', nextUrl);
    setLessonId('');
    setPageId('');
    setH5pActivity(null);
  }

  function openPageFromDashboard(moduleId, pageId) {
    const cId = courseId || 'VP2';
    sessionStorage.setItem('lms_active_course', cId);
    sessionStorage.setItem('lms_active_lesson', moduleId);
    sessionStorage.setItem('lms_active_page', pageId);
    sessionStorage.setItem('lms_active_task', '1');
    const nextUrl = `/?course=${encodeURIComponent(cId)}&lesson=${encodeURIComponent(moduleId)}&page=${encodeURIComponent(pageId)}&task=1`;
    window.history.pushState({}, '', nextUrl);
    setCourseId(cId);
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
        initialLevelId={params.get('level') || (gameParam === 'plants' ? 'plant_level_3' : 'mars_level_7')}
        onTaskCompleted={(res) => console.log('Game level completed:', res)}
      />
    );
  }

  const scratchParam = params.get('scratch');
  if (scratchParam) {
    const isDancing = scratchParam.toLowerCase().includes('dancing') || scratchParam.toLowerCase().includes('button');
    return (
      <ScratchTask
        task={{
          id: isDancing ? 'task-dancing' : 'task-potion',
          title: isDancing ? 'М2L4 button for dancing' : 'М2L4 Potion',
          description: isDancing
            ? 'Program the button to trigger dancing animation!'
            : 'You click on the Potion sprite, and a completely different sprite reacts. Look!',
        }}
        onTaskCompleted={(res) => console.log('Scratch task completed:', res)}
        onNextTask={() => alert('Chúc mừng bạn đã hoàn thành level!')}
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

  if (courseId && pageId) {
    return (
      <GeneratedPageShell
        manifestUrl={`/courses/${courseId}/${lessonId}/pages/${pageId}/manifest.json`}
        pageInstanceUrl={`/courses/${courseId}/${lessonId}/pages/${pageId}/page.instance.json`}
        courseId={courseId}
        lessonId={lessonId}
        pageId={pageId}
        onBackToPages={backToLessonCatalog}
        onBackToLessons={backToLessonCatalog}
        onBackToCourses={backToCourseCatalog}
      />
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
