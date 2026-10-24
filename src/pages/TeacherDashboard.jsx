import { useEffect, useState, useMemo } from 'react';
import TeacherCoursePreview from '../components/TeacherCoursePreview.jsx';
import customNames from '../config/mapping.json';

function isModuleCatalogEntry(entry) {
  const id = String(entry?.id || entry?.moduleId || '').trim();
  if (!id || /L\d+/i.test(id)) return false;
  return /(?:^|[_-])M\d+(?:[_-]|$)|graduation/i.test(id);
}

const CATALOG_URL = '/courses/index.json';

export default function TeacherDashboard() {
  const getStoredCourseId = () =>
    sessionStorage.getItem('lms_course_id') ||
    localStorage.getItem('lms_course_id') ||
    '';

  const mapCatalogIdToDbId = (id) => {
    const storedCourseId = getStoredCourseId();
    return storedCourseId || id;
  };

  const mapDbIdToCatalogId = (id) => {
    const storedCourseId = getStoredCourseId();
    const catalogCourseId = catalog?.courses?.[0]?.id || '';

    if (storedCourseId && String(id) === String(storedCourseId)) {
      return catalogCourseId || id;
    }

    return id;
  };

  const getValidSupabaseToken = (anonKey) => {
    const cachedToken = localStorage.getItem('lms_access_token');
    if (!cachedToken) return anonKey;

    try {
      const parts = cachedToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (typeof payload.exp === 'number') {
          const isExpired = payload.exp < (Date.now() / 1000);
          if (isExpired) {
            console.warn('TeacherDashboard: lms_access_token has expired. Falling back to anon key.');
            return anonKey;
          }
        }
      }
    } catch (e) {
      console.warn('TeacherDashboard: Failed to parse access token. Falling back to anon key.', e);
      return anonKey;
    }

    return cachedToken;
  };

  const fetchStudentProfilesAndMerge = async (membersList, supabaseUrl, supabaseKey, supabaseToken) => {
    if (!Array.isArray(membersList) || membersList.length === 0) return [];
    
    try {
      const emails = membersList.map((m) => m.email).filter(Boolean);
      if (emails.length === 0) {
        return membersList.map((m) => ({
          id: m.google_user_id || m.email,
          name: m.name || m.email.split('@')[0],
          email: m.email,
        }));
      }

      const formattedEmails = emails.map((e) => `"${e.trim().toLowerCase()}"`).join(',');
      const url = `${supabaseUrl}/rest/v1/user_profiles?email=in.(${encodeURIComponent(formattedEmails)})&select=*`;
      
      const res = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseToken}`
        }
      });
      if (!res.ok) throw new Error(`Profiles fetch failed: ${res.status}`);
      const profiles = await res.json();
      console.log('TeacherDashboard: resolved user_profiles:', profiles);

      // Create a map by email
      const profileMap = {};
      if (Array.isArray(profiles)) {
        profiles.forEach((p) => {
          if (p.email) {
            profileMap[p.email.toLowerCase().trim()] = p;
          }
        });
      }

      return membersList.map((m) => {
        const emailKey = String(m.email || '').toLowerCase().trim();
        const profile = profileMap[emailKey] || {};
        
        // Resolve student name: profile name fallback to member name fallback to email prefix
        const resolvedName = profile.name || profile.display_name || profile.full_name || m.name || emailKey.split('@')[0];
        
        return {
          id: m.google_user_id || m.email,
          name: resolvedName,
          email: m.email,
          username: profile.username || '',
          password: profile.password || '',
          studentCode: profile.student_code || profile['student code'] || profile.student_id || m.x_studio_student_code || '',
          gender: profile.gender || 'male',
          courseId: m.courseId,
          courseTitle: m.courseTitle
        };
      });
    } catch (err) {
      console.warn('TeacherDashboard: failed to merge student profiles:', err);
      return membersList.map((m) => ({
        id: m.google_user_id || m.email,
        name: m.name || m.email.split('@')[0],
        email: m.email,
        courseId: m.courseId,
        courseTitle: m.courseTitle
      }));
    }
  };

  const [catalog, setCatalog] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedCourseData, setSelectedCourseData] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedModuleData, setSelectedModuleData] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState('');

  const [myClassesOpen, setMyClassesOpen] = useState(true);

  // Preview Mode State
  const [selectedPreviewCourseId, setSelectedPreviewCourseId] = useState('');

  // DB Data
  const [students, setStudents] = useState([]);
  const [dbAttempts, setDbAttempts] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [resolvedCourseId, setResolvedCourseId] = useState('');
  const [courseModulesData, setCourseModulesData] = useState([]);
  const [profileTeacherName, setProfileTeacherName] = useState('');

  // Tab navigation states
  const [activeTab, setActiveTab] = useState('classes');
  const [allStudents, setAllStudents] = useState([]);
  const [allAttempts, setAllAttempts] = useState([]);
  const [tabSelectedStudent, setTabSelectedStudent] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [dashboardSearchSubmitted, setDashboardSearchSubmitted] = useState(false);

  // My Classes view controls
  const [classProgressFilter, setClassProgressFilter] = useState('all');
  const [classSortMode, setClassSortMode] = useState('progress-asc');
  const [selectedPageId, setSelectedPageId] = useState('overview');
  
  // Toast notifier
  const [toasts, setToasts] = useState([]);
  const triggerToast = (message = 'Coming soon') => {
    const id = Date.now();

    // Keep only one notification visible at a time.
    setToasts([{ id, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const supabaseUrl = localStorage.getItem('lms_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = localStorage.getItem('lms_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;
  const currentTeacherEmail =
    localStorage.getItem('lms_user_email') ||
    localStorage.getItem('lms_student_email') ||
    '';
  const teacherDisplayName = profileTeacherName || (currentTeacherEmail
    ? currentTeacherEmail
        .split('@')[0]
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Teacher');
  const isDbMode = !!(supabaseUrl && supabaseKey);

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

  // Load Course Catalog List
  useEffect(() => {
    fetch(CATALOG_URL)
      .then((res) => res.json())
      .then((data) => {
        setCatalog(data);
        if (data.courses && data.courses.length > 0) {
          const firstCourse = data.courses[0];
          setSelectedCourseId(firstCourse.id);
        }
      })
      .catch((err) => console.error('Failed to load courses list:', err));
  }, []);

  // Load Course Details (Modules)
  useEffect(() => {
    if (!selectedCourseId || !catalog) return;

    const courseInfo = catalog.courses.find(
      (course) => course.id === selectedCourseId
    );
    if (!courseInfo) return;

    const courseUrl =
      courseInfo.index ||
      `/courses/${encodeURIComponent(selectedCourseId)}/index.json`;

    fetch(courseUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load course details');
        return res.json();
      })
      .then(async (data) => {
        const modules = (data.lessons || data.modules || courseInfo.lessons || [])
          .filter(isModuleCatalogEntry)
          .sort((a, b) => {
            const numA = parseInt(String(a.id || '').match(/M(\d+)/i)?.[1] || '999', 10);
            const numB = parseInt(String(b.id || '').match(/M(\d+)/i)?.[1] || '999', 10);
            return numA - numB;
          })
          .map((module) => ({
            ...module,
            title: customNames?.modules?.[module.id] || module.title,
          }));

        // Fetch all modules' data in parallel to calculate absolute lesson offsets
        const modulePromises = modules.map((mod) => {
          const indexUrl = mod.index || `/courses/${encodeURIComponent(selectedCourseId)}/${encodeURIComponent(mod.id)}/index.json`;
          return fetch(indexUrl)
            .then((r) => r.ok ? r.json() : null)
            .catch(() => null);
        });
        const modulesData = await Promise.all(modulePromises);
        setCourseModulesData(modulesData.filter(Boolean));

        // Also set resolved database course ID
        setResolvedCourseId(mapCatalogIdToDbId(selectedCourseId));

        setSelectedCourseData({
          ...data,
          lessons: modules,
        });

        setSelectedModuleId((currentModuleId) => {
          if (modules.some((module) => module.id === currentModuleId)) {
            return currentModuleId;
          }
          return modules[0]?.id || '';
        });
        setSelectedLessonId('');
      })
      .catch((error) => {
        console.error('Failed to load course details:', error);
        setSelectedCourseData(null);
        setSelectedModuleId('');
      });
  }, [selectedCourseId, catalog]);

  // Load Module Details (Pages)
  useEffect(() => {
    if (!selectedModuleId || !selectedCourseData) return;

    const moduleInfo = selectedCourseData.lessons.find(
      (module) => module.id === selectedModuleId
    );
    if (!moduleInfo) return;

    // VP stores its module pages directly in /courses/VP/index.json.
    if (
      Array.isArray(moduleInfo.pages) ||
      Array.isArray(moduleInfo.lessons)
    ) {
      setSelectedModuleData(moduleInfo);
      setSelectedLessonId('');
      return;
    }

    const moduleUrl =
      moduleInfo.index ||
      `/courses/${encodeURIComponent(selectedCourseId)}/${encodeURIComponent(selectedModuleId)}/index.json`;

    fetch(moduleUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load module ${selectedModuleId}`);
        return res.json();
      })
      .then((data) => {
        setSelectedModuleData(data);
        setSelectedLessonId('');
      })
      .catch((error) => {
        console.error('Failed to load module details:', error);
        setSelectedModuleData(moduleInfo);
      });
  }, [selectedCourseId, selectedModuleId, selectedCourseData]);

  // Query DB Students & Attempts for the selected course dynamically
  useEffect(() => {
    if (!isDbMode || !selectedCourseId) {
      setStudents([]);
      setDbAttempts([]);
      return;
    }

    const dbCourseId = mapCatalogIdToDbId(selectedCourseId);
    const supabaseToken = getValidSupabaseToken(supabaseKey);
    console.log('TeacherDashboard: Starting DB queries...', {
      supabaseUrl,
      hasKey: !!supabaseKey,
      hasToken: !!localStorage.getItem('lms_access_token'),
      selectedCourseId,
      dbCourseId
    });

    // 1. Resolve real numeric course ID from code or saved course ID (e.g. 'PTSY1')
    const savedCourseId = localStorage.getItem('lms_course_id');
    const lookupId = savedCourseId || dbCourseId;
    const courseLookupFilter = /^\d+$/.test(String(lookupId))
      ? `id=eq.${encodeURIComponent(lookupId)}`
      : `code=eq.${encodeURIComponent(lookupId)}`;
    const coursesUrl = `${supabaseUrl}/rest/v1/classroom_courses?${courseLookupFilter}&select=id,code,title`;
    fetch(coursesUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseToken}`
      }
    })
      .then((res) => {
        console.log('TeacherDashboard: coursesUrl response status:', res.status);
        if (!res.ok) throw new Error(`Failed to resolve course ID (status ${res.status})`);
        return res.json();
      })
      .then((courseData) => {
        console.log('TeacherDashboard: resolved courseData:', courseData);
        const realCourseId = (courseData && courseData[0] && courseData[0].id) || dbCourseId;
        console.log('TeacherDashboard: resolved realCourseId:', realCourseId);

        // 2. Fetch course members (students) using the resolved realCourseId
        const membersUrl = `${supabaseUrl}/rest/v1/classroom_course_members?course_id=eq.${realCourseId}&role=eq.student&select=google_user_id,name,email`;
        console.log('TeacherDashboard: fetching members from:', membersUrl);
        fetch(membersUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseToken}`
          }
        })
          .then((res) => {
            console.log('TeacherDashboard: membersUrl response status:', res.status);
            if (!res.ok) throw new Error(`Failed to fetch members (status ${res.status})`);
            return res.json();
          })
          .then((data) => {
            console.log('TeacherDashboard: members data returned:', data);
            if (Array.isArray(data) && data.length > 0) {
              console.log(`TeacherDashboard: Found ${data.length} real students in DB. Setting state.`);
              fetchStudentProfilesAndMerge(data, supabaseUrl, supabaseKey, supabaseToken)
                .then((merged) => setStudents(merged));
            } else {
              setStudents([]);
            }
          })
          .catch((err) => {
            console.error('TeacherDashboard: error loading course members:', err);
            setStudents([]);
          });

        // 3. Fetch progress from activity_progress using either realCourseId or the code selectedCourseId
        const attemptsUrl = `${supabaseUrl}/rest/v1/activity_progress?or=(course_id.eq.${realCourseId},course_id.eq.${selectedCourseId})&select=user_id,course_id,lesson_id,page_id,task_id,status,is_completed`;
        console.log('TeacherDashboard: fetching progress from:', attemptsUrl);
        fetch(attemptsUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseToken}`
          }
        })
          .then((res) => {
            console.log('TeacherDashboard: attemptsUrl (activity_progress) response status:', res.status);
            if (!res.ok) throw new Error(`Failed to fetch progress (status ${res.status})`);
            return res.json();
          })
          .then((data) => {
            console.log(`TeacherDashboard: fetched ${data?.length || 0} progress rows from DB.`);
            if (Array.isArray(data)) {
              setDbAttempts(data);
            }
          })
          .catch((err) => {
            console.error('TeacherDashboard: error fetching progress:', err);
            setDbAttempts([]);
          });
      })
      .catch((err) => {
        console.error('TeacherDashboard: error in resolution chain, running direct fallback:', err);
        // Fallback directly using dbCourseId
        const membersUrl = `${supabaseUrl}/rest/v1/classroom_course_members?course_id=eq.${dbCourseId}&role=eq.student&select=google_user_id,name,email`;
        fetch(membersUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseToken}`
          }
        })
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data) && data.length > 0) {
              fetchStudentProfilesAndMerge(data, supabaseUrl, supabaseKey, supabaseToken)
                .then((merged) => setStudents(merged));
            } else {
              setStudents([]);
            }
          })
          .catch((err) => {
            console.error('TeacherDashboard: direct member fallback failed:', err);
            setStudents([]);
          });

        const attemptsUrl = `${supabaseUrl}/rest/v1/activity_progress?or=(course_id.eq.${dbCourseId},course_id.eq.${selectedCourseId})&select=user_id,course_id,lesson_id,page_id,task_id,status,is_completed`;
        fetch(attemptsUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseToken}`
          }
        })
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setDbAttempts(data);
            }
          })
          .catch((err) => {
            console.error('TeacherDashboard: direct progress fallback failed:', err);
            setDbAttempts([]);
          });
      });
  }, [selectedCourseId, isDbMode, supabaseUrl, supabaseKey]);

  // Centralized load for the 'Students' directory tab
  useEffect(() => {
    if (!isDbMode || !currentTeacherEmail) {
      setAllStudents([]);
      setAllAttempts([]);
      setTabSelectedStudent(null);
      return;
    }

    const teacherEmail = currentTeacherEmail;
    const supabaseToken = getValidSupabaseToken(supabaseKey);

    // Step 1: Fetch classroom_course_memberships where role is teacher for this email
    const teacherCoursesUrl = `${supabaseUrl}/rest/v1/classroom_course_members?email=eq.${teacherEmail}&role=eq.teacher&select=course_id`;
    
    fetch(teacherCoursesUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseToken}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch teacher course memberships');
        return res.json();
      })
      .then((memberships) => {
        if (!Array.isArray(memberships) || memberships.length === 0) {
          setAllStudents([]);
          setAllAttempts([]);
          setTabSelectedStudent(null);
          return null;
        }

        const teacherCourseIds = memberships.map((m) => m.course_id);

        // Step 2: Fetch classroom_courses corresponding to only the courses taught by this teacher
        const coursesUrl = `${supabaseUrl}/rest/v1/classroom_courses?id=in.(${teacherCourseIds.join(',')})&select=id,code,title`;
        return fetch(coursesUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseToken}`
          }
        });
      })
      .then((res) => {
        if (!res) return null;
        if (!res.ok) throw new Error('Failed to fetch courses list');
        return res.json();
      })
      .then((coursesList) => {
        if (!coursesList || !Array.isArray(coursesList) || coursesList.length === 0) {
          setAllStudents([]);
          setAllAttempts([]);
          setTabSelectedStudent(null);
          return;
        }

        // Keep courses represented by this repo's catalog. While the code column is
        // being backfilled, the numeric course ID handed off by the platform is also accepted.
        const catalogCourseKeys = new Set(
          (catalog?.courses || []).flatMap((course) => [
            String(course.id || ''),
            String(course.code || ''),
            String(mapCatalogIdToDbId(course.id) || ''),
          ]).filter(Boolean)
        );

        const activeCoursesList = coursesList.filter((course) =>
          catalogCourseKeys.has(String(course.id || '')) ||
          catalogCourseKeys.has(String(course.code || ''))
        );

        if (activeCoursesList.length === 0) {
          setAllStudents([]);
          setAllAttempts([]);
          setTabSelectedStudent(null);
          return;
        }

        // For each course in the teacher's courses, fetch members and progress in parallel
        const memberPromises = [];
        const progressPromises = [];

        activeCoursesList.forEach((c) => {
          // Fetch members (students) for this course
          const mUrl = `${supabaseUrl}/rest/v1/classroom_course_members?course_id=eq.${c.id}&role=eq.student&select=google_user_id,name,email`;
          const mPromise = fetch(mUrl, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseToken}` }
          })
            .then((res) => res.json())
            .then((data) => {
              if (Array.isArray(data)) {
                return data.map((m) => ({
                  ...m,
                  courseId: c.code || c.id,
                  courseTitle: c.title
                }));
              }
              return [];
            })
            .catch(() => []);
          memberPromises.push(mPromise);

          // Fetch progress (only for this course)
          const catalogId = c.code || mapDbIdToCatalogId(c.id);
          const pUrl = `${supabaseUrl}/rest/v1/activity_progress?or=(course_id.eq.${c.id},course_id.eq.${catalogId})&select=user_id,course_id,lesson_id,page_id,task_id,status,is_completed`;
          const pPromise = fetch(pUrl, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseToken}` }
          })
            .then((res) => res.json())
            .then((data) => Array.isArray(data) ? data : [])
            .catch(() => []);
          progressPromises.push(pPromise);
        });

        Promise.all(memberPromises).then((results) => {
          const mergedMembers = results.flat();
          
          fetchStudentProfilesAndMerge(mergedMembers, supabaseUrl, supabaseKey, supabaseToken)
            .then((mergedWithProfiles) => {
              // Group members by email so a student enrolled in multiple courses has a single profile containing all courses
              const studentMap = {};
              mergedWithProfiles.forEach((m) => {
                if (!m.email) return;
                const email = m.email.toLowerCase();
                if (!studentMap[email]) {
                  studentMap[email] = {
                    id: m.id,
                    name: m.name,
                    email: m.email,
                    username: m.username,
                    password: m.password,
                    studentCode: m.studentCode,
                    gender: m.gender,
                    courses: []
                  };
                }
                // Check if course already added
                if (!studentMap[email].courses.some((x) => x.id === m.courseId)) {
                  studentMap[email].courses.push({
                    id: m.courseId,
                    title: m.courseTitle
                  });
                }
              });

              const studentsList = Object.values(studentMap);
              if (studentsList.length > 0) {
                setAllStudents(studentsList);
                setTabSelectedStudent(studentsList[0]);
              } else {
                setAllStudents([]);
                setTabSelectedStudent(null);
              }
            });
        });

        Promise.all(progressPromises).then((results) => {
          const mergedProgress = results.flat();
          setAllAttempts(mergedProgress);
        });
      })
      .catch((err) => {
        console.error('Failed to load all student info:', err);
        setAllStudents([]);
        setAllAttempts([]);
        setTabSelectedStudent(null);
      });
  }, [catalog, isDbMode, supabaseUrl, supabaseKey, currentTeacherEmail]);

  // Load Teacher Profile Display Name
  useEffect(() => {
    if (!isDbMode || !currentTeacherEmail) {
      setProfileTeacherName('');
      return;
    }

    const supabaseToken = getValidSupabaseToken(supabaseKey);

    if (supabaseUrl && supabaseKey) {
      const teacherUrl = `${supabaseUrl}/rest/v1/classroom_course_members?email=eq.${encodeURIComponent(currentTeacherEmail)}&role=eq.teacher&select=name`;
      fetch(teacherUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseToken}`
        }
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data[0] && data[0].name) {
            setProfileTeacherName(data[0].name);
          }
        })
        .catch((err) => {
          console.warn('TeacherDashboard: failed to load teacher profile name:', err);
        });
    }
  }, [isDbMode, supabaseUrl, supabaseKey, currentTeacherEmail]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter(
      (s) => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
             s.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
    );
  }, [allStudents, studentSearchQuery]);

  // Group pages in the selected module into lessons.
  // Support both nested lesson data and VP's flat module pages array.
  const lessons = useMemo(() => {
    if (!selectedModuleData) return [];

    const flatPages = Array.isArray(selectedModuleData.pages)
      ? selectedModuleData.pages
      : [];
    const lessonCatalog = Array.isArray(selectedModuleData.lessons)
      ? selectedModuleData.lessons
      : [];
    const pagesByLesson = new Map();

    flatPages.forEach((page) => {
      const rawPageId = String(page.id || page.pageId || '');
      const lessonId =
        page.lessonId ||
        rawPageId.match(/^(.+?_M\d+L\d+)(?:_|$)/i)?.[1] ||
        '';

      if (!lessonId) return;

      if (!pagesByLesson.has(lessonId)) {
        pagesByLesson.set(lessonId, []);
      }

      pagesByLesson.get(lessonId).push(page);
    });

    const sortPages = (pages) =>
      [...pages].sort((a, b) => {
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

    // Calculate lesson offset before the selected module
    let offset = 0;
    if (selectedCourseData && selectedCourseData.lessons && courseModulesData.length > 0) {
      const sortedModules = selectedCourseData.lessons;
      const currentModuleIdx = sortedModules.findIndex((m) => m.id === selectedModuleId);
      for (let i = 0; i < currentModuleIdx; i++) {
        const prevModId = sortedModules[i].id;
        const prevModData = courseModulesData.find((m) => m.id === prevModId);
        
        // Count lessons in this previous module
        if (prevModData) {
          if (prevModData.lessons && prevModData.lessons.length > 0) {
            offset += prevModData.lessons.length;
          } else if (prevModData.pages && prevModData.pages.length > 0) {
            const uniqueNums = new Set();
            prevModData.pages.forEach((page) => {
              const match = String(page.id || page.pageId || '').match(/L(\d+)/i);
              const lessonNum = match ? parseInt(match[1], 10) : 1;
              uniqueNums.add(lessonNum);
            });
            offset += uniqueNums.size;
          }
        }
      }
    }

    if (lessonCatalog.length > 0) {
      return lessonCatalog.map((lesson, index) => {
        const lessonId = lesson.id || lesson.lessonId;
        const lessonPages = Array.isArray(lesson.pages) && lesson.pages.length > 0
          ? lesson.pages
          : pagesByLesson.get(lessonId) || [];

        return {
          ...lesson,
          id: lessonId,
          num: offset + index + 1,
          displayNum: index + 1,
          title:
            customNames?.lessons?.[lessonId] ||
            lesson.title ||
            `Lesson ${index + 1}`,
          pages: sortPages(lessonPages),
        };
      });
    }

    return Array.from(pagesByLesson.entries())
      .sort(([lessonIdA], [lessonIdB]) => {
        const numA = parseInt(lessonIdA.match(/L(\d+)/i)?.[1] || '0', 10);
        const numB = parseInt(lessonIdB.match(/L(\d+)/i)?.[1] || '0', 10);
        return numA - numB;
      })
      .map(([lessonId, lessonPages], index) => ({
        id: lessonId,
        num: offset + index + 1,
        displayNum: index + 1,
        title: customNames?.lessons?.[lessonId] || `Lesson ${index + 1}`,
        pages: sortPages(lessonPages),
      }));
  }, [selectedModuleData, selectedCourseId, selectedModuleId, selectedCourseData, courseModulesData, customNames]);

  // Select the first valid lesson whenever the module changes.
  useEffect(() => {
    if (
      lessons.length > 0 &&
      !lessons.some((lesson) => lesson.id === selectedLessonId)
    ) {
      setSelectedLessonId(lessons[0].id);
    }
  }, [lessons, selectedLessonId]);

  const activeLesson = useMemo(() => {
    return lessons.find((l) => l.id === selectedLessonId) || lessons[0] || null;
  }, [lessons, selectedLessonId]);

  useEffect(() => {
    setSelectedPageId('overview');
    setClassProgressFilter('all');
    setSelectedStudent(null);
  }, [selectedModuleId, selectedLessonId]);

  // Calculate Student Progress Metrics
  const getStudentProgressForPage = (studentEmail, page) => {
    const taskCount = Number(page.taskCount) || 0;
    const pageId = page.id || page.pageId;

    const studentAttempts = dbAttempts.filter(
      (a) => a.user_id?.trim().toLowerCase() === studentEmail.trim().toLowerCase()
    );

    const correctTasks = new Set();
    studentAttempts.forEach((attempt) => {
      const isCompleted =
        attempt.status === 'completed' ||
        attempt.is_completed === true ||
        attempt.status === 'correct' ||
        String(attempt.feedback || '').toLowerCase().includes('correct');

      if (isCompleted && attempt.page_id === pageId && attempt.task_id) {
        correctTasks.add(attempt.task_id);
      }
    });

    const completed = correctTasks.size;
    const percentage = taskCount > 0
      ? Math.min(100, Math.round((completed / taskCount) * 100))
      : 0;

    return {
      percentage,
      completed,
      total: taskCount
    };
  };

  const getStudentProgressForLesson = (studentEmail, lesson) => {
    if (!lesson || !lesson.pages) return { percentage: 0, completed: 0, total: 0 };

    let totalTasks = 0;
    let completedTasks = 0;

    lesson.pages.forEach((page) => {
      const pageProg = getStudentProgressForPage(studentEmail, page);
      totalTasks += pageProg.total;
      completedTasks += pageProg.completed;
    });

    if (totalTasks === 0) return { percentage: 0, completed: 0, total: 0 };
    const percentage = Math.min(100, Math.round((completedTasks / totalTasks) * 100));

    return {
      percentage,
      completed: completedTasks,
      total: totalTasks
    };
  };


  const getProgressStatus = (percentage) => {
    if (percentage >= 100) {
      return {
        key: 'completed',
        label: 'Completed',
        description: 'All lesson tasks are complete.'
      };
    }

    if (percentage === 0) {
      return {
        key: 'not-started',
        label: 'Not started',
        description: 'No completed tasks in this lesson yet.'
      };
    }

    if (percentage < 25) {
      return {
        key: 'needs-attention',
        label: 'Needs attention',
        description: 'The student started but has made limited progress.'
      };
    }

    return {
      key: 'in-progress',
      label: 'In progress',
      description: 'The student is actively progressing through the lesson.'
    };
  };

  const orderedCourseModules = useMemo(() => {
    const modules = selectedCourseData?.lessons || [];

    return [...modules].sort((a, b) => {
      const aIsGraduation = /graduation/i.test(`${a?.title || ''} ${a?.id || ''}`);
      const bIsGraduation = /graduation/i.test(`${b?.title || ''} ${b?.id || ''}`);

      if (aIsGraduation === bIsGraduation) return 0;
      return aIsGraduation ? 1 : -1;
    });
  }, [selectedCourseData]);

  const selectedModuleInfo = selectedCourseData?.lessons?.find(
    (module) => module.id === selectedModuleId
  );
  const rawModuleTitle =
    customNames?.modules?.[selectedModuleId] ||
    selectedModuleInfo?.title ||
    selectedModuleData?.title ||
    'Select a module';
  const moduleTitleMatch = rawModuleTitle.match(/^(M\d+):\s*(.*)/i);
  const activeModuleCode = moduleTitleMatch
    ? moduleTitleMatch[1].toUpperCase()
    : rawModuleTitle.toLowerCase().includes('graduation')
      ? 'GRAD'
      : selectedModuleId || 'MODULE';
  const activeModuleTitle = moduleTitleMatch ? moduleTitleMatch[2] : rawModuleTitle;

  const classProgressRows = activeLesson
    ? students.map((student) => {
        const lessonProgress = getStudentProgressForLesson(student.email, activeLesson);
        const pageProgress = activeLesson.pages.map((page, index) => ({
          ...getStudentProgressForPage(student.email, page),
          id: page.id,
          page,
          pageNumber: index + 1
        }));
        const status = getProgressStatus(lessonProgress.percentage);

        return {
          ...student,
          lessonProgress,
          pageProgress,
          status,
          pagesStarted: pageProgress.filter((page) => page.percentage > 0).length,
          pagesCompleted: pageProgress.filter((page) => page.percentage === 100).length
        };
      })
    : [];

  const classAverage = classProgressRows.length
    ? Math.round(
        classProgressRows.reduce((sum, row) => sum + row.lessonProgress.percentage, 0) /
          classProgressRows.length
      )
    : 0;

  const completedCount = classProgressRows.filter((row) => row.status.key === 'completed').length;
  const inProgressCount = classProgressRows.filter((row) => row.status.key === 'in-progress').length;
  const needsAttentionCount = classProgressRows.filter(
    (row) => row.status.key === 'needs-attention'
  ).length;
  const notStartedCount = classProgressRows.filter((row) => row.status.key === 'not-started').length;

  const pageAverages = activeLesson
    ? activeLesson.pages.map((page, index) => {
        const total = classProgressRows.reduce(
          (sum, row) => sum + (row.pageProgress[index]?.percentage || 0),
          0
        );

        return {
          id: page.id,
          page,
          pageNumber: index + 1,
          average: classProgressRows.length ? Math.round(total / classProgressRows.length) : 0
        };
      })
    : [];

  const hardestPage = pageAverages.length
    ? pageAverages.reduce((lowest, current) =>
        current.average < lowest.average ? current : lowest
      )
    : null;

  const totalCompletedTasks = classProgressRows.reduce(
    (sum, row) => sum + row.lessonProgress.completed,
    0
  );

  const lessonTaskCount = activeLesson
    ? activeLesson.pages.reduce((sum, page) => sum + (Number(page.taskCount) || 0), 0)
    : 0;

  const normalizedSearch = studentSearchQuery.trim().toLowerCase();
  const visibleClassRows = classProgressRows
    .filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.name.toLowerCase().includes(normalizedSearch) ||
        row.email.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        classProgressFilter === 'all' ||
        (classProgressFilter === 'action-required'
          ? row.status.key === 'needs-attention' || row.status.key === 'not-started'
          : row.status.key === classProgressFilter);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (classSortMode === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (classSortMode === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      if (classSortMode === 'progress-desc') {
        return b.lessonProgress.percentage - a.lessonProgress.percentage;
      }
      return a.lessonProgress.percentage - b.lessonProgress.percentage;
    });

  const visiblePages = activeLesson
    ? selectedPageId === 'overview'
      ? activeLesson.pages
      : activeLesson.pages.filter((page) => page.id === selectedPageId)
    : [];

  const selectedPage = activeLesson?.pages?.find((page) => page.id === selectedPageId) || null;
  const selectedStudentRow = selectedStudent
    ? classProgressRows.find((row) => row.email === selectedStudent.email) || null
    : null;

  const openCoursePage = (page) => {
    const targetPage = page || selectedPage || activeLesson?.pages?.[0];
    if (!targetPage) {
      triggerToast('This lesson does not have a page to open yet.');
      return;
    }

    window.open(
      `/?course=${encodeURIComponent(selectedCourseId)}&lesson=${encodeURIComponent(selectedModuleId)}&page=${encodeURIComponent(targetPage.id)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const resetTargetPage =
    selectedPage && selectedPage.id !== 'overview' ? selectedPage : null;
  const resetTargetPageNumber = resetTargetPage
    ? activeLesson.pages.findIndex((page) => page.id === resetTargetPage.id) + 1
    : null;

  const handleResetPageClick = () => {
    if (!resetTargetPage) {
      triggerToast('This lesson does not have a page to reset.');
      return;
    }

    const confirmed = window.confirm(
      `Reset Page ${resetTargetPageNumber} progress?\n\n` +
      `Page: ${resetTargetPage.id}\n\n` +
      `This will permanently clear progress for all students in this class. Are you sure?`
    );

    if (!confirmed) return;

    const backendUrl =
      localStorage.getItem('lms_backend_url') ||
      import.meta.env.VITE_API_URL ||
      '';

    const targetUrl = `${backendUrl}/api/progress/reset-page`;
    const supabaseToken = getValidSupabaseToken(supabaseKey);

    fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseToken}`,
      },
      body: JSON.stringify({
        courseId: selectedCourseId,
        lessonId: selectedModuleId,
        pageId: resetTargetPage.id,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log('Reset progress API response:', data);
        
        // Dynamically remove all localStorage keys related to this page ID
        const targetPageId = resetTargetPage.id;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes(targetPageId)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        console.log('Cleared local storage keys for page reset:', keysToRemove);

        triggerToast(`Reset progress successfully for Page ${resetTargetPageNumber}.`);
      })
      .catch((err) => {
        console.error('Reset progress API error:', err);
        triggerToast(`Failed to reset progress: ${err.message}`);
      });
  };

  const handleUnlockLesson = () => {
    if (!activeLesson) {
      triggerToast('No lesson selected to unlock.');
      return;
    }
    if (!students || students.length === 0) {
      triggerToast('No students in this class to unlock for.');
      return;
    }
    if (!resolvedCourseId) {
      triggerToast('Class ID is not resolved yet.');
      return;
    }

    const topicId = String(activeLesson.num);
    const lessonTitle = activeLesson.title || `Lesson ${activeLesson.num}`;

    const confirmed = window.confirm(
      `Hệ thống sẽ mở khoá Lesson ${topicId} (${lessonTitle}) cho các học sinh sau:\n\n` +
      students.map((s) => `- ${s.name} (${s.email})`).join('\n')
    );

    if (!confirmed) return;

    const supabaseToken = getValidSupabaseToken(supabaseKey);
    const payload = students.map((s) => ({
      student_email: s.email,
      course_id: String(resolvedCourseId),
      topic_id: topicId,
      lms_course_id: selectedCourseId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const url = `${supabaseUrl}/rest/v1/student_lesson_schedules`;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseToken}`
      },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (res.status === 409) {
          triggerToast(`Lesson ${topicId} đã được mở rồi.`);
          return;
        }
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        triggerToast(`Mở khoá Lesson ${topicId} thành công cho ${students.length} học sinh!`);
      })
      .catch((err) => {
        console.error('Unlock lesson error:', err);
        triggerToast(`Mở khoá thất bại: ${err.message}`);
      });
  };

  const summaryCards = [
    {
      key: 'all',
      eyebrow: 'Class average',
      value: `${classAverage}%`,
      detail: `${students.length} student${students.length === 1 ? '' : 's'}`,
      icon: '↗'
    },
    {
      key: 'completed',
      eyebrow: 'Completed',
      value: completedCount,
      detail: 'Finished the lesson',
      icon: '✓'
    },
    {
      key: 'in-progress',
      eyebrow: 'In progress',
      value: inProgressCount,
      detail: 'At least 25% complete',
      icon: '▶'
    },
    {
      key: 'action-required',
      eyebrow: 'Needs attention',
      value: needsAttentionCount + notStartedCount,
      detail: 'Low progress or not started',
      icon: '!'
    }
  ];

  return (
    <div className="teacher-space-layout">
      <style>{`
        .teacher-space-layout {
          display: flex;
          min-height: 100vh;
          font-family: 'Nunito', Arial, sans-serif;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          color: #1e293b;
          width: 100%;
        }

        /* ─── SIDEBAR ─── */
        .ts-sidebar {
          width: 280px;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          box-shadow: 4px 0 24px rgba(148, 163, 184, 0.05);
        }

        .ts-brand {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 14px;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(180deg, #fafbfd 0%, #ffffff 100%);
        }

        .ts-brand-logo {
          width: 48px;
          height: 48px;
          object-fit: contain;
          object-position: center;
          display: block;
          flex-shrink: 0;
        }

        .ts-brand-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .ts-brand h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .ts-brand p {
          margin: 1px 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .ts-nav-section {
          padding: 20px 14px 10px;
        }

        .ts-section-title {
          font-size: 12px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 12px;
          padding-left: 12px;
        }

        .ts-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px 16px;
          border: none;
          background: transparent;
          border-radius: 10px;
          color: #475569;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .ts-nav-link:hover {
          background: #f8fafc;
          color: #0f172a;
          transform: translateX(2px);
        }

        .ts-nav-link.active {
          background: #f5f3ff;
          color: #7c3aed;
          font-weight: 800;
        }

        .ts-courses-accordion {
          padding: 0 14px;
          flex-grow: 1;
          overflow-y: auto;
        }

        .ts-accordion-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 11px 16px;
          background: transparent;
          border: none;
          color: #475569;
          font-size: 14.5px;
          font-weight: 800;
          cursor: pointer;
          border-radius: 10px;
          margin-bottom: 4px;
          transition: all 0.2s ease;
        }

        .ts-accordion-header:hover {
          background: #f8fafc;
          color: #0f172a;
        }

        .ts-accordion-header.active {
          background: #f5f3ff;
          color: #7c3aed;
        }

        .ts-modules-list {
          margin-left: 16px;
          border-left: 2px solid #e2e8f0;
          padding-left: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 8px;
        }

        .ts-module-button {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          padding: 8px 10px;
          border: none;
          background: transparent;
          border-radius: 8px;
          color: #64748b;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }

        .ts-module-button:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .ts-module-button.active {
          color: #7c3aed;
          background: #faf5ff;
          font-weight: 800;
        }

        .ts-lessons-list {
          width: 100%;
          margin-top: 4px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-left: 10px;
        }

        .ts-lesson-button {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 6px 10px;
          border: none;
          background: transparent;
          border-radius: 6px;
          color: #64748b;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
        }

        .ts-lesson-button.active {
          color: #7c3aed;
          font-weight: 800;
          background: #f3e8ff;
        }

        .ts-profile-footer {
          padding: 18px 24px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fafbfd;
          margin-top: auto;
        }

        .ts-profile-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: #ffffff;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 16px;
          box-shadow: 0 3px 8px rgba(124, 58, 237, 0.2);
        }

        .ts-profile-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .ts-profile-info strong {
          font-size: 14.5px;
          font-weight: 700;
          color: #0f172a;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ts-profile-info span {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        /* ─── MAIN CONTENT ─── */
        .ts-main {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .ts-header {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 20px 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 10px rgba(148, 163, 184, 0.02);
        }

        .ts-breadcrumbs {
          font-size: 12px;
          color: #64748b;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 5px;
        }

        .ts-header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .ts-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ts-btn-primary {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: #ffffff;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(109, 40, 217, 0.25);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .ts-btn-primary:hover {
          background: linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(109, 40, 217, 0.35);
        }

        .ts-content-body {
          padding: 36px;
          display: flex;
          gap: 28px;
          flex-grow: 1;
          align-items: flex-start;
          overflow-y: auto;
        }

        .ts-grid-left {
          flex-grow: 1;
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 30px -5px rgba(148, 163, 184, 0.06), 0 4px 18px -4px rgba(0, 0, 0, 0.02);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .ts-panel-header {
          padding: 24px 28px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(180deg, #ffffff 0%, #fafbfd 100%);
        }

        .ts-panel-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .ts-panel-header p {
          margin: 4px 0 0;
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }

        /* ─── PROGRESS TABLE ─── */
        .ts-table-container {
          width: 100%;
          overflow-x: auto;
        }

        .ts-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .ts-table th {
          background: #fafbfd;
          padding: 16px 24px;
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 1px solid #e2e8f0;
        }

        .ts-table td {
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 15px;
          vertical-align: middle;
        }

        .ts-student-row {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ts-student-row:hover {
          background: #f8fafc;
        }

        .ts-student-row.selected {
          background: #f5f3ff;
          border-left: 3px solid #7c3aed;
        }

        .ts-student-cell {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .ts-student-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          color: #0369a1;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 14px;
          box-shadow: inset 0 1px 3px rgba(255, 255, 255, 0.4);
          position: relative;
        }

        .ts-progress-bar-container {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 120px;
        }

        .ts-progress-bar {
          width: 70px;
          height: 8px;
          background: #f1f5f9;
          border-radius: 999px;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
        }

        .ts-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%);
          border-radius: 999px;
          box-shadow: 0 1px 2px rgba(109, 40, 217, 0.1);
        }

        .ts-progress-percent {
          font-size: 13.5px;
          font-weight: 800;
          color: #334155;
        }

        .ts-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 12.5px;
          font-weight: 800;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .ts-badge.completed {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .ts-badge.partial {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid rgba(245, 158, 11, 0.15);
        }

        .ts-badge.empty {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        /* ─── RIGHT DRAWER (DETAILS PANEL) ─── */
        .ts-drawer {
          width: 340px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 26px;
          box-shadow: 0 10px 30px -5px rgba(148, 163, 184, 0.06), 0 4px 18px -4px rgba(0, 0, 0, 0.02);
          flex-shrink: 0;
          position: sticky;
          top: 36px;
          transition: transform 0.3s ease;
        }

        .ts-drawer-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 20px;
        }

        .ts-drawer-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          color: #0369a1;
          font-size: 20px;
          font-weight: 800;
          display: grid;
          place-items: center;
          box-shadow: 0 3px 8px rgba(3, 105, 161, 0.1);
        }

        .ts-drawer-name h4 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .ts-drawer-name span {
          font-size: 12.5px;
          color: #10b981;
          font-weight: 700;
        }

        .ts-drawer-section {
          margin-bottom: 24px;
        }

        .ts-drawer-section h5 {
          margin: 0 0 12px;
          font-size: 12px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .ts-info-grid {
          display: grid;
          gap: 10px;
        }

        .ts-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14.5px;
          background: #f8fafc;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }

        .ts-info-row label {
          color: #64748b;
          font-weight: 700;
        }

        .ts-info-row span {
          color: #1f2937;
          font-weight: 700;
        }

        .ts-drawer-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 4px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14.5px;
        }

        .ts-drawer-item-title {
          font-weight: 600;
          color: #475569;
        }

        .ts-drawer-item-percent {
          font-weight: 800;
          color: #0f172a;
        }

        .ts-drawer-footer {
          margin-top: 20px;
        }

        .ts-btn-message {
          width: 100%;
          background: #ffffff;
          border: 1px solid #7c3aed;
          color: #7c3aed;
          padding: 11px;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 6px rgba(124, 58, 237, 0.05);
        }

        .ts-btn-message:hover {
          background: #f5f3ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.12);
        }

        .ts-empty-state {
          padding: 56px 24px;
          text-align: center;
          color: #64748b;
          font-size: 15.5px;
        }
        /* ─── REDESIGNED MY CLASSES VIEW ─── */
        .td-class-page {
          min-height: 100%;
          padding: 24px 28px 40px;
          background:
            radial-gradient(circle at 88% 2%, rgba(124, 58, 237, 0.08), transparent 24%),
            radial-gradient(circle at 14% 6%, rgba(14, 165, 233, 0.07), transparent 22%),
            #f7f8fc;
          overflow-y: auto;
        }

        .td-topbar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
        }

        .td-welcome-block {
          min-width: 0;
        }

        .td-welcome-text {
          margin: 0 0 7px;
          color: #475569;
          font-size: 15px;
          font-weight: 650;
          line-height: 1.45;
        }

        .td-welcome-text strong {
          color: #172033;
          font-weight: 900;
        }

        .td-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .td-breadcrumb strong {
          color: #6d28d9;
        }

        .td-breadcrumb-separator {
          color: #cbd5e1;
        }

        .td-search {
          position: relative;
          width: min(320px, 38vw);
          flex-shrink: 0;
        }

        .td-search-icon {
          position: absolute;
          top: 50%;
          left: 14px;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 15px;
          pointer-events: none;
        }

        .td-search input {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 14px 11px 40px;
          border: 1px solid #dbe2ea;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.92);
          color: #1e293b;
          font: inherit;
          font-size: 14.5px;
          font-weight: 650;
          outline: none;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.035);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .td-search input:focus {
          border-color: #8b5cf6;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1), 0 8px 22px rgba(15, 23, 42, 0.05);
        }

        .td-module-navigator {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 12px;
          margin-bottom: 14px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 8px 26px rgba(15, 23, 42, 0.04);
          backdrop-filter: blur(10px);
        }

        .td-navigator-label {
          flex: 0 0 auto;
          padding: 0 8px;
          color: #94a3b8;
          font-size: 11.5px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .td-module-scroll,
        .td-lesson-scroll,
        .td-page-tabs {
          display: flex;
          align-items: center;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .td-module-scroll::-webkit-scrollbar,
        .td-lesson-scroll::-webkit-scrollbar,
        .td-page-tabs::-webkit-scrollbar {
          display: none;
        }

        .td-module-scroll {
          gap: 8px;
          flex: 1;
        }

        .td-module-chip {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          flex: 0 0 auto;
          max-width: 188px;
          padding: 8px 11px;
          border: 1px solid transparent;
          border-radius: 11px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .td-module-chip:hover {
          border-color: #e9d5ff;
          background: #faf5ff;
          color: #5b21b6;
        }

        .td-module-chip.active {
          border-color: #ddd6fe;
          background: linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%);
          color: #5b21b6;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.08);
        }

        .td-module-code {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 9px;
          background: #eef2f7;
          color: #475569;
          font-size: 11.5px;
          font-weight: 900;
        }

        .td-module-chip.active .td-module-code {
          background: #7c3aed;
          color: #ffffff;
          box-shadow: 0 5px 10px rgba(124, 58, 237, 0.24);
        }

        .td-module-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 800;
        }

        .td-lesson-strip {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 4px;
          margin-bottom: 18px;
        }

        .td-lesson-scroll {
          gap: 7px;
          flex: 1;
        }

        .td-lesson-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
          padding: 8px 12px;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          font-size: 13px;
          font-weight: 800;
          transition: all 0.18s ease;
        }

        .td-lesson-tab:hover {
          background: rgba(255, 255, 255, 0.8);
          color: #334155;
        }

        .td-lesson-tab.active {
          border-color: #ddd6fe;
          background: #ffffff;
          color: #6d28d9;
          box-shadow: 0 5px 16px rgba(15, 23, 42, 0.055);
        }

        .td-lesson-number {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: #eef2f7;
          color: #64748b;
          font-size: 11.5px;
          font-weight: 900;
        }

        .td-lesson-tab.active .td-lesson-number {
          background: #ede9fe;
          color: #6d28d9;
        }

        .td-hero {
          position: relative;
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 28px;
          overflow: hidden;
          padding: 28px 30px;
          margin-bottom: 18px;
          border: 1px solid rgba(221, 214, 254, 0.9);
          border-radius: 22px;
          background:
            linear-gradient(115deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 245, 255, 0.97) 55%, rgba(238, 242, 255, 0.96) 100%);
          box-shadow: 0 16px 42px rgba(76, 29, 149, 0.09);
        }

        .td-hero::before,
        .td-hero::after {
          content: '';
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
        }

        .td-hero::before {
          width: 220px;
          height: 220px;
          top: -130px;
          right: -30px;
          background: rgba(124, 58, 237, 0.09);
        }

        .td-hero::after {
          width: 130px;
          height: 130px;
          right: 170px;
          bottom: -92px;
          background: rgba(14, 165, 233, 0.08);
        }

        .td-hero-copy,
        .td-hero-side {
          position: relative;
          z-index: 1;
        }

        .td-hero-copy {
          min-width: 0;
          flex: 1;
        }

        .td-hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 9px;
          color: #6d28d9;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .td-hero h1 {
          margin: 0;
          max-width: 760px;
          color: #172033;
          font-size: clamp(25px, 2.2vw, 34px);
          font-weight: 900;
          letter-spacing: -0.035em;
          line-height: 1.12;
        }

        .td-hero-description {
          max-width: 720px;
          margin: 10px 0 0;
          color: #64748b;
          font-size: 14.5px;
          font-weight: 650;
          line-height: 1.6;
        }

        .td-hero-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 17px;
        }

        .td-meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border: 1px solid rgba(221, 214, 254, 0.9);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          color: #475569;
          font-size: 12.5px;
          font-weight: 800;
        }

        .td-meta-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
        }

        .td-hero-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-between;
          min-width: 250px;
        }

        .td-hero-score {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .td-hero-score strong {
          color: #5b21b6;
          font-size: 38px;
          font-weight: 900;
          letter-spacing: -0.05em;
        }

        .td-hero-score span {
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
        }

        .td-hero-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 24px;
        }

        .td-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 40px;
          padding: 9px 14px;
          border-radius: 11px;
          font: inherit;
          font-size: 13.5px;
          font-weight: 850;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }

        .td-button:hover {
          transform: translateY(-1px);
        }

        .td-button.secondary {
          border: 1px solid #ddd6fe;
          background: rgba(255, 255, 255, 0.82);
          color: #6d28d9;
        }

        .td-button.secondary:hover {
          background: #ffffff;
          box-shadow: 0 6px 16px rgba(76, 29, 149, 0.09);
        }

        .td-button.primary {
          border: 1px solid #6d28d9;
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: #ffffff;
          box-shadow: 0 7px 18px rgba(109, 40, 217, 0.22);
        }

        .td-button.primary:hover {
          box-shadow: 0 10px 24px rgba(109, 40, 217, 0.3);
        }

        .td-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .td-summary-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
          padding: 16px;
          border: 1px solid #e5e9f0;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.92);
          text-align: left;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.035);
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .td-summary-card:hover {
          transform: translateY(-2px);
          border-color: #d8b4fe;
          box-shadow: 0 12px 28px rgba(76, 29, 149, 0.08);
        }

        .td-summary-card.active {
          border-color: #c4b5fd;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08), 0 12px 28px rgba(76, 29, 149, 0.08);
        }

        .td-summary-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 13px;
          background: #f3f0ff;
          color: #6d28d9;
          font-size: 17px;
          font-weight: 900;
        }

        .td-summary-card:nth-child(2) .td-summary-icon {
          background: #ecfdf5;
          color: #047857;
        }

        .td-summary-card:nth-child(3) .td-summary-icon {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .td-summary-card:nth-child(4) .td-summary-icon {
          background: #fff7ed;
          color: #c2410c;
        }

        .td-summary-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .td-summary-eyebrow {
          color: #64748b;
          font-size: 11.5px;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .td-summary-value {
          margin-top: 2px;
          color: #172033;
          font-size: 23px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .td-summary-detail {
          margin-top: 1px;
          overflow: hidden;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .td-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .td-workspace.has-drawer {
          grid-template-columns: minmax(0, 1fr) 320px;
        }

        .td-progress-panel,
        .td-student-drawer {
          border: 1px solid #e5e9f0;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.045);
        }

        .td-progress-panel {
          min-width: 0;
          overflow: hidden;
        }

        .td-panel-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 20px 20px 15px;
        }

        .td-panel-heading h2 {
          margin: 0;
          color: #172033;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .td-panel-heading p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13.5px;
          font-weight: 650;
        }

        .td-page-tabs {
          gap: 5px;
          padding: 0 20px 14px;
          border-bottom: 1px solid #edf0f4;
        }

        .td-page-tab {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          flex: 0 0 auto;
          padding: 7px 10px;
          border: 1px solid transparent;
          border-radius: 9px;
          background: transparent;
          color: #64748b;
          font: inherit;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .td-page-tab:hover {
          background: #f8fafc;
          color: #334155;
        }

        .td-page-tab.active {
          border-color: #ddd6fe;
          background: #f5f3ff;
          color: #6d28d9;
        }

        .td-table-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 20px;
          background: #fbfcfe;
          border-bottom: 1px solid #edf0f4;
        }

        .td-result-count {
          color: #64748b;
          font-size: 12.5px;
          font-weight: 800;
        }

        .td-toolbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .td-select {
          min-height: 34px;
          padding: 6px 30px 6px 10px;
          border: 1px solid #dbe2ea;
          border-radius: 9px;
          background: #ffffff;
          color: #475569;
          font: inherit;
          font-size: 12.5px;
          font-weight: 800;
          outline: none;
          cursor: pointer;
        }

        .td-clear-filter {
          min-height: 34px;
          padding: 6px 10px;
          border: 1px solid #e5e7eb;
          border-radius: 9px;
          background: #ffffff;
          color: #64748b;
          font: inherit;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
        }

        .td-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .td-progress-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .td-progress-table th {
          padding: 12px 18px;
          border-bottom: 1px solid #edf0f4;
          background: #ffffff;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .td-progress-table td {
          padding: 15px 18px;
          border-bottom: 1px solid #f0f2f5;
          color: #334155;
          font-size: 13.5px;
          vertical-align: middle;
        }

        .td-progress-table tbody tr {
          cursor: pointer;
          transition: background 0.18s ease, box-shadow 0.18s ease;
        }

        .td-progress-table tbody tr:hover {
          background: #fafbff;
        }

        .td-progress-table tbody tr.selected {
          background: #f7f5ff;
          box-shadow: inset 3px 0 0 #7c3aed;
        }

        .td-student-identity {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 180px;
        }

        .td-avatar {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 12px;
          background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
          color: #0369a1;
          font-size: 13px;
          font-weight: 900;
        }

        .td-student-copy {
          min-width: 0;
        }

        .td-student-copy strong {
          display: block;
          max-width: 210px;
          overflow: hidden;
          color: #1e293b;
          font-size: 13.5px;
          font-weight: 900;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .td-student-copy span {
          display: block;
          max-width: 210px;
          margin-top: 2px;
          overflow: hidden;
          color: #94a3b8;
          font-size: 11.5px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .td-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 900;
          white-space: nowrap;
        }

        .td-status::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .td-status.completed {
          background: #ecfdf5;
          color: #047857;
        }

        .td-status.in-progress {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .td-status.needs-attention {
          background: #fff7ed;
          color: #c2410c;
        }

        .td-status.not-started {
          background: #f1f5f9;
          color: #64748b;
        }

        .td-progress-cell {
          min-width: 145px;
        }

        .td-progress-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 9px;
          margin-bottom: 6px;
        }

        .td-progress-topline strong {
          color: #334155;
          font-size: 12.5px;
          font-weight: 900;
        }

        .td-progress-topline span {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 750;
        }

        .td-progress-track {
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: #edf1f5;
        }

        .td-progress-value {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%);
          transition: width 0.3s ease;
        }

        .td-page-cell {
          min-width: 74px;
        }

        .td-page-progress {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 43px;
          padding: 5px 7px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #f8fafc;
          color: #64748b;
          font-size: 11.5px;
          font-weight: 900;
        }

        .td-page-progress.partial {
          border-color: #fed7aa;
          background: #fff7ed;
          color: #c2410c;
        }

        .td-page-progress.completed {
          border-color: #bbf7d0;
          background: #ecfdf5;
          color: #047857;
        }

        .td-row-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 9px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
          color: #6d28d9;
          font: inherit;
          font-size: 11.5px;
          font-weight: 900;
          cursor: pointer;
        }

        .td-empty {
          padding: 52px 24px;
          text-align: center;
          color: #64748b;
        }

        .td-empty-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          border-radius: 15px;
          background: #f5f3ff;
          color: #7c3aed;
          font-size: 20px;
          font-weight: 900;
        }

        .td-empty h3 {
          margin: 0;
          color: #334155;
          font-size: 16px;
          font-weight: 900;
        }

        .td-empty p {
          margin: 6px auto 0;
          max-width: 420px;
          font-size: 13px;
          font-weight: 650;
        }

        .td-student-drawer {
          position: sticky;
          top: 18px;
          overflow: hidden;
        }

        .td-drawer-top {
          position: relative;
          padding: 20px;
          border-bottom: 1px solid #edf0f4;
          background: linear-gradient(135deg, #faf5ff 0%, #eef2ff 100%);
        }

        .td-drawer-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(221, 214, 254, 0.9);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.76);
          color: #64748b;
          cursor: pointer;
          font-size: 16px;
          font-weight: 800;
        }

        .td-drawer-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-right: 30px;
        }

        .td-drawer-avatar {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 15px;
          background: #ffffff;
          color: #6d28d9;
          font-size: 17px;
          font-weight: 900;
          box-shadow: 0 7px 18px rgba(76, 29, 149, 0.1);
        }

        .td-drawer-profile h3 {
          margin: 0;
          color: #1e293b;
          font-size: 16px;
          font-weight: 900;
        }

        .td-drawer-profile p {
          margin: 3px 0 0;
          overflow: hidden;
          color: #64748b;
          font-size: 11.5px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .td-drawer-body {
          padding: 17px;
        }

        .td-drawer-overall {
          padding: 13px;
          margin-bottom: 14px;
          border: 1px solid #ede9fe;
          border-radius: 13px;
          background: #faf9ff;
        }

        .td-drawer-overall-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 9px;
        }

        .td-drawer-overall-top span {
          color: #64748b;
          font-size: 11.5px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .td-drawer-overall-top strong {
          color: #6d28d9;
          font-size: 20px;
          font-weight: 900;
        }

        .td-drawer-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 7px;
          margin-bottom: 16px;
        }

        .td-drawer-stat {
          padding: 9px 7px;
          border: 1px solid #edf0f4;
          border-radius: 11px;
          background: #ffffff;
          text-align: center;
        }

        .td-drawer-stat strong {
          display: block;
          color: #334155;
          font-size: 15px;
          font-weight: 900;
        }

        .td-drawer-stat span {
          display: block;
          margin-top: 2px;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .td-drawer-section-title {
          margin: 0 0 8px;
          color: #94a3b8;
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .td-drawer-page-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
          max-height: 250px;
          overflow-y: auto;
        }

        .td-drawer-page {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 10px;
          border: 1px solid #edf0f4;
          border-radius: 10px;
          background: #fbfcfe;
        }

        .td-drawer-page strong {
          color: #475569;
          font-size: 11.5px;
          font-weight: 850;
        }

        .td-drawer-page span {
          color: #6d28d9;
          font-size: 11.5px;
          font-weight: 900;
        }

        .td-drawer-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 15px;
        }

        .td-insight-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
          padding: 14px 20px 18px;
          border-top: 1px solid #edf0f4;
          background: #fbfcfe;
        }

        .td-insight {
          padding: 11px;
          border: 1px solid #edf0f4;
          border-radius: 11px;
          background: #ffffff;
        }

        .td-insight span {
          display: block;
          color: #94a3b8;
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .td-insight strong {
          display: block;
          margin-top: 4px;
          color: #334155;
          font-size: 13px;
          font-weight: 900;
        }

        @media (max-width: 1280px) {
          .td-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .td-workspace.has-drawer {
            grid-template-columns: minmax(0, 1fr) 290px;
          }
        }

        @media (max-width: 1040px) {
          .ts-sidebar {
            width: 230px;
          }

          .td-class-page {
            padding: 20px;
          }

          .td-hero {
            flex-direction: column;
          }

          .td-hero-side {
            min-width: 0;
            align-items: flex-start;
          }

          .td-hero-actions {
            justify-content: flex-start;
            margin-top: 14px;
          }

          .td-workspace.has-drawer {
            grid-template-columns: 1fr;
          }

          .td-student-drawer {
            position: static;
          }
        }

        @media (max-width: 760px) {
          .teacher-space-layout {
            display: block;
          }

          .ts-sidebar {
            width: 100%;
            min-height: auto;
          }

          .td-topbar,
          .td-panel-heading,
          .td-table-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .td-search {
            width: 100%;
          }

          .td-summary-grid,
          .td-insight-strip {
            grid-template-columns: 1fr;
          }

          .td-toolbar-actions {
            width: 100%;
          }

          .td-select,
          .td-clear-filter {
            flex: 1;
          }
        }

        /* TOAST */
        .toast-container {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          pointer-events: none;
        }

        .toast {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 180px;
          max-width: min(340px, calc(100vw - 48px));
          padding: 13px 18px;
          border: 1px solid rgba(124, 58, 237, 0.18);
          border-radius: 14px;
          background: #ffffff;
          color: #1e293b;
          font-size: 15px;
          font-weight: 800;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
          animation: toastSlideIn 0.25s ease-out;
        }

        .toast-icon {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          background: #f5f3ff;
          color: #7c3aed;
          font-size: 16px;
        }

        @keyframes toastSlideIn {
          from {
            transform: translateX(24px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .toast-container {
            right: 16px;
            bottom: 16px;
          }
        }
      `}</style>

      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" role="status">
            <span className="toast-icon" aria-hidden="true">✦</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* ─── SIDEBAR ─── */}
      <aside className="ts-sidebar">
        <div className="ts-brand">
          <img
            src="/assets/algorithmics-logo.png"
            alt="Algo Learning Space"
            className="ts-brand-logo"
          />
          <div className="ts-brand-text">
            <h2>Algo</h2>
            <p>Teacher Workspace</p>
          </div>
        </div>

        <div className="ts-nav-section" style={{ flexGrow: 1, overflowY: 'auto' }}>
          <p className="ts-section-title">Teacher Space</p>
          
          <button 
            type="button" 
            className={`ts-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span>📊</span> Dashboard
          </button>

          <button 
            type="button" 
            className={`ts-nav-link ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <span>🧑‍🎓</span> Students
          </button>
          
          <button 
            type="button" 
            className={`ts-nav-link ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('classes');
              setMyClassesOpen(!myClassesOpen);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📚</span> My Classes
              </div>
              <span style={{ fontSize: '11px' }}>{myClassesOpen ? '▼' : '▶'}</span>
            </div>
          </button>

          {myClassesOpen && catalog && (
            <div className="ts-sidebar-courses-list" style={{ paddingLeft: '16px', marginTop: '6px' }}>
              {catalog.courses.map((course) => {
                return (
                  <div key={course.id} style={{ marginBottom: '6px' }}>
                    <button
                      type="button"
                      className={`ts-sidebar-course-item ${selectedCourseId === course.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setActiveTab('classes');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        color: selectedCourseId === course.id ? '#6d28d9' : '#4b5563',
                        fontWeight: selectedCourseId === course.id ? '700' : '500',
                        fontSize: '14px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: '6px'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>👾</span> {course.title}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button type="button" className="ts-nav-link" onClick={() => triggerToast('Coming soon')}>
            <span>📅</span> Calendar
          </button>
          <button type="button" className="ts-nav-link" onClick={() => triggerToast('Coming soon')}>
            <span>💬</span> Messages
          </button>
          <button type="button" className="ts-nav-link" onClick={() => triggerToast('Coming soon')}>
            <span>📁</span> Resources
          </button>
          <button type="button" className="ts-nav-link" onClick={() => triggerToast('Coming soon')}>
            <span>📈</span> Reports
          </button>
        </div>

        <div className="ts-profile-footer" style={{
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
            <div className="ts-profile-avatar" style={{ flexShrink: 0 }}>
              {currentTeacherEmail ? currentTeacherEmail.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="ts-profile-info">
              <strong>{currentTeacherEmail ? currentTeacherEmail.split('@')[0] : 'Teacher'}</strong>
              <span style={{ display: 'block', fontSize: '12px', color: '#9ca3af' }}>Teacher Account</span>
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              background: 'none',
              border: 'none',
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '6px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg style={{ width: '16px', height: '16px', stroke: 'currentColor', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="ts-main">
        {activeTab === 'preview' && selectedPreviewCourseId ? (
          <TeacherCoursePreview
            courseId={selectedPreviewCourseId}
            onClose={() => setActiveTab('classes')}
          />
        ) : activeTab === 'classes' && (
          <div className="td-class-page">
            <div className="td-topbar">
              <div className="td-welcome-block">
                <p className="td-welcome-text">
                  Good to see you, <strong>{teacherDisplayName}</strong>. Let’s check how your students are progressing today.
                </p>
                <div className="td-breadcrumb" aria-label="Current course location">
                  <span>My Classes</span>
                  <span className="td-breadcrumb-separator">/</span>
                  <strong>{selectedCourseId || 'Course'}</strong>
                  <span className="td-breadcrumb-separator">/</span>
                  <span>{activeModuleCode}</span>
                  <span className="td-breadcrumb-separator">/</span>
                  <span>{activeLesson?.title || 'Select lesson'}</span>
                </div>
              </div>

              <label className="td-search">
                <span className="td-search-icon">⌕</span>
                <input
                  type="search"
                  placeholder="Search students by name or email"
                  value={studentSearchQuery}
                  onChange={(event) => setStudentSearchQuery(event.target.value)}
                />
              </label>
            </div>

            {orderedCourseModules.length > 0 && (
              <div className="td-module-navigator">
                <span className="td-navigator-label">Modules</span>
                <div className="td-module-scroll">
                  {orderedCourseModules.map((module, index) => {
                    const isActive = selectedModuleId === module.id;
                    const titleMatch = module.title.match(/^(M\d+):\s*(.*)/i);
                    const moduleCode = titleMatch
                      ? titleMatch[1].toUpperCase()
                      : module.title.toLowerCase().includes('graduation')
                        ? '🎓'
                        : `M${index + 1}`;
                    const moduleName = titleMatch ? titleMatch[2] : module.title;

                    return (
                      <button
                        key={module.id}
                        type="button"
                        className={`td-module-chip ${isActive ? 'active' : ''}`}
                        title={module.title}
                        onClick={() => {
                          setSelectedModuleId(module.id);
                          setSelectedLessonId('');
                        }}
                      >
                        <span className="td-module-code">{moduleCode}</span>
                        <span className="td-module-name">{moduleName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {lessons.length > 0 && (
              <div className="td-lesson-strip">
                <span className="td-navigator-label">Lessons</span>
                <div className="td-lesson-scroll">
                  {lessons.map((lesson) => {
                    const isActive = selectedLessonId === lesson.id;
                    const lessonTotal = students.reduce(
                      (sum, student) =>
                        sum + getStudentProgressForLesson(student.email, lesson).percentage,
                      0
                    );
                    const lessonAverage = students.length
                      ? Math.round(lessonTotal / students.length)
                      : 0;

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        className={`td-lesson-tab ${isActive ? 'active' : ''}`}
                        onClick={() => setSelectedLessonId(lesson.id)}
                      >
                        <span>{lesson.title}</span>
                        <span style={{ color: isActive ? '#7c3aed' : '#94a3b8', fontSize: '11px' }}>
                          {lessonAverage}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <section className="td-hero">
              <div className="td-hero-copy">
                <div className="td-hero-kicker">
                  <span>{activeModuleCode}</span>
                  <span>•</span>
                  <span>{activeLesson?.title || 'Lesson overview'}</span>
                </div>
                <h1>{activeModuleTitle}</h1>
                <p className="td-hero-description">
                  See who is progressing, who has not started, and where the class may need support before the next session.
                </p>

                <div className="td-hero-meta">
                  <span className="td-meta-pill">
                    <span className="td-meta-dot" />
                    {students.length} student{students.length === 1 ? '' : 's'}
                  </span>
                  <span className="td-meta-pill">
                    {activeLesson?.pages?.length || 0} page{activeLesson?.pages?.length === 1 ? '' : 's'}
                  </span>
                  <span className="td-meta-pill">
                    {lessonTaskCount} task{lessonTaskCount === 1 ? '' : 's'} per student
                  </span>
                  {needsAttentionCount > 0 && (
                    <span className="td-meta-pill" style={{ color: '#c2410c', borderColor: '#fed7aa' }}>
                      {needsAttentionCount} need{needsAttentionCount === 1 ? 's' : ''} attention
                    </span>
                  )}
                </div>
              </div>

              <div className="td-hero-side">
                <div className="td-hero-score">
                  <strong>{classAverage}%</strong>
                  <span>class average</span>
                </div>
                <div className="td-hero-actions">
                  <button
                    type="button"
                    className="td-button secondary"
                    disabled={!activeLesson}
                    onClick={handleUnlockLesson}
                  >
                    🔓 Unlock Lesson
                  </button>
                  <button
                    type="button"
                    className="td-button secondary"
                    disabled={!resetTargetPage}
                    onClick={handleResetPageClick}
                  >
                    ↻ Reset progress
                  </button>
                  <button
                    type="button"
                    className="td-button primary"
                    onClick={() => openCoursePage()}
                    disabled={!activeLesson?.pages?.length}
                  >
                    ↗ Open {selectedPage ? `Page ${activeLesson.pages.findIndex((page) => page.id === selectedPage.id) + 1}` : 'lesson'}
                  </button>
                </div>
              </div>
            </section>

            <div className="td-summary-grid">
              {summaryCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className={`td-summary-card ${classProgressFilter === card.key ? 'active' : ''}`}
                  onClick={() => setClassProgressFilter(card.key)}
                >
                  <span className="td-summary-icon">{card.icon}</span>
                  <span className="td-summary-copy">
                    <span className="td-summary-eyebrow">{card.eyebrow}</span>
                    <span className="td-summary-value">{card.value}</span>
                    <span className="td-summary-detail">{card.detail}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className={`td-workspace ${selectedStudentRow ? 'has-drawer' : ''}`}>
              <section className="td-progress-panel">
                <div className="td-panel-heading">
                  <div>
                    <h2>Student progress</h2>
                    <p>
                      {selectedPageId === 'overview'
                        ? 'Compare lesson progress across all pages.'
                        : `Focused view for Page ${activeLesson?.pages?.findIndex((page) => page.id === selectedPageId) + 1}.`}
                    </p>
                  </div>
                  {selectedPage && (
                    <button
                      type="button"
                      className="td-button secondary"
                      onClick={() => openCoursePage(selectedPage)}
                    >
                      ↗ Open this page
                    </button>
                  )}
                </div>

                {activeLesson?.pages?.length > 0 && (
                  <div className="td-page-tabs" role="tablist" aria-label="Lesson pages">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selectedPageId === 'overview'}
                      className={`td-page-tab ${selectedPageId === 'overview' ? 'active' : ''}`}
                      onClick={() => setSelectedPageId('overview')}
                    >
                      📚 Overview
                    </button>
                    {activeLesson.pages.map((page, index) => (
                      <button
                        key={page.id}
                        type="button"
                        role="tab"
                        aria-selected={selectedPageId === page.id}
                        className={`td-page-tab ${selectedPageId === page.id ? 'active' : ''}`}
                        onClick={() => setSelectedPageId(page.id)}
                      >
                        📘 Page {index + 1}
                      </button>
                    ))}
                  </div>
                )}

                <div className="td-table-toolbar">
                  <span className="td-result-count">
                    Showing {visibleClassRows.length} of {classProgressRows.length} student{classProgressRows.length === 1 ? '' : 's'}
                  </span>
                  <div className="td-toolbar-actions">
                    <select
                      className="td-select"
                      value={classSortMode}
                      onChange={(event) => setClassSortMode(event.target.value)}
                      aria-label="Sort student progress"
                    >
                      <option value="progress-asc">Lowest progress first</option>
                      <option value="progress-desc">Highest progress first</option>
                      <option value="name-asc">Name A–Z</option>
                      <option value="name-desc">Name Z–A</option>
                    </select>
                    {(classProgressFilter !== 'all' || studentSearchQuery) && (
                      <button
                        type="button"
                        className="td-clear-filter"
                        onClick={() => {
                          setClassProgressFilter('all');
                          setStudentSearchQuery('');
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>

                {!activeLesson ? (
                  <div className="td-empty">
                    <div className="td-empty-icon">□</div>
                    <h3>Select a lesson</h3>
                    <p>Choose a lesson above to view progress for the students in this class.</p>
                  </div>
                ) : visibleClassRows.length === 0 ? (
                  <div className="td-empty">
                    <div className="td-empty-icon">⌕</div>
                    <h3>No students match this view</h3>
                    <p>Try another status card or clear the search to show the full class.</p>
                  </div>
                ) : (
                  <div className="td-table-wrap">
                    <table className="td-progress-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Status</th>
                          <th>Overall progress</th>
                          {visiblePages.map((page) => {
                            const pageIndex = activeLesson.pages.findIndex((item) => item.id === page.id);
                            return <th key={page.id}>Page {pageIndex + 1}</th>;
                          })}
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleClassRows.map((row) => {
                          const isSelected = selectedStudentRow?.email === row.email;

                          return (
                            <tr
                              key={row.id || row.email}
                              className={isSelected ? 'selected' : ''}
                              onClick={() => setSelectedStudent(row)}
                            >
                              <td>
                                <div className="td-student-identity">
                                  <div className="td-avatar">
                                    {row.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="td-student-copy">
                                    <strong>{row.name}</strong>
                                    <span>{row.username ? `${row.username} / ${row.password}` : row.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`td-status ${row.status.key}`} title={row.status.description}>
                                  {row.status.label}
                                </span>
                              </td>
                              <td>
                                <div className="td-progress-cell">
                                  <div className="td-progress-topline">
                                    <strong>{row.lessonProgress.percentage}%</strong>
                                    <span>
                                      {row.lessonProgress.completed}/{row.lessonProgress.total} tasks
                                    </span>
                                  </div>
                                  <div className="td-progress-track">
                                    <div
                                      className="td-progress-value"
                                      style={{ width: `${row.lessonProgress.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              {visiblePages.map((page) => {
                                const pageProgress = row.pageProgress.find((item) => item.id === page.id);
                                const progressClass =
                                  pageProgress?.percentage === 100
                                    ? 'completed'
                                    : pageProgress?.percentage > 0
                                      ? 'partial'
                                      : '';

                                return (
                                  <td key={page.id} className="td-page-cell">
                                    <span className={`td-page-progress ${progressClass}`}>
                                      {pageProgress?.percentage || 0}%
                                    </span>
                                  </td>
                                );
                              })}
                              <td>
                                <button
                                  type="button"
                                  className="td-row-action"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedStudent(row);
                                  }}
                                >
                                  View details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="td-insight-strip">
                  <div className="td-insight">
                    <span>Most difficult page</span>
                    <strong>
                      {hardestPage ? `Page ${hardestPage.pageNumber} · ${hardestPage.average}% avg.` : 'No data yet'}
                    </strong>
                  </div>
                  <div className="td-insight">
                    <span>Completed tasks</span>
                    <strong>{totalCompletedTasks} across the class</strong>
                  </div>
                  <div className="td-insight">
                    <span>Teacher focus</span>
                    <strong>
                      {needsAttentionCount > 0
                        ? `${needsAttentionCount} student${needsAttentionCount === 1 ? '' : 's'} need support`
                        : notStartedCount > 0
                          ? `${notStartedCount} student${notStartedCount === 1 ? '' : 's'} not started`
                          : 'Class is on track'}
                    </strong>
                  </div>
                </div>
              </section>

              {selectedStudentRow && (
                <aside className="td-student-drawer" aria-label={`${selectedStudentRow.name} progress details`}>
                  <div className="td-drawer-top">
                    <button
                      type="button"
                      className="td-drawer-close"
                      aria-label="Close student details"
                      onClick={() => setSelectedStudent(null)}
                    >
                      ×
                    </button>
                    <div className="td-drawer-profile">
                      <div className="td-drawer-avatar">
                        {selectedStudentRow.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3>{selectedStudentRow.name}</h3>
                        <p>{selectedStudentRow.username ? `${selectedStudentRow.username} / ${selectedStudentRow.password}` : selectedStudentRow.email}</p>
                        {selectedStudentRow.studentCode && (
                          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                            Code: {selectedStudentRow.studentCode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="td-drawer-body">
                    <div className="td-drawer-overall">
                      <div className="td-drawer-overall-top">
                        <span>Lesson progress</span>
                        <strong>{selectedStudentRow.lessonProgress.percentage}%</strong>
                      </div>
                      <div className="td-progress-track">
                        <div
                          className="td-progress-value"
                          style={{ width: `${selectedStudentRow.lessonProgress.percentage}%` }}
                        />
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        <span className={`td-status ${selectedStudentRow.status.key}`}>
                          {selectedStudentRow.status.label}
                        </span>
                      </div>
                    </div>

                    <div className="td-drawer-stats">
                      <div className="td-drawer-stat">
                        <strong>{selectedStudentRow.lessonProgress.completed}</strong>
                        <span>Tasks done</span>
                      </div>
                      <div className="td-drawer-stat">
                        <strong>{selectedStudentRow.pagesStarted}</strong>
                        <span>Pages started</span>
                      </div>
                      <div className="td-drawer-stat">
                        <strong>{selectedStudentRow.pagesCompleted}</strong>
                        <span>Pages done</span>
                      </div>
                    </div>

                    <p className="td-drawer-section-title">Progress by page</p>
                    <div className="td-drawer-page-list">
                      {selectedStudentRow.pageProgress.map((pageProgress) => (
                        <div key={pageProgress.id} className="td-drawer-page">
                          <strong>Page {pageProgress.pageNumber}</strong>
                          <span>
                            {pageProgress.percentage}% · {pageProgress.completed}/{pageProgress.total}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="td-drawer-actions">
                      <button
                        type="button"
                        className="td-button secondary"
                        onClick={() => triggerToast(`Message tools for ${selectedStudentRow.name} are coming soon.`)}
                      >
                        Message
                      </button>
                      <button
                        type="button"
                        className="td-button primary"
                        onClick={() => openCoursePage()}
                      >
                        Open lesson
                      </button>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}

        {/* ─── STUDENTS DIRECTORY TAB ─── */}
        {activeTab === 'students' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: 0 }}>Students Directory</h1>
                <p style={{ fontSize: '15px', color: '#6b7280', margin: '4px 0 0 0' }}>Detailed profiles, course enrollments, and progress for all students across your classes.</p>
              </div>
              <input 
                type="text" 
                placeholder="🔍 Search students by name or email..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  width: '320px',
                  fontSize: '15px',
                  outline: 'none',
                  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
              {/* Left Student List (35% width) */}
              <div style={{
                width: '35%',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>
                    ALL STUDENTS ({filteredStudents.length})
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                  {filteredStudents.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '15px' }}>
                      No students found matching your search.
                    </div>
                  ) : (
                    filteredStudents.map((s) => {
                      const isSelected = tabSelectedStudent?.email === s.email;
                      return (
                        <button
                          key={s.id || s.email}
                          type="button"
                          onClick={() => setTabSelectedStudent(s)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            marginBottom: '4px',
                            backgroundColor: isSelected ? '#f5f3ff' : 'transparent',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: isSelected ? '#7c3aed' : '#e5e7eb',
                            color: isSelected ? '#ffffff' : '#4b5563',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '15px',
                            flexShrink: 0
                          }}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ overflow: 'hidden', flex: 1 }}>
                            <strong style={{ display: 'block', fontSize: '14.5px', color: isSelected ? '#1f2937' : '#4b5563', fontWeight: '700', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {s.name}
                            </strong>
                            <span style={{ display: 'block', fontSize: '13px', color: '#9ca3af', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '2px' }}>
                              {s.username ? `${s.username} / ${s.password}` : s.email}
                            </span>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                              {s.courses.map((c) => (
                                <span key={c.id} style={{
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: isSelected ? '#ddd6fe' : '#f3f4f6',
                                  color: isSelected ? '#5b21b6' : '#6b7280',
                                  fontWeight: '600'
                                }}>
                                  {c.id}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Student Details (65% width) */}
              <div style={{ width: '65%', display: 'flex', flexDirection: 'column' }}>
                {tabSelectedStudent ? (
                  <div style={{
                    flex: 1,
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                        color: '#ffffff',
                        fontSize: '24px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {tabSelectedStudent.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '20px', color: '#1f2937' }}>{tabSelectedStudent.name}</h2>
                        <span style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span> Active Student
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '28px' }}>
                      <div style={{ background: '#f9fafb', padding: '12px 16px', borderRadius: '8px' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Email</span>
                        <span style={{ fontSize: '15px', color: '#374151', fontWeight: '500' }}>{tabSelectedStudent.email}</span>
                      </div>
                      <div style={{ background: '#f9fafb', padding: '12px 16px', borderRadius: '8px' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Student Code</span>
                        <span style={{ fontSize: '15px', color: '#374151', fontWeight: '500' }}>{tabSelectedStudent.studentCode || 'Not specified'}</span>
                      </div>
                      <div style={{ background: '#f9fafb', padding: '12px 16px', borderRadius: '8px' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Username / Password</span>
                        <span style={{ fontSize: '15px', color: '#374151', fontWeight: '500' }}>
                          {tabSelectedStudent.username ? `${tabSelectedStudent.username} / ${tabSelectedStudent.password}` : 'Not specified'}
                        </span>
                      </div>
                      <div style={{ background: '#f9fafb', padding: '12px 16px', borderRadius: '8px' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Gender</span>
                        <span style={{ fontSize: '15px', color: '#374151', fontWeight: '500', textTransform: 'capitalize' }}>{tabSelectedStudent.gender || 'Not specified'}</span>
                      </div>
                    </div>

                    <h4 style={{ fontSize: '16px', color: '#1f2937', marginBottom: '16px', fontWeight: '700' }}>Enrolled Courses & Progress</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {tabSelectedStudent.courses.map((c) => {
                        const catalogId = mapDbIdToCatalogId(c.id);
                        const courseInfo = catalog?.courses.find((x) => x.id === c.id || x.id === catalogId);
                        const totalTasks = Number(courseInfo?.taskCount) || 0;
                        
                        // Filter attempts for this student & course
                        const courseAttempts = allAttempts.filter(
                          (a) => a.user_id?.trim().toLowerCase() === tabSelectedStudent.email.trim().toLowerCase() &&
                                 (a.course_id === c.id || a.course_id === catalogId || (courseInfo && a.course_id === courseInfo.id))
                        );
                        
                        // Count completed unique tasks
                        const completedSet = new Set();
                        courseAttempts.forEach((a) => {
                          if (a.status === 'completed' || a.is_completed === true || a.status === 'correct') {
                            if (a.task_id) completedSet.add(a.task_id);
                          }
                        });
                        
                        const completedCount = completedSet.size;
                        const percentage = totalTasks > 0
                          ? Math.min(100, Math.round((completedCount / totalTasks) * 100))
                          : 0;

                        // Determine status badge properties
                        let statusText = 'Not Started';
                        let statusStyle = { background: '#f3f4f6', color: '#4b5563' };
                        if (percentage === 100) {
                          statusText = 'Mastered';
                          statusStyle = { background: '#def7ec', color: '#03543f' };
                        } else if (percentage > 0) {
                          statusText = 'In Progress';
                          statusStyle = { background: '#f3e8ff', color: '#6b21a8' };
                        }

                        return (
                          <div key={c.id} style={{ 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '12px', 
                            padding: '20px', 
                            background: '#ffffff', 
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                            marginBottom: '16px'
                          }}>
                            {/* Course Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ 
                                  width: '32px', 
                                  height: '32px', 
                                  borderRadius: '50%', 
                                  background: '#f3e8ff', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  fontSize: '16px'
                                }}>
                                  🎓
                                </div>
                                <strong style={{ fontSize: '16px', color: '#1f2937' }}>{c.title}</strong>
                              </div>
                              <span style={{ 
                                fontSize: '12px', 
                                fontWeight: '700', 
                                padding: '4px 10px', 
                                borderRadius: '12px',
                                textTransform: 'uppercase',
                                ...statusStyle
                              }}>
                                {statusText}
                              </span>
                            </div>

                            {/* Metrics Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>Overall Progress</span>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: '#7c3aed' }}>{percentage}%</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>Completed Tasks</span>
                                <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151', marginTop: '4px' }}>{completedCount} / {totalTasks}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>Structure</span>
                                <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151', marginTop: '4px' }}>{courseInfo?.lessonCount || 8} Modules</span>
                              </div>
                            </div>
                            
                            {/* Main Progress Bar */}
                            <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                              <div style={{ height: '100%', width: `${percentage}%`, background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)', borderRadius: '4px' }}></div>
                            </div>

                            {/* Display module breakdowns if active course matches */}
                            {selectedCourseData && (c.id === selectedCourseId || catalogId === selectedCourseId) && (
                              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', display: 'block', marginBottom: '12px', letterSpacing: '0.05em' }}>MODULES BREAKDOWN</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {orderedCourseModules.map((mod, idx) => {
                                    // Filter progress for this module
                                    const modAttempts = courseAttempts.filter((a) => a.lesson_id === mod.id);
                                    const modCompletedSet = new Set();
                                    modAttempts.forEach((a) => {
                                      if (a.status === 'completed' || a.is_completed === true || a.status === 'correct') {
                                        if (a.task_id) modCompletedSet.add(a.task_id);
                                      }
                                    });
                                    
                                    const modCompleted = modCompletedSet.size;
                                    const modTotal = mod.taskCount || 40; // Fallback module task count
                                    const modPercentage = Math.min(100, Math.round((modCompleted / modTotal) * 100));

                                    // Extract module prefix e.g. M1, M2 or fallback to index
                                    const modLabel = mod.id.split('-')[0] || `M${idx + 1}`;

                                    // Determine module status badge
                                    let statusDot = '⚪';
                                    if (modPercentage === 100) {
                                      statusDot = '✅';
                                    } else if (modPercentage > 0) {
                                      statusDot = '🟣';
                                    }

                                    return (
                                      <div key={mod.id} style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        fontSize: '13px',
                                        background: '#f9fafb',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #f3f4f6'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <span style={{ 
                                            fontSize: '11px', 
                                            fontWeight: '700', 
                                            background: '#e5e7eb', 
                                            color: '#4b5563', 
                                            padding: '2px 6px', 
                                            borderRadius: '4px' 
                                          }}>
                                            {modLabel}
                                          </span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>{mod.title}</span>
                                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>({modCompleted}/{modTotal} tasks)</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <div style={{ width: '60px', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${modPercentage}%`, background: '#8b5cf6', borderRadius: '3px' }}></div>
                                          </div>
                                          <span style={{ fontWeight: '700', color: '#4b5563', minWidth: '32px', textAlign: 'right' }}>{modPercentage}%</span>
                                          <span style={{ fontSize: '13px', marginLeft: '4px' }}>{statusDot}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#6b7280' }}>
                    Select a student to view detailed profiles and progress.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TEACHER DASHBOARD TAB ─── */}
        {activeTab === 'dashboard' && (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: 0 }}>Teacher Dashboard</h1>
                <p style={{ fontSize: '15px', color: '#6b7280', marginTop: '4px' }}>Welcome back! Here is an overview of your active classes and students.</p>
              </div>
              <div style={{ position: 'relative', width: '320px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '15px' }}>🔍</span>
                <input 
                  type="text" 
                  placeholder="Quick find student or course..."
                  value={studentSearchQuery}
                  onChange={(e) => {
                    setStudentSearchQuery(e.target.value);
                    setDashboardSearchSubmitted(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && studentSearchQuery.trim()) {
                      setDashboardSearchSubmitted(true);
                    } else if (e.key === 'Enter' && !studentSearchQuery.trim()) {
                      setDashboardSearchSubmitted(false);
                    }
                  }}
                  style={{
                    padding: '10px 16px 10px 36px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    width: '100%',
                    fontSize: '15px',
                    outline: 'none',
                    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '24px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>TOTAL CLASSES</span>
                <strong style={{ display: 'block', fontSize: '28px', color: '#1f2937', marginTop: '8px' }}>{catalog?.courses.length || 1}</strong>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>TOTAL STUDENTS</span>
                <strong style={{ display: 'block', fontSize: '28px', color: '#1f2937', marginTop: '8px' }}>{allStudents.length}</strong>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>TOTAL SUBMISSIONS</span>
                <strong style={{ display: 'block', fontSize: '28px', color: '#1f2937', marginTop: '8px' }}>{allAttempts.length}</strong>
              </div>
            </div>

            {dashboardSearchSubmitted && studentSearchQuery.trim() && (
              <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '18px', color: '#374151', margin: 0, fontWeight: '700' }}>Search Results for "{studentSearchQuery}"</h2>
                  <button 
                    onClick={() => {
                      setStudentSearchQuery('');
                      setDashboardSearchSubmitted(false);
                    }}
                    style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}
                  >
                    Clear Search
                  </button>
                </div>
                
                {(() => {
                  const query = studentSearchQuery.toLowerCase();
                  const courseResults = catalog?.courses.filter(c => c.title?.toLowerCase().includes(query) || c.id.toLowerCase().includes(query)) || [];
                  const studentResults = allStudents.filter(s => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)) || [];
                  
                  if (courseResults.length === 0 && studentResults.length === 0) {
                    return (
                      <div style={{ padding: '40px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#6b7280' }}>
                        No courses or students found matching your search.
                      </div>
                    );
                  }

                  return (
                    <>
                      {courseResults.length > 0 && (
                        <div>
                          <h3 style={{ fontSize: '14px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em', fontWeight: '700' }}>Courses</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                            {courseResults.map(course => (
                              <button
                                key={course.id}
                                onClick={() => {
                                  setSelectedCourseId(course.id);
                                  setActiveTab('classes');
                                  setMyClassesOpen(true);
                                }}
                                style={{
                                  background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px',
                                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer', textAlign: 'left',
                                  transition: 'box-shadow 0.2s, border-color 0.2s', width: '100%'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                              >
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#7c3aed', background: '#f3e8ff', padding: '4px 8px', borderRadius: '6px', marginBottom: '10px' }}>{course.id}</span>
                                <strong style={{ fontSize: '16px', color: '#1f2937' }}>{course.title || course.id}</strong>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {studentResults.length > 0 && (
                        <div>
                          <h3 style={{ fontSize: '14px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em', marginTop: courseResults.length > 0 ? '16px' : '0', fontWeight: '700' }}>Students</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                            {studentResults.map(student => (
                              <button
                                key={student.email}
                                onClick={() => {
                                  setTabSelectedStudent(student);
                                  setActiveTab('students');
                                }}
                                style={{
                                  background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px',
                                  display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left',
                                  transition: 'box-shadow 0.2s, border-color 0.2s', width: '100%'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                              >
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e5e7eb', color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px', flexShrink: 0 }}>
                                  {student.name.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                  <strong style={{ display: 'block', fontSize: '15.5px', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>{student.name}</strong>
                                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{student.email}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
