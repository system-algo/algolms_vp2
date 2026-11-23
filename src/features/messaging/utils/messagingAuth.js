import { supabase } from '../../../supabaseClient.js';

/**
 * Checks if a user is permitted to use messaging during the current rollout phase.
 * Admin: always allowed.
 * Teacher & Student: only allowed for accounts 'ptsy1.test.stu' and 'ptsy1.test.tch'.
 */
export function isMessagingAllowedForUser(emailOrUsername, role) {
  if (role === 'admin') return true;
  const raw = String(emailOrUsername || '').trim().toLowerCase();
  const username = raw.replace(/@algo\.edu\.vn$/i, '');
  return (
    username === 'ptsy1.test.stu' ||
    username === 'ptsy1.test.tch' ||
    username === 'ptpy1.test.stu' ||
    username === 'ptpy1.test.tch' ||
    username === 'ugd.test.stu' ||
    username === 'ugd.test.tch' ||
    raw.startsWith('ptsy1.test.stu@') ||
    raw.startsWith('ptsy1.test.tch@') ||
    raw.startsWith('ptpy1.test.stu@') ||
    raw.startsWith('ptpy1.test.tch@') ||
    raw.startsWith('ugd.test.stu@') ||
    raw.startsWith('ugd.test.tch@')
  );
}

/**
 * Get the list of teacher profiles that teach the courses this student is enrolled in.
 * Student can ONLY direct chat with these teachers.
 */
export async function getStudentTeachers(studentEmail, studentUserId) {
  try {
    const emailNorm = String(studentEmail || '').trim().toLowerCase();

    // 1. Get courses student is enrolled in
    const { data: studentEnrollments } = await supabase
      .from('classroom_course_members')
      .select('course_id')
      .ilike('email', emailNorm)
      .eq('role', 'student');

    const courseIds = Array.from(
      new Set((studentEnrollments || []).map((r) => r.course_id).filter(Boolean)),
    );

    // Fallback: if student has no explicit classroom_course_members, check PTSY1/PTPY1 if student is test account
    if (courseIds.length === 0 && emailNorm.includes('ptsy1.test.stu')) {
      courseIds.push('PTSY1', 'course-ptsy1', 'ptsy1');
    }
    if (courseIds.length === 0 && emailNorm.includes('ptpy1.test.stu')) {
      courseIds.push('PTPY1', 'course-ptpy1', 'ptpy1');
    }
    if (courseIds.length === 0 && emailNorm.includes('ugd.test.stu')) {
      courseIds.push('UGD', 'course-ugd', 'ugd');
    }

    if (courseIds.length === 0) {
      return [];
    }

    // 2. Get teachers for those courses
    const { data: teacherMembers } = await supabase
      .from('classroom_course_members')
      .select('email, name, course_id, course_display_name')
      .in('course_id', courseIds)
      .eq('role', 'teacher');

    const teacherEmails = Array.from(
      new Set(
        (teacherMembers || [])
          .map((r) => String(r.email || '').trim().toLowerCase())
          .filter(Boolean),
      ),
    );

    // If teacher is ptsy1.test.tch / ptpy1.test.tch, ensure it's in the list for test accounts
    if (emailNorm.includes('ptsy1.test.stu') && !teacherEmails.some((e) => e.includes('ptsy1.test.tch'))) {
      teacherEmails.push('ptsy1.test.tch@algo.edu.vn', 'ptsy1.test.tch');
    }
    if (emailNorm.includes('ptpy1.test.stu') && !teacherEmails.some((e) => e.includes('ptpy1.test.tch'))) {
      teacherEmails.push('ptpy1.test.tch@algo.edu.vn', 'ptpy1.test.tch');
    }
    if (emailNorm.includes('ugd.test.stu') && !teacherEmails.some((e) => e.includes('ugd.test.tch'))) {
      teacherEmails.push('ugd.test.tch@algo.edu.vn', 'ugd.test.tch');
    }

    if (teacherEmails.length === 0) {
      return [];
    }

    // 3. Get profiles of these teachers
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email, name, username, role')
      .or(teacherEmails.map((e) => `email.ilike.${e},username.ilike.${e.replace(/@algo\.edu\.vn$/i, '')}`).join(','));

    if (profiles && profiles.length > 0) {
      return profiles.map((p) => ({
        user_id: p.id,
        email: p.email || '',
        display_name: p.name || p.username || p.email || 'Teacher',
        role: 'teacher',
        shared_channel_count: 1,
      }));
    }

    // Fallback if profiles not yet created in user_profiles
    return teacherEmails.map((email) => ({
      user_id: `teacher-${email}`,
      email,
      display_name: email.replace(/@algo\.edu\.vn$/i, ''),
      role: 'teacher',
      shared_channel_count: 1,
    }));
  } catch (err) {
    console.warn('Error fetching student teachers:', err);
    return [];
  }
}

/**
 * Ensures an automated class chat room exists for a course with all teachers and students.
 * Group name = course title or class name.
 */
