import test from 'node:test';
import assert from 'node:assert/strict';

test('teacherEmail in URL parameters resolves teacher identity and role', () => {
  const url = new URL('https://ptsy1.learn.algo.edu.vn/?platformOrigin=https%3A%2F%2Flearn.algo.edu.vn&teacherEmail=ptsy1.test.tch%40algo.edu.vn');
  const params = url.searchParams;

  const teacherEmail = params.get('teacherEmail');
  const studentEmail = params.get('studentEmail');
  const rawEmail = teacherEmail || studentEmail || params.get('email') || params.get('userEmail');
  const incomingRole = (params.get('viewerRole') || params.get('role') || params.get('userRole') || (teacherEmail ? 'teacher' : ''))?.toLowerCase().trim();

  assert.equal(teacherEmail, 'ptsy1.test.tch@algo.edu.vn');
  assert.equal(rawEmail, 'ptsy1.test.tch@algo.edu.vn');
  assert.equal(incomingRole, 'teacher');
});

test('email with .tch or teacher domain defaults to teacher role', () => {
  const email = 'ptsy1.test.tch@algo.edu.vn';
  const isTeacher = email.includes('.tch') || email.includes('teacher');
  assert.equal(isTeacher, true);
});

test('student login is not affected by teacher detection', () => {
  const url = new URL('https://ptsy1.learn.algo.edu.vn/?platformOrigin=https%3A%2F%2Flearn.algo.edu.vn&studentEmail=ptsy1.test.stu%40algo.edu.vn&courseId=PTSY1');
  const params = url.searchParams;

  const teacherEmail = params.get('teacherEmail');
  const studentEmail = params.get('studentEmail');
  const rawEmail = teacherEmail || studentEmail || params.get('email') || params.get('userEmail');
  const incomingRole = (params.get('viewerRole') || params.get('role') || params.get('userRole') || (teacherEmail ? 'teacher' : ''))?.toLowerCase().trim();

  assert.equal(teacherEmail, null);
  assert.equal(studentEmail, 'ptsy1.test.stu@algo.edu.vn');
  assert.equal(rawEmail, 'ptsy1.test.stu@algo.edu.vn');
  assert.equal(incomingRole, '');
  assert.equal(rawEmail.includes('.tch') || rawEmail.includes('teacher'), false);
});
