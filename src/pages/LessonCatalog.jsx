import { useEffect, useMemo, useState } from 'react';

function getLessonCatalogUrl(courseId) {
  return `/courses/${encodeURIComponent(courseId)}/index.json?t=${Date.now()}`;
}

function getLessonStats(lesson) {
  const pageCount = Number.isFinite(lesson.pageCount) ? lesson.pageCount : 0;
  const taskCount = Number.isFinite(lesson.taskCount) ? lesson.taskCount : 0;

  return { pageCount, taskCount };
}

const H5P_TYPE_EMOJIS = {
  quiz: '📝',
  interactive: '🎮',
  video: '🎬',
  presentation: '📊',
  default: '🧩',
};

function getH5pEmoji(type) {
  return H5P_TYPE_EMOJIS[type] || H5P_TYPE_EMOJIS.default;
}

function getApiBase() {
  const saved = localStorage.getItem('lms_backend_url');
  if (saved) return saved;
  // Fallback cho local dev hoặc Vercel nếu không được mở từ platform chính
  return import.meta.env.VITE_API_URL || window.__CLASSROOM_API_BASE || 'http://localhost:5014';
}

function getModuleSortValue(module) {
  const value = String(module?.id || module?.lessonId || module?.title || '').toLowerCase();

  if (value === 'graduation') {
    return { group: 2, number: Number.MAX_SAFE_INTEGER, raw: value };
  }

  const moduleMatch = value.match(/m(\d+)/i);
  if (moduleMatch) {
    return { group: 0, number: Number(moduleMatch[1]), raw: value };
  }

  const numericMatch = value.match(/(\d+)/);
  if (numericMatch) {
    return { group: 1, number: Number(numericMatch[1]), raw: value };
  }

  return { group: 1, number: Number.MAX_SAFE_INTEGER, raw: value };
}

function getModuleBadge(module) {
  const value = String(module?.id || module?.lessonId || module?.title || '');
  const moduleMatch = value.match(/m(\d+)/i);

  if (moduleMatch) {
    return `M${moduleMatch[1]}`;
  }

  const numericMatch = value.match(/(\d+)/);
  if (numericMatch) {
    return `L${numericMatch[1]}`;
  }

  return 'MOD';
}

