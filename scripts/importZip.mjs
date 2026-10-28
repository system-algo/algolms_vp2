import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';

const LOCAL_INPUT_DIR = path.resolve('input/VP2');
const FALLBACK_INPUT_DIR = path.resolve('input');
const GOOGLE_DRIVE_VP_ROOT = 'G:/My Drive/Algo Platform/VP';

const COURSES_ROOT = path.resolve('public/courses');
const GENERATED_PAGES_ROOT = path.resolve('src/generated-pages');
const SLIDES_MAPPING_PATH = path.resolve('src/config/slides_mapping.json');
const MAPPING_CONFIG_PATH = path.resolve('src/config/mapping.json');

const COURSE_ID = 'VP2';
const COURSE_TITLE = 'Visual Programming 2';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function toJsIdentifier(value) {
  const raw = String(value || 'Page')
    .replace(/[^a-zA-Z0-9_$]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (/^[0-9]/.test(raw) ? `_${raw}` : raw) || 'Page';
}

function getLessonSortKey(folderName) {
  const upper = folderName.toUpperCase();
  if (upper.includes('GRADUATION')) {
    return 7 * 100 + 2; // M7L2
  }
  const match = upper.match(/M(\d+)L(\d+)/i);
  if (match) {
    return parseInt(match[1], 10) * 100 + parseInt(match[2], 10);
  }
  return 9999;
}

function getModuleIdForLesson(folderName) {
  const upper = folderName.toUpperCase();
  if (upper.includes('M2L')) return 'M2-Control-Structures';
  if (upper.includes('M3L')) return 'M3-Functions-and-Modules';
  if (upper.includes('M4L')) return 'M4-Math-and-Logic';
  if (upper.includes('M5L')) return 'M5-Game-Development';
  if (upper.includes('M6L')) return 'M6-Advanced-Projects';
  if (upper.includes('M7L') || upper.includes('GRADUATION')) return 'M7-Hackathon-Series';
  return 'M2-Control-Structures';
}

function getModuleTitleForId(moduleId) {
  const titles = {
    'M2-Control-Structures': 'Space',
    'M3-Functions-and-Modules': 'Game',
    'M4-Math-and-Logic': 'Logic',
    'M5-Game-Development': 'Variables',
    'M6-Advanced-Projects': 'Clones',
    'M7-Hackathon-Series': 'Final Project',
  };
  return titles[moduleId] || moduleId;
}

function loadSlidesMapping() {
  return readJsonFile(SLIDES_MAPPING_PATH) || {};
}

function loadLessonMapping() {
  const full = readJsonFile(MAPPING_CONFIG_PATH);
  return full?.lessons || {};
}

function generateSlidesReactShell(courseId, moduleId, slidePageId, title, embedUrl) {
  const dir = path.join(GENERATED_PAGES_ROOT, courseId, moduleId, slidePageId);
  ensureDir(dir);

  const componentName = toJsIdentifier(slidePageId);
  const code = `import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function ${componentName}() {
  const activity = {
    id: ${JSON.stringify(slidePageId)},
    title: ${JSON.stringify(title)},
    embedUrl: ${JSON.stringify(embedUrl)},
    moduleId: ${JSON.stringify(moduleId)},
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId=${JSON.stringify(courseId)}
      onBack={() => window.history.back()}
    />
  );
}
`;
  fs.writeFileSync(path.join(dir, 'LessonPage.jsx'), code, 'utf8');
}

function generateActivityReactShell(courseId, moduleId, pageId) {
  const dir = path.join(GENERATED_PAGES_ROOT, courseId, moduleId, pageId);
  ensureDir(dir);

  const componentName = toJsIdentifier(pageId);
  const code = `import React from 'react';
import GeneratedPageShell from '../../../../templates/GeneratedPageShell';

export default function ${componentName}() {
  return (
    <GeneratedPageShell
      manifestUrl="/courses/${courseId}/${moduleId}/pages/${pageId}/manifest.json"
      pageInstanceUrl="/courses/${courseId}/${moduleId}/pages/${pageId}/page.instance.json"
      courseId=${JSON.stringify(courseId)}
      lessonId=${JSON.stringify(moduleId)}
      pageId=${JSON.stringify(pageId)}
      onBackToPages={() => window.history.back()}
    />
  );
}
`;
  fs.writeFileSync(path.join(dir, 'LessonPage.jsx'), code, 'utf8');
}

function processCapturedZip(zip, zipPath, courseId, moduleId, pageId, pageTitle) {
  const captureEntry = zip.getEntry('capture.json');
  const raw = JSON.parse(captureEntry.getData().toString('utf8'));
  const targetDir = path.join(COURSES_ROOT, courseId, moduleId, 'pages', pageId);
  const workspaceDir = path.join(targetDir, 'workspace');
  ensureDir(workspaceDir);

  // Extract images
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || entry.entryName.endsWith('/')) continue;
    if (entry.entryName.startsWith('images/')) {
      const outPath = path.join(workspaceDir, entry.entryName);
      ensureDir(path.dirname(outPath));
      fs.writeFileSync(outPath, entry.getData());
    }
  }

  const levels = Array.isArray(raw.levels) ? raw.levels : [];
  const publicBase = `/courses/${courseId}/${moduleId}/pages/${pageId}/workspace`;

  const tasks = levels.map((lvl, idx) => {
    const rawTaskId = String(lvl.page?.taskId || lvl.slot || idx + 1);
    const taskId = `task-${idx + 1}-${rawTaskId}`;
    const levelTitle = lvl.page?.title || `Level ${lvl.levelNo || idx + 1}`;

    const images = (lvl.assets?.images || []).map((img) => {
      const imgRel = img.zipPath || `images/${img.fileName}`;
      const imgUrl = `${publicBase}/${imgRel}`;
      return {
        url: imgUrl,
        src: imgUrl,
        kind: img.sourceKind || 'img',
        width: img.width || 0,
        height: img.height || 0,
      };
    });

    const instruction = String(lvl.instruction || '').trim();
    const bodyText = String(lvl.raw?.bodyText || instruction).trim();
    const textLines = instruction ? instruction.split(/\r?\n/).filter(Boolean) : [];

    const activityType = lvl.isFeedbackPage
      ? 'feedback_rating_task'
      : 'generic_captured_task';

    const stateId = `${taskId}-state-1`;
    const stateName = String(lvl.levelLabel || `Step ${idx + 1}`);

    return {
      id: taskId,
      taskId,
      title: levelTitle,
      activityType,
      instruction,
      bodyText,
      textLines,
      images,
      states: [
        {
          id: stateId,
          stateId,
          name: stateName,
          instruction,
          bodyText,
          textLines,
          images,
          screenshot: images[0]?.url || '',
        },
      ],
    };
  });

  const taskCount = Math.max(1, tasks.length);

  const manifest = {
    version: 1,
    id: pageId,
    title: pageTitle,
    type: 'generic-captured-page',
    taskCount,
    metadata: {
      courseId,
      lessonId: moduleId,
      sourceZip: path.basename(zipPath),
      format: 'logika-crawler-capture',
      importedAt: new Date().toISOString(),
    },
    tasks,
  };

  const pageInstance = {
    schemaVersion: 2,
    id: pageId,
    title: pageTitle,
    type: 'generic-captured-page',
    taskCount,
    tasks,
    frameConfig: {
      showTopNavigation: true,
      showSideNavigation: true,
      showBottomControls: true,
      showNextButton: true,
    },
  };

  writeJson(path.join(targetDir, 'manifest.json'), manifest);
  writeJson(path.join(targetDir, 'page.instance.json'), pageInstance);

  generateActivityReactShell(courseId, moduleId, pageId);

  return manifest;
}

