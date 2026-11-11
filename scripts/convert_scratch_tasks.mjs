import fs from 'node:fs';
import path from 'node:path';

const BASE_DIR = path.resolve('public/courses/VP2');

const ALL_MODULES = [
  'M1-Visual-Programming-Basics',
  'M2-Control-Structures',
  'M3-Functions-and-Modules',
  'M4-Math-and-Logic',
  'M5-Game-Development',
  'M6-Advanced-Projects',
  'M7-Hackathon-Series'
];

const ALL_CATEGORIES = [
  'motion', 'looks', 'sound', 'events', 'control',
  'sensing', 'operators', 'variables', 'myblocks'
];

const OPCODES_MAP = [
  { match: /turn\s+degrees\s+15|turn\s+degrees\s+90|turn/i, opcodes: ['motion_turnright', 'motion_turnleft'] },
  { match: /point\s+in\s+direction/i, opcodes: ['motion_pointindirection'] },
  { match: /point\s+towards/i, opcodes: ['motion_pointtowards'] },
  { match: /go\s+to\s+x:|go\s+to/i, opcodes: ['motion_gotoxy', 'motion_goto'] },
  { match: /glide/i, opcodes: ['motion_glideto', 'motion_glidesecstoxy'] },
  { match: /change\s+x\s+by/i, opcodes: ['motion_changexby'] },
  { match: /change\s+y\s+by/i, opcodes: ['motion_changeyby'] },
  { match: /if\s+on\s+edge,\s+bounce/i, opcodes: ['motion_ifonedgebounce'] },
  { match: /set\s+rotation\s+style/i, opcodes: ['motion_setrotationstyle'] },
  { match: /when\s+clicked|when\s+flag\s+clicked/i, opcodes: ['event_whenflagclicked'] },
  { match: /when\s+space\s+key\s+pressed|key\s+pressed/i, opcodes: ['event_whenkeypressed'] },
  { match: /when\s+this\s+sprite\s+clicked/i, opcodes: ['event_whenthisspriteclicked'] },
  { match: /when\s+i\s+receive/i, opcodes: ['event_whenbroadcastreceived'] },
  { match: /broadcast/i, opcodes: ['event_broadcast'] },
  { match: /switch\s+costume\s+to/i, opcodes: ['looks_switchcostumeto'] },
  { match: /next\s+costume/i, opcodes: ['looks_nextcostume'] },
  { match: /switch\s+backdrop\s+to/i, opcodes: ['looks_switchbackdropto'] },
  { match: /change\s+size\s+by/i, opcodes: ['looks_changesizeby'] },
  { match: /set\s+size\s+to/i, opcodes: ['looks_setsizeto'] },
  { match: /say/i, opcodes: ['looks_sayforsecs'] },
  { match: /show/i, opcodes: ['looks_show'] },
  { match: /hide/i, opcodes: ['looks_hide'] },
  { match: /wait|wait\s+seconds/i, opcodes: ['control_wait'] },
  { match: /repeat/i, opcodes: ['control_repeat'] },
  { match: /forever/i, opcodes: ['control_forever'] },
  { match: /\bif\b/i, opcodes: ['control_if'] },
  { match: /\belse\b/i, opcodes: ['control_if_else'] },
  { match: /stop/i, opcodes: ['control_stop'] },
  { match: /touching\s+color/i, opcodes: ['sensing_touchingcolor'] },
  { match: /touching/i, opcodes: ['sensing_touchingobject'] },
  { match: /key\s+pressed\?/i, opcodes: ['sensing_keypressed'] },
  { match: /mouse\s+down\?/i, opcodes: ['sensing_mousedown'] },
  { match: /play\s+sound|start\s+sound/i, opcodes: ['sound_play'] },
  { match: /pick\s+random/i, opcodes: ['operator_random'] },
  { match: /\band\b/i, opcodes: ['operator_and'] },
  { match: /\bor\b/i, opcodes: ['operator_or'] },
  { match: /\bnot\b/i, opcodes: ['operator_not'] },
  { match: /show\s+variable/i, opcodes: ['data_showvariable'] },
  { match: /hide\s+variable/i, opcodes: ['data_hidevariable'] },
];