export default function LessonCatalog({
  courseId,
  onOpenLesson,
  onOpenH5pActivity,
  onBackToCatalog,
}) {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');

  // H5P modules state
  const [h5pModules, setH5pModules] = useState([]);
  const [h5pLoading, setH5pLoading] = useState(true);
  const [h5pError, setH5pError] = useState('');
  const [expandedModules, setExpandedModules] = useState({});

  const catalogUrl = useMemo(() => getLessonCatalogUrl(courseId), [courseId]);

  // Fetch lesson catalog (existing)
  useEffect(() => {
    setCatalog(null);
    setError('');

    if (!courseId) return;

    fetch(catalogUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Cannot load ${catalogUrl}`);
        return res.json();
      })
      .then(setCatalog)
      .catch((err) => setError(err.message));
  }, [courseId, catalogUrl]);

  // Fetch H5P modules from backend API
  useEffect(() => {
    if (!courseId) return;

    setH5pLoading(true);
    setH5pError('');

    const apiBase = getApiBase();
    fetch(`${apiBase}/api/h5p-course-modules?courseId=${encodeURIComponent(courseId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Cannot load H5P activities');
        return res.json();
      })
      .then((data) => {
        setH5pModules(data.modules || []);
        // Auto-expand all modules by default
        const expanded = {};
        (data.modules || []).forEach((mod) => {
          expanded[mod.moduleId] = true;
        });
        setExpandedModules(expanded);
        setH5pLoading(false);
      })
      .catch((err) => {
        setH5pError(err.message);
        setH5pLoading(false);
      });
  }, [courseId]);

  const modules = useMemo(() => {
    if (!Array.isArray(catalog?.lessons)) return [];

    return [...catalog.lessons].sort((a, b) => {
      const left = getModuleSortValue(a);
      const right = getModuleSortValue(b);

      if (left.group !== right.group) return left.group - right.group;
      if (left.number !== right.number) return left.number - right.number;
      return left.raw.localeCompare(right.raw);
    });
  }, [catalog]);

  const progressPercent = modules.length > 0 ? Math.round((0 / modules.length) * 100) : 0;

  const totalH5pActivities = h5pModules.reduce(
    (sum, mod) => sum + (mod.activities?.length || 0),
    0
  );

  function toggleModule(moduleId) {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  }

  if (error) {
    return (
      <main className="kids-screen">
        <button
          type="button"
          className="kids-back-button"
          onClick={onBackToCatalog}
        >
          ← Back to courses
        </button>

        <section className="kids-hero-section">
          <h1 style={{ marginBottom: 16 }}>Oops! Lesson list not found 😢</h1>
          <p style={{ fontSize: 16, lineHeight: 1.5 }}>
            An error occurred while loading the lessons for this course.
          </p>
          <p style={{ color: '#dc2626', marginTop: 20, fontSize: 14, fontWeight: 600 }}>{error}</p>
        </section>
      </main>
    );
  }

  if (!catalog) {
    return (
      <main className="kids-screen">
        <button
          type="button"
          className="kids-back-button"
          onClick={onBackToCatalog}
        >
          ← Back to courses
        </button>

        <section className="kids-hero-section">
          <div className="kids-loading-spinner"></div>
          <h1>Loading lessons... ⏳</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="kids-screen">
      <button
        type="button"
        className="kids-back-button"
        onClick={onBackToCatalog}
      >
        ← Back to courses
      </button>

      {/* Course Progress Section */}
      <section className="kids-progress-section">
        <div className="kids-progress-header">
          <div>
            <p className="kids-progress-label">Course</p>
            <h1 className="kids-progress-title">{catalog.title || courseId}</h1>
          </div>
          <div className="kids-progress-badge">
            <div className="kids-progress-percent">{progressPercent}%</div>
            <div className="kids-progress-label-small">Complete</div>
          </div>
        </div>

        <div className="kids-progress-bar">
          <div className="kids-progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="kids-progress-stats">
          <div className="kids-progress-stat">
            <span className="kids-stat-icon">📖</span>
            <span className="kids-stat-label">{modules.length} Modules</span>
          </div>
          <div className="kids-progress-stat">
            <span className="kids-stat-icon">📝</span>
            <span className="kids-stat-label">{catalog.taskCount || 0} Tasks</span>
          </div>
          {totalH5pActivities > 0 && (
            <div className="kids-progress-stat">
              <span className="kids-stat-icon">🧩</span>
              <span className="kids-stat-label">{totalH5pActivities} H5P Activities</span>
            </div>
          )}
          <div className="kids-progress-stat">
            <span className="kids-stat-icon">⭐</span>
            <span className="kids-stat-label">Ready to learn!</span>
          </div>
        </div>
      </section>

      {/* Main Hero Section */}
      <section className="kids-hero-section">
        <h2 className="kids-hero-title">📚 Choose Your Module</h2>
        <p className="kids-hero-subtitle">Pick a module to explore its lessons and pages!</p>
      </section>

      {modules.length === 0 ? (
        <section className="kids-empty-state">
          <div className="kids-empty-icon">🎓</div>
          <h2>No lessons yet</h2>
          <p>Please come back soon!</p>
        </section>
      ) : (
        <section className="kids-lessons-section">
          <div className="kids-lessons-grid">
            {modules.map((module, index) => {
              const stats = getLessonStats(module);
              return (
                <button
                  key={module.id || index}
                  type="button"
                  className="kids-lesson-card"
                  onClick={() => onOpenLesson(module)}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="kids-lesson-header">
                    <div className="kids-lesson-badge">{getModuleBadge(module)}</div>
                    <div className="kids-lesson-emoji">
                      {String.fromCodePoint(0x1f308 + (index % 8))}
                    </div>
                  </div>

                  <h3 className="kids-lesson-title">{module.title || module.id}</h3>

                  <p className="kids-lesson-meta">
                    {stats.pageCount} pages • {stats.taskCount} tasks
                  </p>

                  <div className="kids-lesson-difficulty">
                    <span className="kids-difficulty-dot"></span>
                    <span className="kids-difficulty-dot"></span>
                    <span className="kids-difficulty-dot"></span>
                  </div>

                  <div className="kids-lesson-footer">
                    <span>Start learning</span>
                    <span className="kids-lesson-arrow">→</span>
                  </div>

                  <div className="kids-card-shine"></div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* H5P Activities Section */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="h5p-section">
        <section className="kids-hero-section">
          <h2 className="kids-hero-title">🧩 H5P Activities</h2>
          <p className="kids-hero-subtitle">Practice with interactive quizzes and exercises!</p>
        </section>

        {h5pLoading && (
          <div className="h5p-loading">
            <div className="kids-loading-spinner"></div>
            <p>Loading...</p>
          </div>
        )}

        {h5pError && !h5pLoading && (
          <div className="h5p-error">
            <p>⚠️ Could not load H5P activities: {h5pError}</p>
          </div>
        )}

        {!h5pLoading && !h5pError && h5pModules.length === 0 && (
          <section className="kids-empty-state">
            <div className="kids-empty-icon">🧩</div>
            <h2>No H5P activities yet</h2>
            <p>Interactive activities will appear here when added by your teacher!</p>
          </section>
        )}

        {!h5pLoading && !h5pError && h5pModules.length > 0 && (
          <div className="h5p-modules-container">
            {h5pModules.map((mod, modIndex) => (
              <div key={mod.moduleId} className="h5p-module-group">
                {/* Module header — collapsible */}
                <button
                  type="button"
                  className="h5p-module-header"
                  onClick={() => toggleModule(mod.moduleId)}
                >
                  <div className="h5p-module-header-left">
                    <span className="h5p-module-icon">
                      {String.fromCodePoint(0x1f4d6 + (modIndex % 6))}
                    </span>
                    <h3 className="h5p-module-title">{mod.moduleTitle}</h3>
                    <span className="h5p-module-count">
                      {mod.activities?.length || 0} activities
                    </span>
                  </div>
                  <span className={`h5p-module-chevron ${expandedModules[mod.moduleId] ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </button>

                {/* Module activities grid */}
                {expandedModules[mod.moduleId] && (
                  <div className="h5p-activities-grid">
                    {(mod.activities || []).map((activity, actIdx) => (
                      <button
                        key={activity.id}
                        type="button"
                        className="h5p-activity-card"
                        onClick={() =>
                          onOpenH5pActivity?.({
                            ...activity,
                            moduleId: mod.moduleId,
                            moduleTitle: mod.moduleTitle,
                          })
                        }
                        style={{ animationDelay: `${actIdx * 80}ms` }}
                      >
                        <div className="h5p-activity-card-top">
                          <span className="h5p-activity-emoji">
                            {getH5pEmoji(activity.activityType)}
                          </span>
                          <span className="h5p-activity-type-badge">
                            {activity.activityType || 'h5p'}
                          </span>
                        </div>

                        <h4 className="h5p-activity-title">{activity.title}</h4>

                        {activity.isRequired && (
                          <span className="h5p-required-badge">Required</span>
                        )}

                        <div className="h5p-activity-footer">
                          <span>Start</span>
                          <span className="kids-lesson-arrow">→</span>
                        </div>

                        <div className="kids-card-shine"></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}