function processTemplateCaptureZip(zip, zipPath, courseId, moduleId, pageId, pageTitle) {
  const entry = zip.getEntry('lms-template-capture-export.json');
  const raw = JSON.parse(entry.getData().toString('utf8'));
  const targetDir = path.join(COURSES_ROOT, courseId, moduleId, 'pages', pageId);
  const workspaceDir = path.join(targetDir, 'workspace');
  ensureDir(workspaceDir);

  // Extract screenshots and assets
  for (const item of zip.getEntries()) {
    if (item.isDirectory || item.entryName.endsWith('/')) continue;
    if (
      item.entryName.startsWith('screenshots/') ||
      item.entryName.startsWith('assets/') ||
      item.entryName.startsWith('images/')
    ) {
      const outPath = path.join(workspaceDir, item.entryName);
      ensureDir(path.dirname(outPath));
      fs.writeFileSync(outPath, item.getData());
    }
  }

  const publicBase = `/courses/${courseId}/${moduleId}/pages/${pageId}/workspace`;
  const rawTasks = Array.isArray(raw.tasks) ? raw.tasks : [];

  const tasks = rawTasks.map((t, idx) => {
    const taskId = String(t.taskId || `task-${idx + 1}`).trim();
    const taskTitle = t.title || t.documentTitle || `Task ${idx + 1}`;
    const activityType = t.activityType || 'generic_captured_task';

    const states = (Array.isArray(t.states) ? t.states : []).map((s, sIdx) => {
      const stateId = String(s.stateId || `${taskId}-state-${sIdx + 1}`).trim();
      const stateName = String(s.stateName || `State ${sIdx + 1}`).trim();

      let screenshotUrl = '';
      if (s.screenshotFile) {
        const match = s.screenshotFile.match(/(screenshots\/.*|assets\/.*|images\/.*)/i);
        const rel = match ? match[1] : path.basename(s.screenshotFile);
        screenshotUrl = `${publicBase}/${rel}`;
      }

      const downloadedMap = new Map();
      if (Array.isArray(s.downloadedAssets?.downloaded)) {
        for (const dl of s.downloadedAssets.downloaded) {
          if (dl.url && dl.filename) {
            const match = dl.filename.match(/(assets\/.*|screenshots\/.*|images\/.*)/i);
            const rel = match ? match[1] : path.basename(dl.filename);
            downloadedMap.set(dl.url, `${publicBase}/${rel}`);
          }
        }
      }

      const images = (Array.isArray(s.images) ? s.images : []).map((img) => {
        const localSrc = downloadedMap.get(img.src) || img.src;
        return {
          url: localSrc,
          src: localSrc,
          kind: 'img',
          width: img.naturalWidth || img.rect?.w || 0,
          height: img.naturalHeight || img.rect?.h || 0,
        };
      });

      return {
        ...s,
        id: stateId,
        stateId,
        name: stateName,
        screenshot: screenshotUrl,
        images,
      };
    });

    if (states.length === 0) {
      states.push({
        id: `${taskId}-state-1`,
        stateId: `${taskId}-state-1`,
        name: 'Initial',
        screenshot: '',
        images: [],
        textLines: [],
      });
    }

    const primaryState = states[0];
    const textLines = primaryState.textLines || [];
    const instruction = textLines.join('\n');

    return {
      ...t,
      id: taskId,
      taskId,
      title: taskTitle,
      activityType,
      instruction,
      bodyText: instruction,
      textLines,
      images: primaryState.images || [],
      states,
    };
  });

  const taskCount = Math.max(1, tasks.length);

  const manifest = {
    version: 1,
    id: pageId,
    title: pageTitle,
    type: 'generic-captured-page',
    taskCount,
    metadata: {
      courseId,
      lessonId: moduleId,
      sourceZip: path.basename(zipPath),
      format: 'lms-template-capture',
      importedAt: new Date().toISOString(),
    },
    tasks,
  };

  const pageInstance = {
    schemaVersion: 2,
    id: pageId,
    title: pageTitle,
    type: 'generic-captured-page',
    taskCount,
    tasks,
    frameConfig: {
      showTopNavigation: true,
      showSideNavigation: true,
      showBottomControls: true,
      showNextButton: true,
    },
  };

  writeJson(path.join(targetDir, 'manifest.json'), manifest);
  writeJson(path.join(targetDir, 'page.instance.json'), pageInstance);

  generateActivityReactShell(courseId, moduleId, pageId);

  return manifest;
}

