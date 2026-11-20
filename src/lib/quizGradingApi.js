// VP2 quiz grading is authoritative on the LMS backend.
// The backend retrieves correct answers from Supabase activity_answer_keys;
// the browser submits its selection only, never a claimed score or correctness.
export async function submitQuizAttempt(baseUrl, payload) {
  const accessToken =
    sessionStorage.getItem('lms_access_token') ||
    localStorage.getItem('lms_access_token');

  if (!accessToken) {
    throw new Error('Please sign in to submit your answer.');
  }

  const response = await fetch(`${baseUrl}/api/activity-attempts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok !== true || !data?.result) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Your session may have expired. Please sign in again.');
    }
    throw new Error('Cannot check your answer now. Please try again.');
  }

  return data.result;
}
