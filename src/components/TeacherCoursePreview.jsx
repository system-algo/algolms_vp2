import React, { useState, useEffect, useMemo } from 'react';
import customNames from '../config/mapping.json';
import '../pages/Dashboard.css'; // Reuse Dashboard CSS classes

function isModuleCatalogEntry(entry) {
  const id = String(entry?.id || entry?.moduleId || '').trim();
  if (!id || /L\d+/i.test(id)) return false;
  return /(?:^|[_-])M\d+(?:[_-]|$)|graduation/i.test(id);
}

function getLessonIdFromPage(page) {
  const rawId = String(page?.id || page?.pageId || '');
  return page?.lessonId || rawId.match(/^(.+?_M\d+L\d+)(?:_|$)/i)?.[1] || '';
}

function groupPagesByLesson(pages) {
  const groups = new Map();

  (Array.isArray(pages) ? pages : []).forEach((page) => {
    const lessonId = getLessonIdFromPage(page);
    if (!lessonId) return;

    if (!groups.has(lessonId)) groups.set(lessonId, []);
    groups.get(lessonId).push(page);
  });

  return groups;
}

export default function TeacherCoursePreview({ courseId, onClose }) {
  const [lessonsData, setLessonsData] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);

  useEffect(() => {
    if (!courseId) return;

    setLoadingLessons(true);

    fetch(`/courses/${encodeURIComponent(courseId)}/index.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Cannot load course index');
        return res.json();
      })
      .then(async (courseData) => {
        const modules = (courseData.lessons || courseData.modules || [])
          .filter(isModuleCatalogEntry)
          .sort((a, b) => {
            const numA = parseInt(String(a.id || '').match(/M(\d+)/i)?.[1] || '999', 10);
            const numB = parseInt(String(b.id || '').match(/M(\d+)/i)?.[1] || '999', 10);
            return numA - numB;
          });

        const loadedModules = await Promise.all(
          modules.map(async (module) => {
            if (
              Array.isArray(module.pages) ||
              Array.isArray(module.lessons)
            ) {
              return module;
            }

            const moduleUrl =
              module.index ||
              `/courses/${encodeURIComponent(courseId)}/${encodeURIComponent(module.id)}/index.json`;

            try {
              const response = await fetch(moduleUrl);
              if (!response.ok) throw new Error(`Cannot load pages for ${module.id}`);
              return await response.json();
            } catch (error) {
              console.warn(`Using catalog data for ${module.id}:`, error);
              return module;
            }
          })
        );

        let globalLessonNumber = 1;

        const structuredModules = modules.map((module, moduleIndex) => {
          const loadedModule =
            loadedModules.find((item) => item?.id === module.id) || module;
          const moduleTitle =
            customNames?.modules?.[module.id] ||
            loadedModule.title ||
            module.title ||
            `Module ${moduleIndex + 1}`;
          const flatPages = Array.isArray(loadedModule.pages)
            ? loadedModule.pages
            : [];
          const lessonCatalog = Array.isArray(loadedModule.lessons)
            ? loadedModule.lessons
            : [];
          const pagesByLesson = groupPagesByLesson(flatPages);

          const sortPages = (pages) =>
            [...(pages || [])].sort((a, b) => {
              const numA = parseInt(
                String(a.id || a.pageId || '').match(/_(\d+)$/)?.[1] || '0',
                10
              );
              const numB = parseInt(
                String(b.id || b.pageId || '').match(/_(\d+)$/)?.[1] || '0',
                10
              );
              return numA - numB;
            });

          let lessons = [];

          if (lessonCatalog.length > 0) {
            lessons = lessonCatalog
              .map((lesson) => {
                const lessonId = lesson.id || lesson.lessonId || '';
                if (!lessonId) return null;

                const currentLessonNumber = globalLessonNumber++;
                const lessonPages =
                  Array.isArray(lesson.pages) && lesson.pages.length > 0
                    ? lesson.pages
                    : pagesByLesson.get(lessonId) || [];

                return {
                  ...lesson,
                  id: lessonId,
                  key: lessonId,
                  moduleId: module.id,
                  moduleTitle,
                  number: currentLessonNumber,
                  title:
                    customNames?.lessons?.[lessonId] ||
                    lesson.title ||
                    `Lesson ${currentLessonNumber}`,
                  pages: sortPages(lessonPages),
                };
              })
              .filter(Boolean);
          } else {
            lessons = Array.from(pagesByLesson.entries())
              .sort(([lessonIdA], [lessonIdB]) => {
                const numA = parseInt(lessonIdA.match(/L(\d+)/i)?.[1] || '0', 10);
                const numB = parseInt(lessonIdB.match(/L(\d+)/i)?.[1] || '0', 10);
                return numA - numB;
              })
              .map(([lessonId, lessonPages]) => {
                const currentLessonNumber = globalLessonNumber++;
                return {
                  id: lessonId,
                  key: lessonId,
                  moduleId: module.id,
                  moduleTitle,
                  number: currentLessonNumber,
                  title:
                    customNames?.lessons?.[lessonId] ||
                    `Lesson ${currentLessonNumber}`,
                  pages: sortPages(lessonPages),
                };
              });
          }

          return {
            ...module,
            id: module.id,
            title: moduleTitle,
            number: moduleIndex + 1,
            lessons,
            pageCount: module.pageCount || flatPages.length,
            taskCount: module.taskCount,
          };
        });

        setLessonsData(structuredModules);
        setSelectedModuleIndex(0);
        setSelectedLessonIndex(0);
        setLoadingLessons(false);
      })
      .catch((error) => {
        console.error('Error fetching lessons:', error);
        setLessonsData([]);
        setLoadingLessons(false);
      });
  }, [courseId]);


  const activeModule = useMemo(() => {
    if (lessonsData.length > 0 && selectedModuleIndex >= 0 && selectedModuleIndex < lessonsData.length) {
      return lessonsData[selectedModuleIndex];
    }
    return null;
  }, [lessonsData, selectedModuleIndex]);

  const activeLesson = useMemo(() => {
    if (activeModule && activeModule.lessons.length > 0 && selectedLessonIndex >= 0 && selectedLessonIndex < activeModule.lessons.length) {
      return activeModule.lessons[selectedLessonIndex];
    }
    return null;
  }, [activeModule, selectedLessonIndex]);

  const handleLaunchPage = (moduleId, pageId) => {
    window.location.href = `/?course=${encodeURIComponent(courseId)}&lesson=${encodeURIComponent(moduleId)}&page=${encodeURIComponent(pageId)}`;
  };

  const handleLaunchFirstPageOfLesson = (lesson) => {
    if (lesson?.pages?.length > 0) {
      const firstPage = lesson.pages[0];
      handleLaunchPage(lesson.moduleId, firstPage.id || firstPage.pageId);
    } else {
      alert('No pages available for this lesson.');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <header className="ts-header" style={{ marginBottom: '24px' }}>
        <div>
          <div className="ts-breadcrumbs">
            My Courses &gt; {courseId} &gt; {activeModule?.title || 'Loading...'}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px' }}>
            Course Preview: {courseId}
          </h1>
        </div>
      </header>

      {/* MODULE PROGRESS CARD (CIRCULAR PROGRESS ON THE RIGHT) */}
      {activeModule && (
        <section className="module-progress-section" style={{ display: 'flex', justifyContent: 'space-between', padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div className="module-progress-details">
            <span className="progress-card-label" style={{ fontSize: '12px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module Overview</span>
            <h3 className="progress-module-title" style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0', color: '#1e293b' }}>
              Module {activeModule.number}: {activeModule.title.split(': ')[1] || activeModule.title}
            </h3>
            <p className="progress-module-stats" style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
              {activeModule.pageCount || 12} pages &bull; Teacher Preview Mode
            </p>
            
            <div className="progress-status-pill completed" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', background: '#ecfdf5', color: '#059669', fontSize: '13px', fontWeight: '600' }}>
              <span className="status-pill-icon">🔓</span>
              <span className="status-pill-text">All content unlocked for teachers</span>
            </div>
          </div>
        </section>
      )}

      {/* TIMELINE SECTION (HIERARCHICAL: REPRESENTS MODULE 1 TO 8) */}
      <section className="journey-section" style={{ marginBottom: '32px' }}>
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h3 className="section-title" style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
            Course Modules Content
          </h3>
        </div>

        <div className="timeline-wrapper" style={{ overflowX: 'auto', paddingBottom: '16px' }}>
          <div className="timeline-line" style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
            {loadingLessons ? (
              <p style={{ paddingLeft: 12, margin: 0 }}>Loading course timeline...</p>
            ) : lessonsData.length > 0 ? (
              lessonsData.map((module, index) => {
                const isCurrent = index === selectedModuleIndex;

                return (
                  <div key={module.id} className="timeline-step" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
                    <button
                      type="button"
                      className={`step-node ${isCurrent ? 'active' : 'completed'}`}
                      onClick={() => {
                        setSelectedModuleIndex(index);
                        setSelectedLessonIndex(0);
                      }}
                      style={{
                        width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                        background: isCurrent ? '#6366f1' : '#f1f5f9',
                        color: isCurrent ? 'white' : '#64748b',
                        fontWeight: '700', fontSize: '16px', cursor: 'pointer',
                        boxShadow: isCurrent ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                        display: 'grid', placeItems: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      {module.number}
                    </button>
                    <span className={`step-name ${isCurrent ? 'active' : ''}`} style={{ fontSize: '13px', fontWeight: isCurrent ? '700' : '600', color: isCurrent ? '#6366f1' : '#64748b' }}>
                      Module {module.number}
                    </span>
                  </div>
                );
              })
            ) : null}
          </div>
        </div>
      </section>

      {/* TWO COLUMNS GRID */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
        {/* COLUMN 1: Dynamic Lesson Selector */}
        {activeModule && (
          <div className="continue-card lesson-selector-card" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div className="continue-card-header" style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="card-label" style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module {activeModule.number}</span>
              <h4 className="card-title" style={{ fontSize: '18px', fontWeight: '800', marginTop: '4px', color: '#1e293b' }}>{activeModule.title}</h4>
            </div>

            <div className="lesson-selection-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {activeModule.lessons.map((lesson, index) => {
                const isSelected = index === selectedLessonIndex;
                return (
                  <button
                    key={lesson.key}
                    type="button"
                    className={`lesson-list-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedLessonIndex(index)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
                      background: isSelected ? '#f8fafc' : 'transparent',
                      border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', textAlign: 'left',
                      transition: 'background-color 0.2s', position: 'relative'
                    }}
                  >
                    {isSelected && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#6366f1' }} />}
                    <div className="lesson-number-badge" style={{ width: '40px', height: '40px', borderRadius: '8px', background: isSelected ? '#6366f1' : '#e2e8f0', color: isSelected ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', flexShrink: 0 }}>
                      L{lesson.number}
                    </div>
                    <div className="lesson-info-text" style={{ flexGrow: 1 }}>
                      <div className="lesson-list-title" style={{ fontSize: '14px', fontWeight: isSelected ? '700' : '600', color: isSelected ? '#6366f1' : '#1e293b', marginBottom: '2px' }}>{lesson.title}</div>
                      <div className="lesson-list-pages-count" style={{ fontSize: '12px', color: '#64748b' }}>{lesson.pages?.length || 0} activities</div>
                    </div>
                    <span className="lesson-list-arrow" style={{ color: isSelected ? '#6366f1' : '#cbd5e1', fontWeight: '700' }}>&gt;</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* COLUMN 2: Circular Page circles */}
        <div className="my-courses-card" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 className="section-title" style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Lesson Pages</h3>
            <span className="pages-count-tag" style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
              {activeLesson?.pages?.length || 0} pages
            </span>
          </div>

          <div className="pages-circles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '24px' }}>
            {activeLesson?.pages && activeLesson.pages.length > 0 ? (
              activeLesson.pages.map((page, index) => {
                const pageNum = index + 1;
                const tasksCount = page.taskCount || 0;

                return (
                  <button
                    key={page.id || page.pageId}
                    type="button"
                    className="page-circle-item"
                    onClick={() => handleLaunchPage(activeLesson.moduleId, page.id || page.pageId)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer'
                    }}
                  >
                    <div className="circle-node completed" style={{
                      width: '72px', height: '72px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid #8b5cf6', background: '#fff', color: '#8b5cf6', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(139, 92, 246, 0.15)'
                    }}>
                      <span className="circle-label" style={{ fontSize: '10px', fontWeight: '800', opacity: 0.7 }}>PAGE</span>
                      <span className="circle-number" style={{ fontSize: '20px', fontWeight: '800' }}>{String(pageNum).padStart(2, '0')}</span>
                    </div>
                    <span className="circle-task-count" style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      {tasksCount} {tasksCount === 1 ? 'task' : 'tasks'}
                    </span>
                  </button>
                );
              })
            ) : (
              <p style={{ gridColumn: '1 / -1', color: '#64748b' }}>No pages in this lesson.</p>
            )}
          </div>

          {activeLesson && (
            <div style={{ marginTop: '40px' }}>
              <button
                type="button"
                onClick={() => handleLaunchFirstPageOfLesson(activeLesson)}
                style={{
                  width: '100%', padding: '16px', background: '#10b981', color: '#fff', borderRadius: '12px',
                  border: 'none', fontSize: '16px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                Preview Lesson {activeLesson.number}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