function processZip(zipPath, courseId, moduleId, pageId, pageTitle) {
  const zip = new AdmZip(zipPath);
  const captureEntry = zip.getEntry('capture.json');
  const templateEntry = zip.getEntry('lms-template-capture-export.json');

  if (captureEntry) {
    return processCapturedZip(zip, zipPath, courseId, moduleId, pageId, pageTitle);
  } else if (templateEntry) {
    return processTemplateCaptureZip(zip, zipPath, courseId, moduleId, pageId, pageTitle);
  } else {
    throw new Error(`Unrecognized archive format in ${zipPath}`);
  }
}

function processSlidePage(courseId, moduleId, slideKey, embedUrl, lessonTitle, lessonKey) {
  const slidePageId = `${courseId}_${slideKey}_SLIDES`;
  const title = `Slide: ${slideKey} - ${lessonTitle}`;
  const targetDir = path.join(COURSES_ROOT, courseId, moduleId, 'pages', slidePageId);
  ensureDir(targetDir);

  const manifest = {
    version: 1,
    id: slidePageId,
    title,
    type: 'google-slides',
    taskCount: 1,
    metadata: {
      courseId,
      lessonId: moduleId,
      lessonKey,
      importedAt: new Date().toISOString(),
    },
  };

  const pageInstance = {
    schemaVersion: 2,
    id: slidePageId,
    title,
    type: 'google-slides',
    taskCount: 1,
    frameConfig: {
      googleSlides: {
        embedUrl,
      },
    },
  };

  writeJson(path.join(targetDir, 'manifest.json'), manifest);
  writeJson(path.join(targetDir, 'page.instance.json'), pageInstance);

  generateSlidesReactShell(courseId, moduleId, slidePageId, title, embedUrl);

  return {
    id: slidePageId,
    title,
    lessonId: lessonKey,
    taskCount: 1,
  };
}