function cleanTaskTitle(title, index) {
  let cleaned = String(title || `Task ${index + 1}`).trim();
  cleaned = cleaned.replace(/^[МM]\d+[LU]\d+[-_\s]*/i, '');
  cleaned = cleaned.replace(/^task[-_\s]*\d+[-_\s]*/i, '');
  cleaned = cleaned.replace(/^level[-_\s]*\d+[-_\s]*/i, '');
  if (!cleaned || cleaned.toLowerCase() === 'nuevo proyecto' || cleaned.toLowerCase() === 'new project') {
    cleaned = `Creative Project (Level ${index + 1})`;
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function isRatingTask(rawTask) {
  const title = String(rawTask.title || '').toLowerCase();
  const instr = String(rawTask.instruction || '').toLowerCase();
  const body = String(rawTask.bodyText || '').toLowerCase();
  const t_type = String(rawTask.level_type || rawTask.activityType || rawTask.type || '').toLowerCase();
  return (
    title.includes('did you like the task') ||
    instr.includes('did you like the task') ||
    body.includes('did you like the task') ||
    title.includes('rating') ||
    t_type.includes('rating')
  );
}

function isScratchTask(rawTask) {
  if (isRatingTask(rawTask)) return false;
  const t_type = String(rawTask.level_type || rawTask.activityType || rawTask.type || '').toLowerCase();
  if (t_type === 'scratch' || t_type === 'scratch_task' || t_type === 'scratch-task') return true;

  const title = String(rawTask.title || '').toLowerCase();
  const instr = String(rawTask.instruction || '');
  const body = String(rawTask.bodyText || '');
  const lines = Array.isArray(rawTask.textLines) ? rawTask.textLines.join(' ') : '';
  const all = (title + ' ' + instr + ' ' + body + ' ' + lines).toLowerCase();

  return (
    all.includes('sprite') ||
    all.includes('backdrops') ||
    all.includes('costumes') ||
    all.includes('when flag clicked') ||
    all.includes('green flag') ||
    all.includes('when clicked') ||
    all.includes('turn degrees') ||
    all.includes('when space key pressed') ||
    all.includes('motion') ||
    all.includes('scratch.')
  );
}

function parseTaskDetails(rawTask, pageId, index, imagesInDir) {
  if (isRatingTask(rawTask)) {
    const taskId = `${pageId}_${index + 1}`;
    return {
      id: taskId,
      taskId: taskId,
      position: index + 1,
      level_position: index + 1,
      levelPosition: index + 1,
      title: 'Did you like the task?',
      level_type: 'rating',
      selectedType: 'rating',
      activityType: 'feedback_rating_task',
      requirements: [],
      media: [],
      command_keys: [],
      states: [
        {
          id: `${taskId}_state_1`,
          stateId: `${taskId}_state_1`,
          position: index + 1,
          level_position: index + 1,
          levelPosition: index + 1,
          type: 'rating',
          selectedType: 'rating',
          level_type: 'rating',
          requirements: [],
          media: [],
          command_keys: []
        }
      ]
    };
  }

  const tLines = Array.isArray(rawTask.textLines) && rawTask.textLines.length > 0
    ? rawTask.textLines
    : (rawTask.instruction || '').split('\n').map(s => s.trim()).filter(Boolean);

  const cleanTitle = cleanTaskTitle(rawTask.title, index);

  // 1. Detect categories
  const foundCats = new Set();
  tLines.forEach((line) => {
    const lower = line.toLowerCase();
    if (ALL_CATEGORIES.includes(lower)) {
      foundCats.add(lower);
    } else if (lower === 'my blocks') {
      foundCats.add('myblocks');
    }
  });

  let commandKeys = Array.from(foundCats);
  if (commandKeys.length >= 6 || commandKeys.length === 0) {
    commandKeys = ['motion', 'looks', 'sound', 'events', 'control', 'sensing', 'operators', 'variables', 'myblocks'];
  } else if (!commandKeys.includes('events')) {
    commandKeys.push('events');
  }

  // 2. Detect opcodes
  const joinedText = tLines.join(' ');
  const foundOpcodes = new Set();
  OPCODES_MAP.forEach(({ match, opcodes }) => {
    if (match.test(joinedText)) {
      opcodes.forEach(op => foundOpcodes.add(op));
    }
  });
  const commandBlocks = Array.from(foundOpcodes);

  // 3. Extract drawer information
  let desc = '';
  let requirements = [];
  let drawerHeading = 'TASKS WILL BE CHECKED BY THE TEACHER';

  let drawerIdx = -1;
  for (let i = 0; i < tLines.length; i++) {
    const l = tLines[i];
    if (l.includes('TASKS WITH AUTOMATIC CHECK') ||
        l.includes('TASKS WILL BE CHECKED BY THE TEACHER') ||
        l.includes('TASKS TO CHECK WITH THE TEACHER')) {
      drawerIdx = i;
      drawerHeading = l.trim();
      break;
    }
  }

  if (drawerIdx !== -1) {
    const candidateLines = tLines.slice(Math.max(0, drawerIdx - 4), drawerIdx);
    const descCandidates = candidateLines.filter(l => l.length > 15 && !l.match(/^\d+$/));
    if (descCandidates.length > 0) {
      desc = descCandidates[descCandidates.length - 1];
    }

    const reqLines = tLines.slice(drawerIdx + 1);
    reqLines.forEach((rText, rIdx) => {
      const text = rText.trim();
      if (text && text.length > 1 && !text.match(/^sprite|^stage/i)) {
        requirements.push({
          id: `req_${index + 1}_${rIdx + 1}`,
          title: text,
          text: text,
          type: 'gif',
          url: ''
        });
      }
    });
  }

  if (requirements.length === 0) {
    desc = desc || `Complete the programming task for "${cleanTitle}".`;
    requirements = [
      {
        id: `req_${index + 1}_1`,
        title: 'Initial placement',
        text: 'Arrange initial sprites and stage backdrop as required.',
        type: 'gif',
        url: ''
      },
      {
        id: `req_${index + 1}_2`,
        title: 'Programming script',
        text: `Create the code blocks for "${cleanTitle}".`,
        type: 'gif',
        url: ''
      },
      {
        id: `req_${index + 1}_3`,
        title: 'Check with teacher',
        text: 'Run the program and demonstrate the result to your teacher.',
        type: 'gif',
        url: ''
      }
    ];
  }

  // 4. Match Preview Images
  let previewUrl = '';
  const rawImages = rawTask.images || [];
  const levelPrefix = `level_${String(index + 1).padStart(2, '0')}`;

  const filteredTaskImgs = rawImages
    .map(img => img?.url || img?.src || '')
    .filter(u => u && !u.includes('Go.svg') && !u.includes('Stop.svg') && !u.includes('Switch_') && !u.includes('Enter_'));

  const matchingPng = filteredTaskImgs.find(u => u.toLowerCase().endsWith('.png'));
  const matchingSvg = filteredTaskImgs.find(u => u.toLowerCase().endsWith('.svg'));

  if (matchingPng) {
    previewUrl = matchingPng;
  } else if (matchingSvg) {
    previewUrl = matchingSvg;
  } else if (imagesInDir && imagesInDir.length > 0) {
    const dirMatchPng = imagesInDir.find(f => f.startsWith(levelPrefix) && f.endsWith('.png'));
    const dirMatchSvg = imagesInDir.find(f => f.startsWith(levelPrefix) && f.endsWith('.svg'));
    if (dirMatchPng) previewUrl = dirMatchPng;
    else if (dirMatchSvg) previewUrl = dirMatchSvg;
  }

  const taskId = `${pageId}_${index + 1}`;

  return {
    id: taskId,
    taskId: taskId,
    position: index + 1,
    level_position: index + 1,
    levelPosition: index + 1,
    title: cleanTitle,
    level_type: 'scratch',
    selectedType: 'scratch',
    activityType: 'scratch',
    drawerOpen: true,
    isAutoCheck: drawerHeading.includes('AUTOMATIC'),
    description: desc,
    command_keys: commandKeys,
    command_blocks: commandBlocks,
    requirements: requirements,
    media: previewUrl ? [
      {
        type: 'presentation',
        title: cleanTitle,
        text: desc || cleanTitle,
        url: previewUrl
      }
    ] : [],
    starter_project_id: rawTask.starter_project_id || '',
    demo_project_id: rawTask.demo_project_id || '',
    states: [
      {
        id: `${taskId}_state_1`,
        stateId: `${taskId}_state_1`,
        position: index + 1,
        level_position: index + 1,
        levelPosition: index + 1,
        type: 'scratch',
        selectedType: 'scratch',
        level_type: 'scratch',
        drawerOpen: true,
        description: desc,
        command_keys: commandKeys,
        command_blocks: commandBlocks,
        requirements: requirements,
        media: previewUrl ? [
          {
            type: 'presentation',
            title: cleanTitle,
            text: desc || cleanTitle,
            url: previewUrl
          }
        ] : []
      }
    ]
  };
}

async function convertPage(moduleId, pageId) {
  const pageDir = path.join(BASE_DIR, moduleId, 'pages', pageId);
  if (!fs.existsSync(pageDir)) return false;

  // Don't overwrite VP2_M1L1_3 or VP2_M1L2_3 which already have specialized asset bundles
  if (pageId === 'VP2_M1L1_3' || pageId === 'VP2_M1L2_3') {
    return false;
  }

  const instanceFile = path.join(pageDir, 'page.instance.json');
  const manifestFile = path.join(pageDir, 'manifest.json');
  const imagesDir = path.join(pageDir, 'workspace', 'images');

  let imagesInDir = [];
  if (fs.existsSync(imagesDir)) {
    imagesInDir = fs.readdirSync(imagesDir)
      .filter(f => !f.includes('Go.svg') && !f.includes('Stop.svg') && !f.includes('Switch_') && !f.includes('Enter_'))
      .map(f => `/courses/VP2/${moduleId}/pages/${pageId}/workspace/images/${f}`);
  }

  let sourceData = null;
  if (fs.existsSync(instanceFile)) {
    try {
      sourceData = JSON.parse(fs.readFileSync(instanceFile, 'utf8'));
    } catch (e) {}
  }
  if (!sourceData && fs.existsSync(manifestFile)) {
    try {
      sourceData = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    } catch (e) {}
  }

  if (!sourceData || !Array.isArray(sourceData.tasks) || sourceData.tasks.length === 0) {
    return false;
  }

  // Check if this page contains Scratch tasks
  const hasScratch = sourceData.tasks.some(isScratchTask);
  if (!hasScratch) {
    return false;
  }

  console.log(`[CONVERT] Processing ${moduleId} / ${pageId} (${sourceData.tasks.length} tasks)...`);

  const convertedTasks = sourceData.tasks.map((rawTask, idx) => {
    if (isScratchTask(rawTask) || isRatingTask(rawTask)) {
      return parseTaskDetails(rawTask, pageId, idx, imagesInDir);
    }
    return rawTask;
  });

  const updatedManifest = {
    version: 1,
    id: pageId,
    title: sourceData.title || pageId,
    type: 'scratch-task',
    level_type: 'scratch',
    taskCount: convertedTasks.length,
    metadata: {
      courseId: 'VP2',
      moduleId: moduleId,
      pageId: pageId,
      convertedAt: new Date().toISOString()
    },
    tasks: convertedTasks
  };

  const updatedInstance = {
    schemaVersion: 2,
    id: pageId,
    title: sourceData.title || pageId,
    type: 'scratch-task',
    level_type: 'scratch',
    taskCount: convertedTasks.length,
    tasks: convertedTasks
  };

  fs.writeFileSync(manifestFile, JSON.stringify(updatedManifest, null, 2), 'utf8');
  fs.writeFileSync(instanceFile, JSON.stringify(updatedInstance, null, 2), 'utf8');
  return true;
}

async function run() {
  console.log(`Starting full conversion across all ${ALL_MODULES.length} modules...`);
  let convertedPagesCount = 0;

  for (const moduleId of ALL_MODULES) {
    const pagesDir = path.join(BASE_DIR, moduleId, 'pages');
    if (!fs.existsSync(pagesDir)) continue;

    const pageDirs = fs.readdirSync(pagesDir).filter(f => fs.statSync(path.join(pagesDir, f)).isDirectory());
    for (const pageId of pageDirs) {
      const converted = await convertPage(moduleId, pageId);
      if (converted) convertedPagesCount++;
    }
  }

  console.log(`\nSuccessfully converted ${convertedPagesCount} Scratch pages across all 7 modules!`);

  // Synchronize index.json task counts
  const indexFile = path.join(BASE_DIR, 'index.json');
  if (fs.existsSync(indexFile)) {
    try {
      const indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      let syncedCount = 0;
      for (const group of indexData.lessons || []) {
        const m_id = group.id;
        for (const p of group.pages || []) {
          const mpath = path.join(BASE_DIR, m_id, 'pages', p.id, 'manifest.json');
          if (fs.existsSync(mpath)) {
            const mdata = JSON.parse(fs.readFileSync(mpath, 'utf8'));
            const count = (mdata.tasks || []).length;
            if (count > 0 && p.taskCount !== count) {
              p.taskCount = count;
              syncedCount++;
            }
          }
        }
      }
      fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), 'utf8');
      console.log(`[SYNC] Synchronized taskCount for ${syncedCount} pages in index.json.`);
    } catch (e) {
      console.warn('[WARN] Could not sync index.json:', e.message);
    }
  }
}

run().catch(console.error);