export async function ensureClassroomGroupChat(courseId, courseTitle) {
  if (!courseId) return null;
  try {
    const roomName = String(courseTitle || courseId).trim();

    // 1. Get or pick community (e.g. community with code PTSY1 or GENERAL)
    const { data: communities } = await supabase
      .from('messaging_communities')
      .select('id, code')
      .eq('is_active', true);

    const matchingComm = (communities || []).find(
      (c) =>
        String(courseId).toUpperCase().includes(c.code.toUpperCase()) ||
        roomName.toUpperCase().includes(c.code.toUpperCase()),
    );
    const communityId = matchingComm?.id || communities?.[0]?.id || '00000000-0000-0000-0000-000000000001';

    // 2. Check if channel already exists with this class name
    let { data: channel } = await supabase
      .from('messaging_channels')
      .select('id, name, community_id')
      .eq('name', roomName)
      .maybeSingle();

    if (!channel) {
      const { data: newCh, error: createErr } = await supabase
        .from('messaging_channels')
        .insert({
          community_id: communityId,
          name: roomName,
          channel_type: 'class',
          description: `Class chat room for ${roomName}`,
          status: 'active',
        })
        .select('id, name, community_id')
        .single();

      if (!createErr && newCh) {
        channel = newCh;
      }
    }

    if (!channel?.id) return null;

    // 3. Find all enrolled teachers and students for this course
    const { data: courseMembers } = await supabase
      .from('classroom_course_members')
      .select('email, role')
      .eq('course_id', courseId);

    const memberEmails = (courseMembers || []).map((m) =>
      String(m.email || '').trim().toLowerCase(),
    );

    // If PTSY1 or PTPY1, ensure test accounts are included
    if (String(courseId).toUpperCase().includes('PTSY1')) {
      if (!memberEmails.some((e) => e.includes('ptsy1.test.stu'))) {
        memberEmails.push('ptsy1.test.stu@algo.edu.vn', 'ptsy1.test.stu');
      }
      if (!memberEmails.some((e) => e.includes('ptsy1.test.tch'))) {
        memberEmails.push('ptsy1.test.tch@algo.edu.vn', 'ptsy1.test.tch');
      }
    }
    if (String(courseId).toUpperCase().includes('PTPY1')) {
      if (!memberEmails.some((e) => e.includes('ptpy1.test.stu'))) {
        memberEmails.push('ptpy1.test.stu@algo.edu.vn', 'ptpy1.test.stu');
      }
      if (!memberEmails.some((e) => e.includes('ptpy1.test.tch'))) {
        memberEmails.push('ptpy1.test.tch@algo.edu.vn', 'ptpy1.test.tch');
      }
    }
    if (String(courseId).toUpperCase().includes('UGD')) {
      if (!memberEmails.some((e) => e.includes('ugd.test.stu'))) {
        memberEmails.push('ugd.test.stu@algo.edu.vn', 'ugd.test.stu');
      }
      if (!memberEmails.some((e) => e.includes('ugd.test.tch'))) {
        memberEmails.push('ugd.test.tch@algo.edu.vn', 'ugd.test.tch');
      }
    }

    if (memberEmails.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email, username')
        .or(memberEmails.map((e) => `email.ilike.${e},username.ilike.${e.replace(/@algo\.edu\.vn$/i, '')}`).join(','));

      const memberIds = (profiles || []).map((p) => p.id);
      if (memberIds.length > 0) {
        const rows = memberIds.map((uid) => ({
          channel_id: channel.id,
          user_id: uid,
          status: 'active',
        }));
        await supabase
          .from('messaging_channel_members')
          .upsert(rows, { onConflict: 'channel_id, user_id' });
      }
    }

    return channel;
  } catch (err) {
    console.warn('Failed to ensure classroom group chat:', err);
    return null;
  }
}

export const TEST_ACCOUNT_UUIDS = {
  'ptsy1.test.stu@algo.edu.vn': '10000000-0000-0000-0000-000000000001',
  'ptsy1.test.tch@algo.edu.vn': '10000000-0000-0000-0000-000000000002',
  'ptpy1.test.stu@algo.edu.vn': '10000000-0000-0000-0000-000000000003',
  'ptpy1.test.tch@algo.edu.vn': '10000000-0000-0000-0000-000000000004',
  'ugd.test.stu@algo.edu.vn': '10000000-0000-0000-0000-000000000005',
  'ugd.test.tch@algo.edu.vn': '10000000-0000-0000-0000-000000000006',
  'ptsy1.test.stu': '10000000-0000-0000-0000-000000000001',
  'ptsy1.test.tch': '10000000-0000-0000-0000-000000000002',
  'ptpy1.test.stu': '10000000-0000-0000-0000-000000000003',
  'ptpy1.test.tch': '10000000-0000-0000-0000-000000000004',
  'ugd.test.stu': '10000000-0000-0000-0000-000000000005',
  'ugd.test.tch': '10000000-0000-0000-0000-000000000006',
};

export function toDeterministicUuid(str) {
  if (!str) return '00000000-0000-0000-0000-000000000099';
  const clean = String(str).trim().toLowerCase();
  if (TEST_ACCOUNT_UUIDS[clean]) return TEST_ACCOUNT_UUIDS[clean];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    return clean;
  }
  let hash1 = 0x811c9dc5;
  let hash2 = 0x4f1bbcd1;
  let hash3 = 0x2e35a1a9;
  let hash4 = 0x9e3779b9;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 0x01000193) >>> 0;
    hash2 = Math.imul(hash2 ^ ch, 0x050c5d1f) >>> 0;
    hash3 = Math.imul(hash3 ^ ch, 0x0711b7d5) >>> 0;
    hash4 = Math.imul(hash4 ^ ch, 0x091b3b29) >>> 0;
  }
  const hex = (
    hash1.toString(16).padStart(8, '0') +
    hash2.toString(16).padStart(8, '0') +
    hash3.toString(16).padStart(8, '0') +
    hash4.toString(16).padStart(8, '0')
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