async function runImport() {
  console.log('=== IMPORTING VP2 FROM M2L3 ONWARDS ===');

  let sourceDir = LOCAL_INPUT_DIR;
  if (!fs.existsSync(sourceDir)) {
    sourceDir = FALLBACK_INPUT_DIR;
  }
  if (!fs.existsSync(sourceDir)) {
    sourceDir = GOOGLE_DRIVE_VP_ROOT;
  }
  console.log(`Source directory: ${sourceDir}`);

  const slidesMapping = loadSlidesMapping();
  const lessonMapping = loadLessonMapping();

  // Find all folders for VP M2L3 onwards
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  const targetFolders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => {
      const upper = name.toUpperCase();
      const isVp = upper.startsWith('VP_') || upper.startsWith('M');
      if (!isVp) return false;

      // Skip M1 and M2L1, M2L2
      if (upper.includes('M1')) return false;
      if (upper.includes('M2L1') || upper.includes('M2L2')) return false;

      return (
        upper.includes('M2') ||
        upper.includes('M3') ||
        upper.includes('M4') ||
        upper.includes('M5') ||
        upper.includes('M6') ||
        upper.includes('M7') ||
        upper.includes('GRADUATION')
      );
    })
    .sort((a, b) => getLessonSortKey(a) - getLessonSortKey(b));

  console.log(`Found ${targetFolders.length} lesson folders to import:`, targetFolders);

  const modulesMap = new Map();

  for (const folderName of targetFolders) {
    const folderPath = path.join(sourceDir, folderName);
    const moduleId = getModuleIdForLesson(folderName);
    const moduleTitle = getModuleTitleForId(moduleId);

    if (!modulesMap.has(moduleId)) {
      modulesMap.set(moduleId, {
        id: moduleId,
        title: moduleTitle,
        pages: [],
      });
    }

    const currentModule = modulesMap.get(moduleId);

    // Extract slide key e.g. M2L3 from VP_M2L3, or M7L2 for Graduation
    const upperFolder = folderName.toUpperCase();
    const isGraduation = upperFolder.includes('GRADUATION');
    const slideMatch = folderName.match(/M(\d+)L(\d+)/i);
    const slideKey = isGraduation ? 'M7L2' : (slideMatch ? `M${slideMatch[1]}L${slideMatch[2]}` : '');
    const lessonKey = `${COURSE_ID}_${slideKey || folderName.replace(/^VP_/i, '')}`;

    const mappedLessonTitle =
      lessonMapping[lessonKey] ||
      lessonMapping[`VP_${slideKey}`] ||
      lessonMapping[folderName] ||
      (isGraduation ? 'Graduation' : folderName);

    // 1. Slide pages disabled - import only actual zip pages
    // if (slideKey && slidesMapping[slideKey]) { ... }

    // 2. Process all zip files in this folder
    const zipFiles = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith('.zip'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (const zipFile of zipFiles) {
      const zipPath = path.join(folderPath, zipFile);
      const baseName = path.basename(zipFile, '.zip');

      let pageId;
      let pageTitle;

      if (isGraduation) {
        const numMatch = baseName.match(/(\d+)$/);
        const partNum = numMatch ? numMatch[1] : '1';
        pageId = `${COURSE_ID}_M7L2_${partNum}`;
        pageTitle = `Graduation - Part ${partNum}`;
      } else {
        pageId = baseName.replace(/^VP_/i, `${COURSE_ID}_`);
        const numMatch = baseName.match(/_(\d+)$/);
        const partLabel = numMatch ? `Part ${numMatch[1]}` : baseName;
        pageTitle = `${mappedLessonTitle} - ${partLabel}`;
      }

      try {
        const manifest = processZip(zipPath, COURSE_ID, moduleId, pageId, pageTitle);
        currentModule.pages.push({
          id: pageId,
          title: pageTitle,
          lessonId: lessonKey,
          taskCount: manifest.taskCount,
        });
        console.log(`  Processed: ${pageId} (${manifest.taskCount} tasks, format: ${manifest.metadata.format})`);
      } catch (err) {
        console.warn(`  Failed ${zipFile}: ${err.message}`);
      }
    }
  }

  // Build course structure
  const modulesList = Array.from(modulesMap.values()).map((mod) => ({
    ...mod,
    pageCount: mod.pages.length,
    taskCount: mod.pages.reduce((sum, p) => sum + (p.taskCount || 1), 0),
  }));

  const courseData = {
    id: COURSE_ID,
    title: COURSE_TITLE,
    lessons: modulesList,
    pageCount: modulesList.reduce((sum, m) => sum + m.pageCount, 0),
    taskCount: modulesList.reduce((sum, m) => sum + m.taskCount, 0),
  };

  // Write catalog files for VP2
  writeJson(path.join(COURSES_ROOT, COURSE_ID, 'index.json'), courseData);
  for (const mod of modulesList) {
    writeJson(path.join(COURSES_ROOT, COURSE_ID, mod.id, 'index.json'), mod);
  }

  // Also mirror to VP for fallback routing compatibility
  writeJson(path.join(COURSES_ROOT, 'VP', 'index.json'), { ...courseData, id: 'VP', title: 'VP' });
  for (const mod of modulesList) {
    writeJson(path.join(COURSES_ROOT, 'VP', mod.id, 'index.json'), mod);
  }

  // Update global courses index
  writeJson(path.join(COURSES_ROOT, 'index.json'), {
    courses: [
      {
        id: COURSE_ID,
        title: COURSE_TITLE,
        lessons: modulesList,
        pageCount: courseData.pageCount,
        taskCount: courseData.taskCount,
      },
      {
        id: 'VP',
        title: 'Visual Programming',
        lessons: modulesList,
        pageCount: courseData.pageCount,
        taskCount: courseData.taskCount,
      },
    ],
  });

  // Rebuild generated pages registry
  rebuildRegistry(courseData);

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Course: ${COURSE_TITLE} (${COURSE_ID})`);
  console.log(`Modules: ${modulesList.length}`);
  console.log(`Pages: ${courseData.pageCount}`);
  console.log(`Tasks: ${courseData.taskCount}`);
}

function rebuildRegistry(courseData) {
  let code = 'export const generatedPages = {\n';

  for (const targetCourseId of [COURSE_ID, 'VP']) {
    code += `  ${JSON.stringify(targetCourseId)}: {\n`;

    for (const mod of courseData.lessons) {
      const pageLines = [];

      for (const page of mod.pages) {
        const componentPath = path.join(
          GENERATED_PAGES_ROOT,
          COURSE_ID,
          mod.id,
          page.id,
          'LessonPage.jsx',
        );

        if (!fs.existsSync(componentPath)) continue;

        pageLines.push(
          `      ${JSON.stringify(page.id)}: () => import(${JSON.stringify(
            `./${COURSE_ID}/${mod.id}/${page.id}/LessonPage.jsx`,
          )}),`,
        );
      }

      if (pageLines.length > 0) {
        code += `    ${JSON.stringify(mod.id)}: {\n`;
        code += `${pageLines.join('\n')}\n`;
        code += `    },\n`;
      }
    }

    code += `  },\n`;
  }

  code += '};\n';
  ensureDir(GENERATED_PAGES_ROOT);
  fs.writeFileSync(path.join(GENERATED_PAGES_ROOT, 'registry.js'), code, 'utf8');
  console.log('Registry rebuilt at src/generated-pages/registry.js');
}

runImport().catch((err) => {
  console.error('Fatal error during import:', err);
  process.exit(1);
});
