import { useEffect, useMemo, useRef, useState } from 'react';
import customNames from '../config/mapping.json';
import { getVp2UnlockedLessonLimit } from '../lib/vp2LessonAccess.js';
import {
  ALL_PATHWAY_NODES,
  MAIN_PATHWAY,
} from '../pathway/pathwayConfig';
import './Dashboard.css';

const ACTIVITY_NUMBER_MAP = {
  // M2L1
  'VP2_M2L1_1': '1', 'VP2_M2L1_2': '2',
  'VP_M2L1_1': '1', 'VP_M2L1_2': '2',
  // M2L2
  'VP2_M2L2_1': '3', 'VP2_M2L2_2': '★', 'VP2_M2L2_3': '5', 'VP2_M2L2_4': '6',
  'VP_M2L2_1': '3', 'VP_M2L2_2': '★', 'VP_M2L2_3': '5', 'VP_M2L2_4': '6',
  // M2L3 (Space) - Image 2 exact match
  'VP2_M2L3_1': '7',
  'VP2_M2L3_2': '★',
  'VP2_M2L3_3': '8',
  'VP2_M2L3_4': '9',
  'VP_M2L3_1': '7',
  'VP_M2L3_2': '★',
  'VP_M2L3_3': '8',
  'VP_M2L3_4': '9',
  // M2L4 (Space) - Image 2 exact match
  'VP2_M2L4_1': '10',
  'VP2_M2L4_2': '★',
  'VP2_M2L4_3': '11',
  'VP2_M2L4_4': '12',
  'VP2_M2L4_5': '13',
  'VP_M2L4_1': '10',
  'VP_M2L4_2': '★',
  'VP_M2L4_3': '11',
  'VP_M2L4_4': '12',
  'VP_M2L4_5': '13',
  // M2L5 (Space)
  'VP2_M2L5_1': '14',
  'VP_M2L5_1': '14'
};


const CATALOG_URL = '/courses/index.json';
const DEFAULT_COURSE_ID = 'VP2';

const COURSE_BADGE_ASSETS = {
  CK: '/course-badges/ck.png',
  DL: '/course-badges/dl.png',
  VP: '/course-badges/vp.png',
  VP2: '/course-badges/vp.png',
  GD: '/course-badges/gd.png',
  WD: '/course-badges/wd.png',
  PTSY1: '/course-badges/ptsy1.png',
  PTSY2: '/course-badges/ptsy2.png',
  PTPY1: '/course-badges/ptpy1.png',
  PTPY2: '/course-badges/ptpy2.png',
  FED: '/course-badges/fed.png',
  CS50X: '/course-badges/cs50x.png',
  CS50P: '/course-badges/cs50p.png',
  DD: '/course-badges/dd.png',
  DDA: '/course-badges/dda.png',
  GDA: '/course-badges/gda.png',
  UGD: '/course-badges/ugd.png',
};

function getCourseBadgeAsset(code) {
  return COURSE_BADGE_ASSETS[String(code || '').trim().toUpperCase()] || '';
}


function getLessonIdFromPage(page) {
  const rawId = String(page?.id || page?.pageId || '');
  const match = rawId.match(/^(.+?_M\d+L\d+)(?:_|$)/i);

  return match?.[1] || '';
}

function groupPagesByLesson(pages) {
  const groups = new Map();

  (Array.isArray(pages) ? pages : []).forEach((page) => {
    const lessonId = page.lessonId || getLessonIdFromPage(page);

    if (!lessonId) return;

    if (!groups.has(lessonId)) {
      groups.set(lessonId, []);
    }

    groups.get(lessonId).push(page);
  });

  return groups;
}


function isModuleCatalogEntry(entry) {
  const id = String(entry?.id || entry?.moduleId || '').trim();

  if (!id || /L\d+/i.test(id)) {
    return false;
  }

  return /(?:^|[_-])M\d+(?:[_-]|$)|graduation/i.test(id);
}

function normalizeCourseValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

function findPathwayNodeForCourse(course) {
  const courseValues = [
    course?.id,
    course?.code,
    course?.title,
    course?.category,
  ]
    .filter(Boolean)
    .map(normalizeCourseValue);

  return (
    ALL_PATHWAY_NODES.find((node) => {
      const pathwayValues = [
        node.code,
        node.title,
        node.shortTitle,
        ...(node.aliases || []),
      ].map(normalizeCourseValue);

      return courseValues.some((courseValue) =>
        pathwayValues.includes(courseValue)
      );
    }) || null
  );
}

