// VP2 only: lesson files and unlock records are both scoped to VP2.
// Do not fall back to VP or read schedules from any other LMS course.
export const VP2_LMS_CODE = 'VP2';
const DEFAULT_UNLOCKED_LESSONS = 2;

function getCredentials() {
  return {
    url: localStorage.getItem('lms_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '',
    key: localStorage.getItem('lms_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    token: localStorage.getItem('lms_access_token') || sessionStorage.getItem('lms_access_token') || '',
  };
}

export async function getVp2UnlockedLessonLimit(studentEmail) {
  const email = String(studentEmail || '').trim().toLowerCase();
  const { url, key, token } = getCredentials();
  if (!url || !key || !email || !token || token.split('.').length !== 3) {
    return DEFAULT_UNLOCKED_LESSONS;
  }

  try {
    const endpoint = new URL(`${url.replace(/\/$/, '')}/rest/v1/student_lesson_schedules`);
    endpoint.searchParams.set('student_email', `eq.${email}`);
    endpoint.searchParams.set('lms_course_id', `eq.${VP2_LMS_CODE}`);
    endpoint.searchParams.set('select', 'topic_id');
    const response = await fetch(endpoint.toString(), {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return DEFAULT_UNLOCKED_LESSONS;
    const rows = await response.json();
    return (Array.isArray(rows) ? rows : []).reduce((highest, row) => {
      const lessonNumber = Number(row.topic_id);
      return Number.isInteger(lessonNumber) && lessonNumber > 0
        ? Math.max(highest, lessonNumber)
        : highest;
    }, DEFAULT_UNLOCKED_LESSONS);
  } catch (err) {
    console.warn('VP2 lesson schedule lookup error, falling back to default unlocked lessons:', err);
    return DEFAULT_UNLOCKED_LESSONS;
  }
}

function moduleNumber(id) {
  return Number(String(id || '').match(/M(\d+)/i)?.[1] || 999);
}
function lessonNumber(id) {
  return Number(String(id || '').match(/L(\d+)/i)?.[1] || 999);
}
function lessonKey(page) {
  const id = String(page?.id || page?.pageId || '');
  return String(page?.lessonId || id.match(/^(.+?_M\d+L\d+)(?:_|$)/i)?.[1] || '');
}

export async function getVp2PageLessonNumber(pageId) {
  const res = await fetch('/courses/VP2/index.json');
  if (!res.ok) throw new Error('VP2 course structure is unavailable.');
  const data = await res.json();
  const modules = [...(Array.isArray(data.lessons) ? data.lessons : [])]
    .sort((a, b) => moduleNumber(a.id) - moduleNumber(b.id));
  let globalNumber = 1;
  for (const module of modules) {
    const lessonEntries = Array.isArray(module.lessons) && module.lessons.length
      ? module.lessons.map(lesson => ({ id: String(lesson.id || lesson.lessonId), pages: lesson.pages || [] }))
      : [...new Set((module.pages || []).map(lessonKey).filter(Boolean))]
          .sort((a, b) => lessonNumber(a) - lessonNumber(b))
          .map(id => ({
            id,
            pages: (module.pages || []).filter(page => lessonKey(page) === id),
          }));
    for (const lesson of lessonEntries) {
      if (lesson.pages.some(p => String(p.id || p.pageId) === String(pageId))) {
        return globalNumber;
      }
      globalNumber += 1;
    }
  }
  return null;
}
