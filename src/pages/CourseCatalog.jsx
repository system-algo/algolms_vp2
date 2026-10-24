import { useEffect, useMemo, useState } from 'react';

const CATALOG_URL = '/courses/index.json';

function getCourseStats(course) {
  const lessonCount = Number.isFinite(course.lessonCount) ? course.lessonCount : 0;
  const taskCount = Number.isFinite(course.taskCount) ? course.taskCount : 0;

  return { lessonCount, taskCount };
}

export default function CourseCatalog({ onOpenCourse }) {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  useEffect(() => {
    const email = localStorage.getItem('lms_student_email');
    if (email) setStudentEmail(email);
  }, []);

  useEffect(() => {
    fetch(CATALOG_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Cannot load ${CATALOG_URL}`);
        return res.json();
      })
      .then(setCatalog)
      .catch((err) => setError(err.message));
  }, []);

  const courses = useMemo(() => {
    if (!Array.isArray(catalog?.courses)) return [];
    return catalog.courses;
  }, [catalog]);

  if (error) {
    return (
      <main className="kids-screen">
        <section className="kids-hero-section">
          <h1 style={{ marginBottom: 16 }}>Oops! Course list not found 😢</h1>
          <p style={{ fontSize: 16, lineHeight: 1.5 }}>
            An error occurred while loading the course data. Please contact your teacher.
          </p>
          <p style={{ color: '#dc2626', marginTop: 20, fontSize: 14, fontWeight: 600 }}>{error}</p>
        </section>
      </main>
    );
  }

  if (!catalog) {
    return (
      <main className="kids-screen">
        <section className="kids-hero-section">
          <div className="kids-loading-spinner"></div>
          <h1>Loading your courses... ⏳</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="kids-screen">
      {/* Profile Header Section */}
      <section className="kids-profile-header">
        <div className="kids-profile-content">
          <div className="kids-profile-avatar-section">
            <div className="kids-profile-avatar">👤</div>
            <div>
              <p className="kids-profile-label">Your Learning</p>
              <p className="kids-profile-name">{studentEmail || 'Young Learner'}</p>
            </div>
          </div>
          <div className="kids-profile-stats">
            <div className="kids-stat-item">
              <span className="kids-stat-number">{courses.length}</span>
              <span className="kids-stat-label">Courses</span>
            </div>
            <div className="kids-stat-divider"></div>
            <div className="kids-stat-item">
              <span className="kids-stat-number">{courses.reduce((sum, c) => sum + (c.lessonCount || 0), 0)}</span>
              <span className="kids-stat-label">Lessons</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Hero Section */}
      <section className="kids-hero-section">
        <h1 className="kids-hero-title">🚀 Choose Your Adventure!</h1>
        <p className="kids-hero-subtitle">Pick a course to start learning and have fun!</p>
      </section>

      {courses.length === 0 ? (
        <section className="kids-empty-state">
          <div className="kids-empty-icon">📚</div>
          <h2>No courses yet</h2>
          <p>Please come back later or ask your teacher!</p>
        </section>
      ) : (
        <section className="kids-courses-section">
          <div className="kids-courses-grid">
            {courses.map((course, index) => {
              const stats = getCourseStats(course);
              return (
                <button
                  key={course.id || index}
                  type="button"
                  className="kids-course-card"
                  onClick={() => onOpenCourse(course.id)}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="kids-card-badge">
                    <span className="kids-card-number">{String(index + 1).padStart(2, '0')}</span>
                  </div>

                  <div className="kids-card-icon">
                    {String.fromCodePoint(0x1f393 + (index % 10))}
                  </div>

                  <h2 className="kids-card-title">{course.title || course.id}</h2>

                  <p className="kids-card-description">
                    {stats.lessonCount} lessons • {stats.taskCount} tasks
                  </p>

                  <div className="kids-card-footer">
                    <span>Let's go!</span>
                    <span className="kids-card-arrow">→</span>
                  </div>

                  <div className="kids-card-shine"></div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}