(() => {
  const bucket = 'vp2-scratch-drafts';
  const read = (key) => sessionStorage.getItem(key) || localStorage.getItem(key);
  const token = read('lms_access_token');
  const base = read('lms_supabase_url')?.replace(/\/+$/, '');
  const apiKey = read('lms_supabase_key');
  const params = new URLSearchParams(location.search);
  const scope = params.get('draftScope');
  const lesson = params.get('draftLesson');
  const page = params.get('draftPage');
  const task = params.get('draftTask');
  if (!scope || !lesson || !page || !task || !token || !base || !apiKey) return;

  function tokenSubject(value) {
    try {
      return JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
    } catch {
      return '';
    }
  }
  const uid = tokenSubject(token);
  if (!/^[\da-f-]{36}$/i.test(uid)) return;

  const object = `${base}/storage/v1/object`;
  const path = `${bucket}/${uid}/${encodeURIComponent(scope)}.sb3`;
  const headers = () => {
    const current = read('lms_access_token');
    if (tokenSubject(current) !== uid) throw new Error('Student session changed');
    return { apikey: apiKey, Authorization: `Bearer ${current}` };
  };
  let cloudHash;
  const hash = async (buffer) => Array.from(new Uint8Array(
    await crypto.subtle.digest('SHA-256', buffer),
  ), (byte) => byte.toString(16).padStart(2, '0')).join('');

  window.vp2ScratchDraft = {
    localKey: `vp2:${uid}:${scope}`,
    get cloudHash() { return cloudHash; },
    async restore(local) {
      const response = await fetch(`${object}/authenticated/${path}`, {
        headers: headers(), cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      if (response.status === 404) {
        cloudHash = null;
        return local?.buffer;
      }
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        if (String(error.statusCode) === '404') {
          cloudHash = null;
          return local?.buffer;
        }
        throw new Error('Could not obtain the saved project');
      }
      const buffer = await response.arrayBuffer();
      cloudHash = await hash(buffer);
      return local?.cloudHash === cloudHash ? local.buffer : buffer;
    },
    async save(buffer) {
      const auth = headers();
      if (cloudHash === undefined) throw new Error('Restore the online draft before saving');
      const response = await fetch(`${object}/${path}`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/octet-stream', 'x-upsert': 'true' },
        body: buffer,
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw new Error('Project upload failed');
      cloudHash = await hash(buffer);

      const progress = await fetch(`${base}/rest/v1/rpc/save_vp2_scratch_progress`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_lesson_id: lesson, p_page_id: page, p_task_id: task }),
        signal: AbortSignal.timeout(15000),
      });
      if (!progress.ok) throw new Error('Progress sync failed');
    },
  };
})();