export default function Dashboard({ onOpenCourse, onOpenPage, initialCourseId = '' }) {
  const [catalog, setCatalog] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId || DEFAULT_COURSE_ID);
  const [myCoursesOpen, setMyCoursesOpen] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [activeTab, setActiveTab] = useState('course'); // 'course' view only (home hidden)

  // Dynamic hierarchy state: course has modules -> modules have lessons -> lessons have pages
  const [rawLessonsData, setRawLessonsData] = useState([]); // full VP2 catalog
  const [highestUnlocked, setHighestUnlocked] = useState(2);
  // The VP2 student dashboard never reads VP schedules. Lessons 1-2 are
  // available by default; higher lessons require VP2 schedule records.
  const lessonsData = useMemo(() => {
    const role = String(localStorage.getItem('lms_user_role') || 'student').toLowerCase();
    const unrestricted = role === 'teacher' || role === 'admin';
    return rawLessonsData.map((module) => {
      const lessons = (module.lessons || []).map((lesson) => {
        const isLocked = !unrestricted && lesson.number > highestUnlocked;
        return {
          ...lesson,
          isLocked,
          locked: isLocked,
          isUnlocked: !isLocked,
          pages: (lesson.pages || []).map((page) => ({
            ...page,
            isLocked,
            locked: isLocked,
          })),
        };
      });
      const isLocked = lessons.length ? lessons[0].isLocked : !unrestricted;
      return { ...module, lessons, isLocked, locked: isLocked, isUnlocked: !isLocked };
    });
  }, [rawLessonsData, highestUnlocked]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(() => {
    const saved = sessionStorage.getItem('vp_dashboard_module_index');
    return saved !== null && saved !== undefined ? parseInt(saved, 10) : 1;
  }); // active module index in timeline
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(() => {
    const saved = sessionStorage.getItem('vp_dashboard_lesson_index');
    return saved ? parseInt(saved, 10) : 0;
  }); // active lesson index inside the selected module
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [userGender, setUserGender] = useState('male'); // defaults to male
  const [profileName, setProfileName] = useState('');
  const [studentCode, setStudentCode] = useState('');

  // Persist selected indices
  useEffect(() => {
    sessionStorage.setItem('vp_dashboard_module_index', selectedModuleIndex);
  }, [selectedModuleIndex]);

  useEffect(() => {
    sessionStorage.setItem('vp_dashboard_lesson_index', selectedLessonIndex);
  }, [selectedLessonIndex]);

  // Student specific details
  const studentEmail = localStorage.getItem('lms_student_email') || 'tim.tran@algo.edu.vn';
  const studentName = studentEmail.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

  useEffect(() => {
    let cancelled = false;
    setHighestUnlocked(2);
    getVp2UnlockedLessonLimit(studentEmail)
      .then((limit) => { if (!cancelled) setHighestUnlocked(limit); })
      .catch((error) => {
        console.warn('VP2 lesson unlock check failed:', error);
        if (!cancelled) setHighestUnlocked(2);
      });
    return () => { cancelled = true; };
  }, [studentEmail]);

  const [dbProgress, setDbProgress] = useState([]);
  const [hasFetchedProgress, setHasFetchedProgress] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedLesson, setCelebratedLesson] = useState(null);
  const celebratedRef = useRef(new Set());
  const pendingContinueRef = useRef(false);
  const [isScanComplete, setIsScanComplete] = useState(false);

  // Fetch student progress records from Supabase activity_progress
  useEffect(() => {
    const supabaseUrl = localStorage.getItem('lms_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = localStorage.getItem('lms_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;
    const supabaseToken = localStorage.getItem('lms_access_token') || supabaseKey;

    if (supabaseUrl && supabaseKey && studentEmail) {
      const url = `${supabaseUrl}/rest/v1/activity_progress?user_id=eq.${encodeURIComponent(studentEmail)}&select=course_id,lesson_id,page_id,task_id,status,is_completed`;
      fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseToken}`
        }
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch progress');
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setDbProgress(data);
            setHasFetchedProgress(true);
          }
        })
        .catch((err) => {
          console.warn('Supabase progress lookup failed:', err);
          setHasFetchedProgress(false);
        });
    } else {
      setHasFetchedProgress(false);
    }
  }, [studentEmail]);

  // Sync with prop when URL state changes
  useEffect(() => {
    setSelectedCourseId(initialCourseId || DEFAULT_COURSE_ID);
    setActiveTab('course');
  }, [initialCourseId]);

  // Resolve user gender, name and student code from Supabase public.user_profiles/classroom_course_members REST API or email heuristics
  useEffect(() => {
    const supabaseUrl = localStorage.getItem('lms_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = localStorage.getItem('lms_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;
    const supabaseToken = localStorage.getItem('lms_access_token') || supabaseKey;

    // Local heuristics for instant feedback
    const lowerEmail = studentEmail.toLowerCase();
    if (lowerEmail.includes('jay')) {
      setUserGender('female');
    } else if (lowerEmail.includes('tim')) {
      setUserGender('male');
    }

    // Try fetching from Supabase REST API
    if (supabaseUrl && supabaseKey && studentEmail) {
      const usernamePart = studentEmail.split('@')[0];
      const url = `${supabaseUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(usernamePart)}&select=*`;
      
      let resolvedNameFromProfile = '';
      let resolvedCodeFromProfile = '';

      fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseToken}`
        }
      })
        .then((res) => {
          if (!res.ok) throw new Error('Supabase response error');
          return res.json();
        })
        .then((data) => {
          console.log('Dashboard: user_profile details:', data);
          if (data && data[0]) {
            const profile = data[0];
            if (profile.gender) {
              const genderVal = String(profile.gender).toLowerCase().trim();
              if (genderVal === 'female' || genderVal === 'nữ') {
                setUserGender('female');
              } else if (genderVal === 'male' || genderVal === 'nam') {
                setUserGender('male');
              }
            }

            // Check for name fields
            const nameVal = profile.name || profile.display_name || profile.full_name || profile.first_name || profile.last_name;
            if (nameVal) {
              resolvedNameFromProfile = nameVal;
              setProfileName(nameVal);
            }

            // Check for student code fields
            const codeVal = profile.student_code || profile['student code'] || profile.student_id;
            if (codeVal) {
              resolvedCodeFromProfile = codeVal;
              setStudentCode(codeVal);
            }
          }
        })
        .catch((err) => {
          console.warn('Supabase profile query failed:', err);
        })
        .finally(() => {
          // Fetch classroom_course_members as fallback for name/code if not resolved by user_profiles
          const membersUrl = `${supabaseUrl}/rest/v1/classroom_course_members?email=eq.${encodeURIComponent(studentEmail)}`;
          fetch(membersUrl, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseToken}`
            }
          })
            .then((res) => {
              if (!res.ok) throw new Error('Supabase members response error');
              return res.json();
            })
            .then((membersData) => {
              console.log('Dashboard: classroom_course_members details:', membersData);
              if (Array.isArray(membersData) && membersData.length > 0) {
                // Fallback name if not set by user_profiles
                if (!resolvedNameFromProfile) {
                  const memberWithName = membersData.find((m) => m.name);
                  if (memberWithName) {
                    setProfileName(memberWithName.name);
                  }
                }

                // Fallback student code if not set by user_profiles
                if (!resolvedCodeFromProfile) {
                  const memberWithCode = membersData.find((m) => m.x_studio_student_code || m.student_code || m['student code'] || m.student_id);
                  if (memberWithCode) {
                    setStudentCode(memberWithCode.x_studio_student_code || memberWithCode.student_code || memberWithCode['student code'] || memberWithCode.student_id);
                  }
                }
              }
            })
            .catch((err) => {
              console.warn('Dashboard: classroom_course_members query failed:', err);
            });
        });
    }
  }, [studentEmail]);

  // Toast notifier
  const triggerToast = (message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Fetch course catalog
  useEffect(() => {
    fetch(`${CATALOG_URL}?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Cannot load courses');
        return res.json();
      })
      .then(setCatalog)
      .catch((err) => console.error(err.message));
  }, []);

  // Fetch course modules and group pages into lessons dynamically
  useEffect(() => {
    if (!selectedCourseId) {
      return;
    }

    setLoadingLessons(true);
    setFetchError(null);

    const courseUrl = `/courses/${encodeURIComponent(selectedCourseId)}/index.json`;

    fetch(`${courseUrl}?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Cannot load course structure');
        return res.json();
      })
      .then(async (courseIndex) => {
        setRawData(courseIndex);

        const modules = (courseIndex.lessons || courseIndex.modules || [])
          .filter(isModuleCatalogEntry)
          .sort((a, b) => {
            const numA = parseInt(String(a.id || '').match(/M(\d+)/i)?.[1] || '999', 10);
            const numB = parseInt(String(b.id || '').match(/M(\d+)/i)?.[1] || '999', 10);
            return numA - numB;
          });

        // VP currently stores pages directly inside each module in the course index.
        // This also supports a future module.index or /MODULE/index.json structure.
        const loadedModules = await Promise.all(
          modules.map(async (module) => {
            if (
              (Array.isArray(module.pages) && module.pages.length > 0) ||
              (Array.isArray(module.lessons) && module.lessons.length > 0)
            ) {
              return module;
            }

            const moduleUrl =
              module.index ||
              `/courses/${encodeURIComponent(selectedCourseId)}/${encodeURIComponent(module.id)}/index.json`;

            try {
              const response = await fetch(`${moduleUrl}?t=${Date.now()}`);
              if (!response.ok) throw new Error(`Cannot load pages for ${module.id}`);
              return await response.json();
            } catch (error) {
              console.warn(`Using catalog data for ${module.id}:`, error);
              return module;
            }
          })
        );

        let globalLessonCounter = 1;

        const structuredModules = modules.map((module, moduleIndex) => {
          const loadedModule =
            loadedModules.find((item) => item?.id === module.id) || module;
          
          const modNumMatch = String(module.id).match(/M(\d+)/i);
          const modNum = modNumMatch ? parseInt(modNumMatch[1], 10) : moduleIndex + 1;

          const moduleTitle =
            customNames?.modules?.[module.id] ||
            loadedModule.title ||
            module.title ||
            `Module ${modNum}`;

          const flatPages = Array.isArray(loadedModule.pages)
            ? loadedModule.pages
            : Array.isArray(module.pages)
              ? module.pages
              : [];
          const lessonCatalog = Array.isArray(loadedModule.lessons)
            ? loadedModule.lessons
            : [];
          const pagesByLesson = groupPagesByLesson(flatPages);

          const sortPages = (pages) =>
            [...(pages || [])].sort((a, b) => {
              const aIsSlide = String(a.id || a.pageId || '').includes('SLIDE');
              const bIsSlide = String(b.id || b.pageId || '').includes('SLIDE');
              if (aIsSlide && !bIsSlide) return -1;
              if (!aIsSlide && bIsSlide) return 1;
              const numA = parseInt(
                String(a.id || a.pageId || '').match(/_(\d+)(?:_.*)?$/)?.[1] || '0',
                10
              );
              const numB = parseInt(
                String(b.id || b.pageId || '').match(/_(\d+)(?:_.*)?$/)?.[1] || '0',
                10
              );
              return numA - numB;
            });

          let lessons = [];
          let currentActivityCounter = 1;

          const enrichPages = (pagesList) => {
            return sortPages(pagesList).map((page) => {
              const pId = page.id || page.pageId || '';
              const isSlide = pId.toUpperCase().includes('SLIDE') || String(page.title || '').toUpperCase().startsWith('SLIDE');
              const displayTitle = customNames?.pages?.[pId] || customNames?.pages?.[pId.replace(/^VP2_/, 'VP_')] || page.title || pId;
              const isBonus = ACTIVITY_NUMBER_MAP[pId] === '★' || (!isSlide && (
                /additional|bonus|artist|riddle|pen|hedgehog|apple|broom/i.test(displayTitle) ||
                /additional|bonus/i.test(pId)
              ));
              
              let activityBadge = ACTIVITY_NUMBER_MAP[pId];
              if (!activityBadge) {
                if (isBonus) activityBadge = '★';
                else if (isSlide) activityBadge = 'SLIDE';
                else {
                  activityBadge = String(currentActivityCounter++);
                }
              }

              return {
                ...page,
                id: pId,
                displayTitle,
                isSlide,
                isBonus,
                activityBadge
              };
            });
          };

          if (lessonCatalog.length > 0) {
            lessons = lessonCatalog
              .map((lesson) => {
                const lessonId = lesson.id || lesson.lessonId || '';
                if (!lessonId) return null;

                const currentLessonNumber = globalLessonCounter++;
                const lNumMatch = lessonId.match(/L(\d+)/i);
                const lessonNum = lNumMatch ? parseInt(lNumMatch[1], 10) : currentLessonNumber;
                const codeMatch = lessonId.match(/(?:M\d+)?L\d+/i);
                const code = codeMatch ? codeMatch[0] : `L${lessonNum}`;
                const rawTitle = customNames?.lessons?.[lessonId] || customNames?.lessons?.[lessonId.replace(/^VP2_/, 'VP_')] || lesson.title || `Lesson ${lessonNum}`;

                const lessonPages =
                  Array.isArray(lesson.pages) && lesson.pages.length > 0
                    ? lesson.pages
                    : pagesByLesson.get(lessonId) || [];

                return {
                  ...lesson,
                  id: lessonId,
                  key: lessonId,
                  code,
                  lessonNum,
                  moduleId: module.id,
                  moduleTitle,
                  number: lessonNum,
                  title: rawTitle,
                  headerTitle: `LESSON ${lessonNum}. ${code}. ${rawTitle.toUpperCase()}`,
                  pages: enrichPages(lessonPages),
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
                const currentLessonNumber = globalLessonCounter++;
                const lNumMatch = lessonId.match(/L(\d+)/i);
                const lessonNum = lNumMatch ? parseInt(lNumMatch[1], 10) : currentLessonNumber;
                const codeMatch = lessonId.match(/(?:M\d+)?L\d+/i);
                const code = codeMatch ? codeMatch[0] : `L${lessonNum}`;
                const rawTitle = customNames?.lessons?.[lessonId] || customNames?.lessons?.[lessonId.replace(/^VP2_/, 'VP_')] || `Lesson ${lessonNum}`;

                return {
                  id: lessonId,
                  key: lessonId,
                  code,
                  lessonNum,
                  moduleId: module.id,
                  moduleTitle,
                  number: lessonNum,
                  title: rawTitle,
                  headerTitle: `LESSON ${lessonNum}. ${code}. ${rawTitle.toUpperCase()}`,
                  pages: enrichPages(lessonPages),
                };
              });
          }

          return {
            ...module,
            id: module.id,
            title: moduleTitle,
            number: modNum,
            lessons,
            pageCount: module.pageCount || flatPages.length,
            taskCount: module.taskCount,
          };
        });

        setRawLessonsData(structuredModules);

        try {
          sessionStorage.setItem(
            'lms-global-lessons-data',
            JSON.stringify(structuredModules)
          );
        } catch (error) {
          console.warn('Could not save global lessons data to sessionStorage', error);
        }

        const savedModule = sessionStorage.getItem('vp_dashboard_module_index');
        const savedLesson = sessionStorage.getItem('vp_dashboard_lesson_index');
        
        let mIndex = 0;
        let lIndex = 0;
        
        if (savedModule) {
          const parsedM = parseInt(savedModule, 10);
          if (parsedM >= 0 && parsedM < structuredModules.length) {
            mIndex = parsedM;
          }
        }
        
        if (savedLesson) {
          const parsedL = parseInt(savedLesson, 10);
          const moduleLessons = structuredModules[mIndex]?.lessons || [];
          if (parsedL >= 0 && parsedL < moduleLessons.length) {
            lIndex = parsedL;
          }
        }
        
        setSelectedModuleIndex(mIndex);
        setSelectedLessonIndex(lIndex);
        setLoadingLessons(false);
      })
      .catch((error) => {
        console.error('Failed to load VP course structure:', error);
        setFetchError(error?.message || String(error));
        setLoadingLessons(false);
      });
  }, [selectedCourseId]);

  const courses = useMemo(() => {
    if (!Array.isArray(catalog?.courses)) return [];
    const unique = catalog.courses.filter(
      (course, idx, arr) => arr.findIndex((c) => c.id === course.id) === idx
    );
    if (unique.some((c) => c.id === 'VP2')) {
      return unique.filter((c) => c.id !== 'VP');
    }
    return unique;
  }, [catalog]);


  const currentCourseCards = useMemo(() => {
    return courses.map((course) => {
      const pathwayNode = findPathwayNodeForCourse(course);
      const progressValue = Number(course.progress);

      return {
        course,
        pathwayNode,
        title: pathwayNode?.title || course.title || course.id,
        icon: getCourseBadgeAsset(course.code || course.id || pathwayNode?.code) || pathwayNode?.icon || '📘',
        progress: Number.isFinite(progressValue)
          ? Math.max(0, Math.min(100, Math.round(progressValue)))
          : null,
      };
    });
  }, [courses]);

  const upcomingCourse = useMemo(() => {
    const enrolledMainNodes = courses
      .map((course) => findPathwayNodeForCourse(course))
      .filter((node) => node?.kind === 'main');

    if (enrolledMainNodes.length === 0) {
      return null;
    }

    const highestCurrentOrder = Math.max(
      ...enrolledMainNodes.map((node) => node.order)
    );

    return (
      [...MAIN_PATHWAY]
        .sort((a, b) => a.order - b.order)
        .find((node) => node.order > highestCurrentOrder) || null
    );
  }, [courses]);

  const handleSelectCourse = (courseId) => {
    setSelectedCourseId(courseId);
    setActiveTab('course');
    if (onOpenCourse) {
      onOpenCourse(courseId);
    }
  };

  const handleGoHome = () => {
    setSelectedCourseId('');
    setActiveTab('home');
    if (onOpenCourse) {
      onOpenCourse('');
    }
  };

  const handleLogout = () => {
    localStorage.clear();

    let platformOrigin = '';

    // First try document.referrer to get the actual frontend origin
    if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.origin) {
          platformOrigin = refUrl.origin;
        }
      } catch (e) {
        // ignore
      }
    }

    // Heuristics fallback: detect if running locally vs deployed production environment
    if (!platformOrigin || platformOrigin.includes(window.location.hostname)) {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        platformOrigin = 'http://localhost:5174';
      } else {
        platformOrigin = 'https://algorithmics-demo.vercel.app';
      }
    }

    const targetUrl = `${platformOrigin}/auth/sign-out`;

    // Redirect top-level window if inside iframe
    try {
      if (window.self !== window.top) {
        window.top.location.href = targetUrl;
      } else {
        window.location.href = targetUrl;
      }
    } catch (e) {
      window.location.href = targetUrl;
    }
  };

  // Get active elements based on hierarchy
  const activeModule = useMemo(() => {
    if (lessonsData.length > 0 && selectedModuleIndex >= 0 && selectedModuleIndex < lessonsData.length) {
      return lessonsData[selectedModuleIndex];
    }
    return null;
  }, [lessonsData, selectedModuleIndex]);

  const activeModuleProgress = useMemo(() => {
    if (!activeModule) {
      return { percentage: 0, correctCount: 0, totalCount: 1 };
    }

    // Calculate total tasks in the selected module
    let totalTasksInModule = 0;
    if (activeModule.lessons) {
      activeModule.lessons.forEach(lesson => {
        if (lesson.pages) {
          lesson.pages.forEach(page => {
            totalTasksInModule += page.taskCount || 0;
          });
        }
      });
    }
    if (totalTasksInModule === 0) {
      totalTasksInModule = activeModule.taskCount || 90; // Default fallback if no tasks loaded
    }

    // If we have successfully fetched progress records:
    if (hasFetchedProgress) {
      const correctTasks = new Set();
      dbProgress.forEach(attempt => {
        // Match active module (e.g. M3-Functions-and-Modules)
        const matchesModule = attempt.lesson_id === activeModule.id;
        const isCompleted =
          attempt.status === 'completed' ||
          attempt.is_completed === true ||
          attempt.status === 'correct' ||
          String(attempt.feedback || '').toLowerCase().includes('correct');
        if (matchesModule && isCompleted && attempt.task_id) {
          correctTasks.add(attempt.task_id);
        }
      });

      const percentage = Math.min(100, Math.round((correctTasks.size / totalTasksInModule) * 100));

      // Console logging for verification
      console.log({
        debugMessage: "Module Progress Calculation",
        student: studentEmail,
        module: activeModule.id,
        totalTasks: totalTasksInModule,
        correctTasksCount: correctTasks.size,
        correctTaskIds: Array.from(correctTasks),
        percentage: percentage
      });

      return {
        percentage,
        correctCount: correctTasks.size,
        totalCount: totalTasksInModule
      };
    }

    // Heuristics based on modules timeline index (0 to 7) for local dev fallback
    const currentActiveModuleIndex = 2; // Module 3 is index 2

    if (selectedModuleIndex < currentActiveModuleIndex) {
      console.log("Module Progress Heuristic Fallback (Past Module): DB progress not fetched, showing 100% completed mock.");
      return {
        percentage: 100,
        correctCount: totalTasksInModule,
        totalCount: totalTasksInModule
      };
    } else if (selectedModuleIndex > currentActiveModuleIndex) {
      console.log("Module Progress Heuristic Fallback (Locked Module): DB progress not fetched, showing 0% completed mock.");
      return {
        percentage: 0,
        correctCount: 0,
        totalCount: totalTasksInModule
      };
    } else {
      const mockPercentage = 62;
      console.log("Module Progress Heuristic Fallback (Active Module): DB progress not fetched, showing 62% completed mock. To test with database data, please open this app through the platform on port 5174.");
      return {
        percentage: mockPercentage,
        correctCount: Math.round(totalTasksInModule * (mockPercentage / 100)),
        totalCount: totalTasksInModule
      };
    }
  }, [activeModule, dbProgress, hasFetchedProgress, selectedModuleIndex, studentEmail]);

  const activeLesson = useMemo(() => {
    if (activeModule && activeModule.lessons.length > 0 && selectedLessonIndex >= 0 && selectedLessonIndex < activeModule.lessons.length) {
      return activeModule.lessons[selectedLessonIndex];
    }
    return null;
  }, [activeModule, selectedLessonIndex]);

  const getLessonProgress = (lesson) => {
    if (!lesson || !lesson.pages) return { percentage: 0, completedCount: 0, totalCount: 0 };

    const totalCount = lesson.pages.reduce((sum, p) => sum + (p.taskCount || 0), 0);
    if (totalCount === 0) return { percentage: 0, completedCount: 0, totalCount: 0 };

    const pageIds = new Set(lesson.pages.map(p => p.id || p.pageId).filter(Boolean));

    if (hasFetchedProgress) {
      const correctTasks = new Set();
      dbProgress.forEach(attempt => {
        const isCompleted =
          attempt.status === 'completed' ||
          attempt.is_completed === true ||
          attempt.status === 'correct' ||
          String(attempt.feedback || '').toLowerCase().includes('correct');
        if (isCompleted && attempt.page_id && pageIds.has(attempt.page_id) && attempt.task_id) {
          correctTasks.add(attempt.task_id);
        }
      });
      const percentage = Math.min(100, Math.round((correctTasks.size / totalCount) * 100));
      return {
        percentage,
        completedCount: correctTasks.size,
        totalCount
      };
    }

    // Heuristics fallback for local testing (without DB keys)
    // If selected module is before active module (Module 3), show 100%
    if (selectedModuleIndex < 2) {
      return { percentage: 100, completedCount: totalCount, totalCount };
    }
    // If selected module is after, show 0%
    if (selectedModuleIndex > 2) {
      return { percentage: 0, completedCount: 0, totalCount };
    }
    // For active module (Module 3): L1 & L2 completed, others incomplete
    const lessonIdx = activeModule?.lessons?.indexOf(lesson);
    if (lessonIdx === 0 || lessonIdx === 1) {
      return { percentage: 100, completedCount: totalCount, totalCount };
    }
    if (lessonIdx === 2) {
      return { percentage: 50, completedCount: Math.round(totalCount * 0.5), totalCount };
    }
    return { percentage: 0, completedCount: 0, totalCount };
  };

  const getPageProgress = (page, lessonId) => {
    const pageId = page?.id || page?.pageId || '';
    const total = Number(page?.taskCount) || 1;
    if (!pageId) return { completed: 0, total: 1, isCompleted: false };

    let completed = 0;

    // 1. Check local storage
    try {
      const storageKey = [
        'lms-completed-tasks',
        String(selectedCourseId || 'VP2'),
        String(lessonId || activeLesson?.id || ''),
        String(pageId),
      ].join(':');
      const localCompleted = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(localCompleted)) {
        completed = Math.max(completed, localCompleted.length);
      }
    } catch (e) {}

    // 2. Check DB progress as fallback/sync
    if (hasFetchedProgress && Array.isArray(dbProgress)) {
      const dbSet = new Set();
      const altPageId = pageId.replace(/^VP2_/, 'VP_');
      dbProgress.forEach((attempt) => {
        const isFinished =
          attempt.status === 'completed' ||
          attempt.is_completed === true ||
          attempt.status === 'correct' ||
          String(attempt.feedback || '').toLowerCase().includes('correct');
        if (isFinished && (attempt.page_id === pageId || attempt.page_id === altPageId) && attempt.task_id) {
          dbSet.add(attempt.task_id);
        }
      });
      completed = Math.max(completed, dbSet.size);
    }

    const isCompleted = completed >= total && total > 0;
    return {
      completed: Math.min(completed, total),
      total,
      isCompleted
    };
  };

  const isPageCompleted = (page) => {
    return getPageProgress(page, activeLesson?.id).isCompleted;
  };

  // Expose test helper to console for quick testing
  useEffect(() => {
    window.simulateCompletion = () => {
      if (activeLesson) {
        setCelebratedLesson(activeLesson);
        setShowCelebration(true);
        console.log("Simulating completion for:", activeLesson.title);
      } else {
        console.warn("No active lesson to simulate completion for.");
      }
    };
    return () => {
      try {
        delete window.simulateCompletion;
      } catch {
        window.simulateCompletion = undefined;
      }
    };
  }, [activeLesson]);

  // Auto trigger celebration when active lesson reaches 100% completed (temporarily disabled)
  useEffect(() => {
    /*
    if (isScanComplete && activeLesson && activeLesson.pages && activeLesson.pages.length > 0) {
      const progress = getLessonProgress(activeLesson);
      const key = `${selectedCourseId}-${selectedModuleIndex}-${selectedLessonIndex}`;
      const alreadyCelebrated = sessionStorage.getItem(`lms-celebrated-${key}`) === 'true';
      if (progress.percentage === 100 && !alreadyCelebrated && !celebratedRef.current.has(key)) {
        setCelebratedLesson(activeLesson);
        setShowCelebration(true);
        celebratedRef.current.add(key);
      }
    }
    */
  }, [activeLesson, dbProgress, hasFetchedProgress, isScanComplete]);

  // Scan and mark all completed lessons as celebrated on mount/load to prevent automatic popup spamming
  useEffect(() => {
    const supabaseUrl = localStorage.getItem('lms_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = localStorage.getItem('lms_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;
    const isDbMode = !!(supabaseUrl && supabaseKey && studentEmail);

    if (lessonsData.length > 0 && (!isDbMode || hasFetchedProgress) && !isScanComplete) {
      lessonsData.forEach((mod, mIdx) => {
        if (mod.lessons) {
          mod.lessons.forEach((les, lIdx) => {
            const progress = getLessonProgress(les);
            if (progress.percentage === 100) {
              const key = `${selectedCourseId}-${mIdx}-${lIdx}`;
              sessionStorage.setItem(`lms-celebrated-${key}`, 'true');
              celebratedRef.current.add(key);
            }
          });
        }
      });
      setIsScanComplete(true);
    }
  }, [lessonsData, hasFetchedProgress, isScanComplete]);

  const handleCloseCelebration = () => {
    setShowCelebration(false);
    if (celebratedLesson) {
      const idx = activeModule?.lessons?.indexOf(celebratedLesson);
      if (idx !== -1 && idx !== undefined) {
        const key = `${selectedCourseId}-${selectedModuleIndex}-${idx}`;
        sessionStorage.setItem(`lms-celebrated-${key}`, 'true');
        celebratedRef.current.add(key);
      }
    }
  };

  const handleLaunchPage = (moduleId, pageId) => {
    const targetModule = lessonsData.find((module) => module.id === moduleId);
    const targetLesson = targetModule?.lessons?.find((lesson) =>
      lesson.pages?.some((page) => (page.id || page.pageId) === pageId)
    );
    const targetPage = targetLesson?.pages?.find(
      (page) => (page.id || page.pageId) === pageId
    );

    if (
      targetModule?.isLocked === true ||
      targetLesson?.isLocked === true ||
      targetPage?.isLocked === true
    ) {
      triggerToast('This lesson is locked until it is scheduled.');
      return;
    }

    if (onOpenPage) {
      onOpenPage(moduleId, pageId);
    } else {
      triggerToast(`Launching page ${pageId}...`);
    }
  };

  const handleLaunchFirstPageOfLesson = (lesson) => {
    if (lesson?.isLocked === true) {
      triggerToast('This lesson is locked until it is scheduled.');
      return;
    }

    if (lesson?.pages?.length > 0) {
      const firstPage = lesson.pages[0];
      handleLaunchPage(lesson.moduleId, firstPage.id || firstPage.pageId);
    } else {
      triggerToast('No pages available for this lesson.');
    }
  };

  const handleContinueLearning = () => {
    // From the Home tab, first open the student's course. The course structure
    // is only fetched after selectedCourseId is set, so remember this click and
    // continue automatically when lessonsData becomes available.
    if (!selectedCourseId) {
      const targetCourseId = DEFAULT_COURSE_ID;
      pendingContinueRef.current = true;
      handleSelectCourse(targetCourseId);
      return;
    }

    if (loadingLessons || !Array.isArray(lessonsData) || lessonsData.length === 0) {
      pendingContinueRef.current = true;
      return;
    }

    // Flatten the full course in its normal learning order:
    // module -> lesson -> page.
    const orderedPages = lessonsData.flatMap((module) => {
      if (module.isLocked === true) {
        return [];
      }

      return (module.lessons || []).flatMap((lesson) => {
        if (lesson.isLocked === true) {
          return [];
        }

        return (lesson.pages || [])
          .filter((page) => page.isLocked !== true)
          .map((page) => ({
            moduleId: module.id,
            lesson,
            page,
          }));
      });
    });

    if (orderedPages.length === 0) {
      triggerToast('No learning pages are available yet.');
      return;
    }

    // While progress is loading, safely open the first available page.
    if (!hasFetchedProgress) {
      const firstItem = orderedPages[0];
      handleLaunchPage(
        firstItem.moduleId,
        firstItem.page.id || firstItem.page.pageId
      );
      return;
    }

    // Count each completed task only once for every page.
    const completedTasksByPage = new Map();

    dbProgress.forEach((record) => {
      const isCompleted =
        record.status === 'completed' ||
        record.status === 'correct' ||
        record.is_completed === true ||
        String(record.feedback || '').toLowerCase().includes('correct');

      if (!isCompleted || !record.page_id || !record.task_id) {
        return;
      }

      if (!completedTasksByPage.has(record.page_id)) {
        completedTasksByPage.set(record.page_id, new Set());
      }

      completedTasksByPage.get(record.page_id).add(record.task_id);
    });

    // Open the first page in course order that still has unfinished tasks.
    const nextUnfinishedItem = orderedPages.find(({ page }) => {
      const pageId = page.id || page.pageId;
      const totalTasks = Number(page.taskCount) || 0;

      if (!pageId) {
        return false;
      }

      // Without a valid task total, keep the page available rather than
      // incorrectly treating it as completed.
      if (totalTasks <= 0) {
        return true;
      }

      const completedTasks = completedTasksByPage.get(pageId)?.size || 0;
      return completedTasks < totalTasks;
    });

    if (nextUnfinishedItem) {
      handleLaunchPage(
        nextUnfinishedItem.moduleId,
        nextUnfinishedItem.page.id || nextUnfinishedItem.page.pageId
      );
      return;
    }

    // If every page is complete, open the final page of the course.
    const finalItem = orderedPages[orderedPages.length - 1];
    handleLaunchPage(
      finalItem.moduleId,
      finalItem.page.id || finalItem.page.pageId
    );
  };

  // A Continue click from Home must wait until the selected course hierarchy
  // has finished loading. Once it is ready, resume the same action automatically.
  useEffect(() => {
    if (
      pendingContinueRef.current &&
      selectedCourseId &&
      !loadingLessons &&
      Array.isArray(lessonsData) &&
      lessonsData.length > 0
    ) {
      pendingContinueRef.current = false;
      handleContinueLearning();
    }
  }, [selectedCourseId, loadingLessons, lessonsData, hasFetchedProgress, dbProgress]);

  // Student details resolved at component top level

  return (
    <div className="dashboard-layout">
      {/* LEFT SIDEBAR */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <img
            src="/assets/algorithmics-logo.png"
            alt="Algo Learning Space"
            className="sidebar-logo-image"
          />
          <div className="sidebar-brand-copy">
            <span className="sidebar-logo-name">Algo</span>
            <span className="sidebar-logo-subtitle">Learning Space</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          {/* My Courses Link (Accordion) */}
          <div className="menu-item-container">
            <button
              type="button"
              className={`menu-item ${activeTab === 'course' ? 'active' : ''}`}
              onClick={() => setMyCoursesOpen((prev) => !prev)}
            >
              <svg className="menu-item-icon" viewBox="0 0 24 24">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>My Courses</span>
              <svg
                className={`menu-chevron ${myCoursesOpen ? 'open' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Submenu for active courses list */}
            <div className={`submenu ${myCoursesOpen ? 'open' : ''}`}>
              {courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  className={`submenu-item ${selectedCourseId === course.id ? 'active' : ''}`}
                  onClick={() => handleSelectCourse(course.id)}
                >
                  {findPathwayNodeForCourse(course)?.title || course.title || course.id}
                </button>
              ))}
            </div>
          </div>

          {/* Authentic Algorithmics Modules Sidebar List */}
          {lessonsData.length > 0 && (
            <div className="sidebar-modules-container">
              <div className="sidebar-course-badge">
                <img src="/course-badges/vp.png" alt="VP" className="sidebar-course-avatar" />
                <span className="sidebar-course-label">Visual Programming</span>
              </div>
              <div className="sidebar-modules-nav">
                {lessonsData.map((module, idx) => {
                  const isCurrent = idx === selectedModuleIndex;
                  const isLocked = module.isLocked === true;

                  return (
                    <button
                      key={module.id}
                      type="button"
                      disabled={isLocked}
                      className={`sidebar-module-btn ${isCurrent ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                      onClick={() => {
                        if (isLocked) {
                          triggerToast(`Module ${module.number} is locked.`);
                          return;
                        }
                        setSelectedModuleIndex(idx);
                        setSelectedLessonIndex(0);
                      }}
                    >
                      <div className="sidebar-module-ring">
                        <span className="ring-num">{isLocked ? '🔒' : module.number}</span>
                      </div>
                      <span className="sidebar-module-text">
                        {module.number}. {module.title.split(': ')[1] || module.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Coming Soon Sidebar items */}
          <button type="button" className="menu-item" onClick={() => triggerToast('Coming soon: Achievements')}>
            <svg className="menu-item-icon" viewBox="0 0 24 24">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
              <path d="M12 2a6 6 0 0 1 6 6v3.5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" />
            </svg>
            <span>Achievements</span>
          </button>

          <button type="button" className="menu-item" onClick={() => triggerToast('Coming soon: Calendar')}>
            <svg className="menu-item-icon" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Calendar</span>
          </button>

          <button type="button" className="menu-item" onClick={() => triggerToast('Coming soon: Messages')}>
            <svg className="menu-item-icon" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Messages</span>
          </button>

          <button type="button" className="menu-item" onClick={() => triggerToast('Coming soon: Resources')}>
            <svg className="menu-item-icon" viewBox="0 0 24 24">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>Resources</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-bottom">
          <button type="button" className="menu-item" onClick={() => triggerToast('Coming soon: Settings')}>
            <svg className="menu-item-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </button>

          <button type="button" className="menu-item" onClick={handleLogout}>
            <svg className="menu-item-icon" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Log out</span>
          </button>

          <div className="sidebar-profile">
            <div className="profile-avatar">👤</div>
            <div className="profile-info">
              <div className="profile-name">
                {profileName || studentName || 'VP Test Student'}{studentCode ? ` (${studentCode})` : ''}
              </div>
              <div className="profile-role">Student</div>
            </div>
          </div>
        </div>
      </aside>

      {/* CENTER WORKSPACE */}
      <main className="dashboard-center">
        {/* Header Greeting */}
        <header className="center-header">
          <div>
            <h1 className="greeting-title">Ready for your next challenge, {profileName || studentName || 'VP Test Student'}! 👋</h1>
            <p className="greeting-subtitle">Let's continue your learning journey today.</p>
          </div>

          <div className="header-actions">
          </div>
        </header>

        {/* 1. COSMIC DYNAMIC GENDER BANNER */}
        <section 
          className="learning-banner dynamic-banner"
          style={{ backgroundImage: `url('/assets/banner-${userGender}.png')` }}
        >
          <div className="banner-content">
            <h2 className="banner-title">
              {activeModule
                ? `Module ${activeModule.number}: ${activeModule.title.split(': ')[1] || activeModule.title}`
                : 'Loading your course...'}
            </h2>
            <p className="banner-subtitle">
              {findPathwayNodeForCourse({ id: selectedCourseId })?.title ||
                selectedCourseId ||
                'Your course'}
            </p>
          </div>
        </section>

        {/* MODULE PROGRESS CARD (CIRCULAR PROGRESS ON THE RIGHT) */}
        {activeTab === 'course' && activeModule && (
          <section className="module-progress-section">
            <div className="module-progress-details">
              <span className="progress-card-label">Module Progress</span>
              <h3 className="progress-module-title">
                Module {activeModule.number}: {activeModule.title.split(': ')[1] || activeModule.title}
              </h3>
              <p className="progress-module-stats">
                {activeModule.pageCount || 12} pages &bull; {activeModuleProgress.correctCount} / {activeModuleProgress.totalCount} tasks
              </p>
              
              <div
                className={`progress-status-pill ${
                  activeModule.isLocked
                    ? 'locked'
                    : activeModuleProgress.percentage === 100
                      ? 'completed'
                      : 'in-progress'
                }`}
              >
                <span className="status-pill-icon">
                  {activeModule.isLocked
                    ? '🔒'
                    : activeModuleProgress.percentage === 100
                      ? '🏆'
                      : '📖'}
                </span>
                <span className="status-pill-text">
                  {activeModule.isLocked
                    ? 'Locked until the first lesson in this module is scheduled.'
                    : activeModuleProgress.percentage === 100
                      ? 'Module completed. Great job!'
                      : 'In progress. Keep going!'}
                </span>
              </div>
            </div>

            <div className="module-progress-wheel">
              <svg className="progress-ring" width="100" height="100">
                <circle
                  className="progress-ring__background"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                  fill="transparent"
                  r="38"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="progress-ring__circle"
                  stroke="#6366f1"
                  strokeWidth="8"
                  fill="transparent"
                  r="38"
                  cx="50"
                  cy="50"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 38}`,
                    strokeDashoffset: `${2 * Math.PI * 38 * (1 - activeModuleProgress.percentage / 100)}`
                  }}
                />
              </svg>
              <div className="wheel-content">
                <span className="wheel-percentage">{activeModuleProgress.percentage}%</span>
                <span className="wheel-label">Completed</span>
              </div>
            </div>
          </section>
        )}

        {/* 2. COURSE MODULES TIMELINE */}
        <section className="journey-section">
          <div className="section-header">
            <h3 className="section-title">Course Modules Progress</h3>
          </div>

          <div className="timeline-wrapper">
            <div className="timeline-line">
              {loadingLessons ? (
                <p className="dashboard-loading-text">Loading course timeline...</p>
              ) : lessonsData.length > 0 ? (
                lessonsData.map((module, index) => {
                  const isCurrent = index === selectedModuleIndex;
                  const isLocked = module.isLocked === true;

                  const statusClass = isLocked
                    ? 'locked'
                    : isCurrent
                      ? 'active'
                      : 'completed';

                  const statusLabel = isLocked ? '🔒' : `${module.number}`;

                  return (
                    <div key={module.id} className="timeline-step">
                      <button
                        type="button"
                        disabled={isLocked}
                        aria-disabled={isLocked}
                        className={`step-node ${statusClass}`}
                        onClick={() => {
                          if (isLocked) {
                            triggerToast(
                              `Module ${module.number} is locked until its first lesson is scheduled.`
                            );
                            return;
                          }

                          setSelectedModuleIndex(index);
                          setSelectedLessonIndex(0);
                        }}
                      >
                        {statusLabel}
                      </button>
                      <span className={`step-name ${isCurrent ? 'active' : ''}`}>
                        Module {module.number}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="dashboard-loading-text">No course modules are available.</p>
              )}
            </div>
          </div>
        </section>

        {/* 3. ALGORITHMICS LESSONS ARCHIVE CURRICULUM VIEW (MATCHING AUTHENTIC LMS) */}
        <section className="algo-module-curriculum">
          {activeModule ? (
            activeModule.lessons && activeModule.lessons.length > 0 ? (
              activeModule.lessons.map((lesson) => {
                const isLessonLocked = lesson.isLocked === true;
                const headerTitle =
                  lesson.headerTitle ||
                  `LESSON ${lesson.lessonNum || lesson.number}. ${lesson.code || lesson.id}. ${(lesson.title || '').toUpperCase()}`;

                return (
                  <div key={lesson.key || lesson.id} className="algo-lesson-section">
                    <div className="algo-lesson-header">
                      <h3 className="algo-lesson-heading">{headerTitle}</h3>
                    </div>

                    <div className="algo-activities-row">
                      {lesson.pages && lesson.pages.length > 0 ? (
                        lesson.pages.map((page) => {
                          const pageId = page.id || page.pageId;
                          const isPageLocked = isLessonLocked || page.isLocked === true;
                          const progress = getPageProgress(page, lesson.id);
                          const isCompleted = progress.isCompleted;
                          const isBonus = page.isBonus || page.activityBadge === '★';
                          const isSlide = page.isSlide;
                          const badgeSymbol = page.activityBadge || (isBonus ? '★' : isSlide ? 'SLIDE' : '•');

                          return (
                            <button
                              key={pageId}
                              type="button"
                              disabled={isPageLocked}
                              aria-disabled={isPageLocked}
                              className={[
                                'algo-activity-item',
                                isPageLocked ? 'locked' : '',
                                isCompleted ? 'completed' : '',
                                isBonus ? 'bonus' : '',
                                isSlide ? 'slide' : ''
                              ].filter(Boolean).join(' ')}
                              onClick={() => {
                                if (isPageLocked) return;
                                handleLaunchPage(activeModule.id, pageId);
                              }}
                            >
                              <div className="algo-circle-node">
                                {/* Top-right badge: fraction (e.g. 10/14) or yellow checkmark (✓) */}
                                <span className={`algo-circle-badge ${isCompleted ? 'badge-completed' : ''}`}>
                                  {isCompleted ? '✓' : `${progress.completed}/${progress.total}`}
                                </span>

                                {/* Center symbol: gold star ★, SLIDE, or task number */}
                                <div className="algo-circle-symbol">
                                  {isBonus ? (
                                    <span className="algo-star-icon">★</span>
                                  ) : isSlide ? (
                                    <span className="algo-slide-icon">SLIDE</span>
                                  ) : (
                                    <span className="algo-number-icon">{badgeSymbol}</span>
                                  )}
                                </div>
                              </div>

                              {/* Title underneath the circle */}
                              <span className="algo-activity-title" title={page.displayTitle || page.title}>
                                {page.displayTitle || page.title}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <p className="dashboard-empty-pages">No activities in this lesson.</p>
                      )}
                    </div>

                    <hr className="algo-lesson-divider" />
                  </div>
                );
              })
            ) : (
              <div className="continue-card dashboard-loading-card">
                <p className="dashboard-loading-text">No lessons found in this module.</p>
              </div>
            )
          ) : (
            <div className="continue-card dashboard-loading-card">
              <p className="dashboard-loading-text">
                {loadingLessons ? 'Loading lessons...' : 'No lessons are available.'}
              </p>
            </div>
          )}
        </section>

{/* Motivational message banner */}
        <div className="motivational-banner">
          <span className="moti-icon">👾</span>
          <p className="moti-text">
            Keep going, {profileName || studentName || 'VP Test Student'}! You're doing great! Every lesson brings you closer to becoming a creator.
          </p>
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="dashboard-right">
        {/* Compact My Courses overview */}
        <div className="right-card right-courses-card">
          <div className="right-card-header right-courses-header">
            <h4 className="right-card-title right-courses-title">My Courses</h4>
            {upcomingCourse && (
              <span className="right-courses-count">1 upcoming</span>
            )}
          </div>

          <div className="right-courses-list">
            {currentCourseCards.length > 0 ? (
              currentCourseCards.map(({ course, title, icon }) => (
                <button
                  key={course.id}
                  type="button"
                  className={`right-course-item right-course-current ${
                    selectedCourseId === course.id ? 'selected' : ''
                  }`}
                  onClick={() => handleSelectCourse(course.id)}
                >
                  <span className="right-course-icon">
                    <img src={icon} alt={`${title} badge`} />
                  </span>

                  <span className="right-course-content">
                    <span className="right-course-heading">
                      <span className="right-course-name">{title}</span>
                      <span className="right-course-status current">Current</span>
                    </span>
                    <span className="right-course-description">
                      Open this course to continue learning.
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="right-courses-empty">No current courses are available.</p>
            )}

            {upcomingCourse && (
              <div className="right-course-item right-course-upcoming">
                <span className="right-course-icon upcoming">
                  <img
                    src={getCourseBadgeAsset(upcomingCourse.code) || upcomingCourse.icon}
                    alt={`${upcomingCourse.title} badge`}
                  />
                </span>

                <span className="right-course-content">
                  <span className="right-course-heading">
                    <span className="right-course-name">{upcomingCourse.title}</span>
                    <span className="right-course-status upcoming">Upcoming</span>
                  </span>
                  <span className="right-course-description">
                    Your next course in the main pathway.
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Achievements Card */}
        <div className="right-card">
          <div className="coming-soon-overlay">
            <span className="coming-soon-badge">Coming soon</span>
          </div>

          <div className="right-card-header">
            <h4 className="right-card-title">Achievements</h4>
          </div>

          <div className="achievements-list">
            <div className="achievement-row">
              <div className="ach-icon">🏆</div>
              <div className="ach-info">
                <h5 className="ach-name">Completed Lessons</h5>
                <p className="ach-desc">8 lessons completed</p>
              </div>
            </div>
            <div className="achievement-row">
              <div className="ach-icon">🔥</div>
              <div className="ach-info">
                <h5 className="ach-name">Current Streak</h5>
                <p className="ach-desc">3 weeks active</p>
              </div>
            </div>
            <div className="achievement-row">
              <div className="ach-icon">📈</div>
              <div className="ach-info">
                <h5 className="ach-name">Quiz Average</h5>
                <p className="ach-desc">92% score rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Class Card */}
        <div className="right-card">
          <div className="coming-soon-overlay">
            <span className="coming-soon-badge">Coming soon</span>
          </div>

          <div className="right-card-header">
            <h4 className="right-card-title">Upcoming Class</h4>
          </div>

          <div style={{ opacity: 0.5 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Saturday, 10:00 AM</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Teacher Kevin Nguyen</div>
            <div
              style={{
                background: '#e0e7ff',
                color: '#4f46e5',
                padding: '10px',
                borderRadius: '10px',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: 13
              }}
            >
              Join Google Meet
            </div>
          </div>
        </div>

        {/* Teacher Feedback Card */}
        <div className="right-card">
          <div className="coming-soon-overlay">
            <span className="coming-soon-badge">Coming soon</span>
          </div>

          <div className="right-card-header">
            <h4 className="right-card-title">Teacher Feedback</h4>
          </div>

          <div style={{ opacity: 0.5, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#cbd5e1',
                display: 'grid',
                placeItems: 'center',
                fontSize: 16
              }}
            >
              👨‍🏫
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Kevin Nguyen</div>
              <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                "Great job using loops this week! Remember to practise nested loops before next lesson."
              </p>
              <span style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginTop: 4 }}>2 days ago</span>
            </div>
          </div>
        </div>
      </aside>

      {/* TOASTS PORTAL */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <span>ℹ️</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* LESSON COMPLETION CELEBRATION MODAL */}
      {showCelebration && celebratedLesson && (
        <div className="celebration-overlay">
          {/* Confetti particles */}
          <div className="confetti-container">
            {Array.from({ length: 50 }).map((_, i) => {
              const left = Math.random() * 100;
              const delay = Math.random() * 2.5;
              const duration = 2.5 + Math.random() * 2.5;
              const colors = ['#f43f5e', '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4'];
              const color = colors[Math.floor(Math.random() * colors.length)];
              const rotation = Math.random() * 360;
              const size = 6 + Math.random() * 8;
              const isCircle = Math.random() > 0.5;

              return (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${left}%`,
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`,
                    backgroundColor: color,
                    transform: `rotate(${rotation}deg)`,
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: isCircle ? '50%' : '2px'
                  }}
                />
              );
            })}
          </div>

          {/* Modal Card */}
          <div className="celebration-card animate-celebration">
            <button 
              type="button" 
              className="celebration-close-btn"
              onClick={handleCloseCelebration}
            >
              &times;
            </button>

            {/* Left side character illustration overlay */}
            <div className="celebration-character-section">
              <img 
                src={`/assets/celebration-${userGender}.png`} 
                alt="Celebration Character" 
                className="celebration-character-img"
              />
            </div>

            {/* Right side congratulatory content */}
            <div className="celebration-content-section">
              <div className="celebration-success-badge">
                <span className="badge-checkmark">✓</span>
              </div>

              <h2 className="celebration-title">Amazing work, {profileName || studentName || 'VP Test Student'}!</h2>
              <p className="celebration-subtitle">You completed <span className="highlight-lesson">{celebratedLesson.title}</span></p>

              {/* Stats Grid (Only 2 columns: activities completed, and score) */}
              <div className="celebration-stats-grid">
                <div className="celebration-stat-box">
                  <span className="stat-box-label">Activities Completed</span>
                  <span className="stat-box-value value-green">
                    {getLessonProgress(celebratedLesson).completedCount} / {getLessonProgress(celebratedLesson).totalCount}
                  </span>
                </div>
                <div className="celebration-stat-box">
                  <span className="stat-box-label">Lesson Score</span>
                  <span className="stat-box-value value-purple">100%</span>
                  <span className="stat-box-badge badge-gold">Excellent!</span>
                </div>
              </div>

              {/* Motivational Footer Pill */}
              <div className="celebration-footer-pill">
                <span className="footer-pill-icon">⭐</span>
                <p className="footer-pill-text">
                  <strong>You're building real coding skills!</strong> Keep practising and you'll go even further.
                </p>
              </div>

              {/* Action Button */}
              <button 
                type="button" 
                className="celebration-action-btn"
                onClick={handleCloseCelebration}
              >
                Back to Lessons
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
