function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getSupabaseCredentials() {
  const supabaseUrl =
    sessionStorage.getItem('lms_supabase_url') ||
    localStorage.getItem('lms_supabase_url');
  const supabaseKey =
    sessionStorage.getItem('lms_supabase_key') ||
    localStorage.getItem('lms_supabase_key');
  const studentEmail = normalizeEmail(
    sessionStorage.getItem('lms_student_email') ||
      localStorage.getItem('lms_student_email'),
  );

  return { supabaseUrl, supabaseKey, studentEmail };
}

function getSupabaseHeaders(supabaseKey) {
  const accessToken =
    sessionStorage.getItem('lms_access_token') ||
    localStorage.getItem('lms_access_token');
  const headers = {
    apikey: supabaseKey,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };

  if (accessToken && accessToken.split('.').length === 3) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

function getProgressUrl(supabaseUrl) {
  const conflictColumns = [
    'session_id',
    'course_id',
    'lesson_id',
    'page_id',
    'task_id',
  ].join(',');

  return `${supabaseUrl}/rest/v1/activity_progress?on_conflict=${encodeURIComponent(conflictColumns)}`;
}

function buildCompletionRecord({
  studentEmail,
  courseId,
  lessonId,
  pageId,
  taskId,
  activityType = 'completion-sync',
}) {
  const normalizedEmail = normalizeEmail(studentEmail);
  const timestamp = new Date().toISOString();

  return {
    session_id: `user:${normalizedEmail}`,
    user_id: normalizedEmail,
    course_id: String(courseId || ''),
    lesson_id: String(lessonId || ''),
    page_id: String(pageId || ''),
    task_id: String(taskId || ''),
    activity_type: activityType,
    status: 'completed',
    is_completed: true,
    completion_type: 'completed',
    completed_at: timestamp,
    updated_at: timestamp,
  };
}

/**
 * Save a single task completion to Supabase activity_progress table.
 * The authenticated RLS policy requires the stable user session id and the
 * current user to be a member of the referenced course.
 */
export async function saveTaskCompletionToSupabase({
  courseId,
  lessonId,
  pageId,
  taskId,
  activityType = 'completion-sync',
}) {
  const { supabaseUrl, supabaseKey, studentEmail } = getSupabaseCredentials();
  if (!supabaseUrl || !supabaseKey || !studentEmail || !taskId) return;

  const body = JSON.stringify(
    buildCompletionRecord({
      studentEmail,
      courseId,
      lessonId,
      pageId,
      taskId,
      activityType,
    }),
  );

  try {
    const res = await fetch(getProgressUrl(supabaseUrl), {
      method: 'POST',
      headers: getSupabaseHeaders(supabaseKey),
      body,
    });

    if (!res.ok) {
      console.warn(
        '[SupabaseProgress] Failed to save progress:',
        res.status,
        await res.text(),
      );
    } else {
      console.log(
        '[SupabaseProgress] Successfully saved task progress to Supabase:',
        { studentEmail, pageId, taskId },
      );
    }
  } catch (err) {
    console.warn('[SupabaseProgress] Error saving progress to Supabase:', err);
  }
}

/**
 * Sync all local completed tasks from localStorage to Supabase activity_progress.
 * Disabled to prevent cross-account progress pollution.
 */
export async function syncLocalStorageToSupabase() {
  return;
}
