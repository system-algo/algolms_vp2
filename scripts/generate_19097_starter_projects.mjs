import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';

const OUT_DIR = path.resolve('public/starter-projects/19097');
fs.mkdirSync(OUT_DIR, { recursive: true });

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed ${url}: status ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// Scratch sound
const POP_SOUND = {
  assetId: "83a9787d4cb6f3b7632b4ddfebf74367",
  name: "pop",
  dataFormat: "wav",
  format: "",
  rate: 44100,
  sampleCount: 1032,
  md5ext: "83a9787d4cb6f3b7632b4ddfebf74367.wav"
};

// Stage backdrop1
const BACKDROP1 = {
  assetId: "cd21514d0531fdffb22204e0ec5ed84a",
  name: "backdrop1",
  bitmapResolution: 1,
  md5ext: "cd21514d0531fdffb22204e0ec5ed84a.svg",
  dataFormat: "svg",
  rotationCenterX: 240,
  rotationCenterY: 180
};

// Bear costumes
const BEAR_COSTUMES = [
  {
    assetId: "deef1eaa96d550ae6fc11524a1935024",
    name: "bear-a",
    bitmapResolution: 1,
    md5ext: "deef1eaa96d550ae6fc11524a1935024.svg",
    dataFormat: "svg",
    rotationCenterX: 100,
    rotationCenterY: 90
  },
  {
    assetId: "6f303e972f33fcb7ef36d0d8012d0975",
    name: "bear-b",
    bitmapResolution: 1,
    md5ext: "6f303e972f33fcb7ef36d0d8012d0975.svg",
    dataFormat: "svg",
    rotationCenterX: 94,
    rotationCenterY: 190.66666666666666
  }
];

// Snake costumes
const SNAKE_COSTUMES = [
  {
    assetId: "f0e6ebdbdc8571b42f8a48cc2aed3042",
    name: "snake-a",
    bitmapResolution: 1,
    md5ext: "f0e6ebdbdc8571b42f8a48cc2aed3042.svg",
    dataFormat: "svg",
    rotationCenterX: 142,
    rotationCenterY: 68
  },
  {
    assetId: "42519e0ee19d75def88a514d3c49ce37",
    name: "snake-b",
    bitmapResolution: 1,
    md5ext: "42519e0ee19d75def88a514d3c49ce37.svg",
    dataFormat: "svg",
    rotationCenterX: 142,
    rotationCenterY: 68
  },
  {
    assetId: "a0acb49efdf60b20cea0833eeedd44a1",
    name: "snake-c",
    bitmapResolution: 1,
    md5ext: "a0acb49efdf60b20cea0833eeedd44a1.svg",
    dataFormat: "svg",
    rotationCenterX: 142,
    rotationCenterY: 68
  }
];

// Heart costumes
const HEART_COSTUMES = [
  {
    assetId: "c77e640f6e023e7ce1e376da0f26e1eb",
    name: "heart red",
    bitmapResolution: 1,
    md5ext: "c77e640f6e023e7ce1e376da0f26e1eb.svg",
    dataFormat: "svg",
    rotationCenterX: 65,
    rotationCenterY: 56
  },
  {
    assetId: "e24731f5cf2759c2f289921bebb86ea2",
    name: "heart purple",
    bitmapResolution: 1,
    md5ext: "e24731f5cf2759c2f289921bebb86ea2.svg",
    dataFormat: "svg",
    rotationCenterX: 66,
    rotationCenterY: 62
  }
];

// Bear walking costumes
const BEAR_WALK_COSTUMES = [
  { assetId: "6d4d06e3f4cd0c9455b777b9a40782b6", name: "bear-walk-a", bitmapResolution: 1, md5ext: "6d4d06e3f4cd0c9455b777b9a40782b6.svg", dataFormat: "svg", rotationCenterX: 130, rotationCenterY: 94 },
  { assetId: "7453709bef16e33e6f989aee14d7fc07", name: "bear-walk-b", bitmapResolution: 1, md5ext: "7453709bef16e33e6f989aee14d7fc07.svg", dataFormat: "svg", rotationCenterX: 130, rotationCenterY: 94 },
  { assetId: "6d50c5fe63ab5f77d10144a68ca535a6", name: "bear-walk-c", bitmapResolution: 1, md5ext: "6d50c5fe63ab5f77d10144a68ca535a6.svg", dataFormat: "svg", rotationCenterX: 130, rotationCenterY: 94 },
  { assetId: "e531b307381c2aa148be4ccc36db0333", name: "bear-walk-d", bitmapResolution: 1, md5ext: "e531b307381c2aa148be4ccc36db0333.svg", dataFormat: "svg", rotationCenterX: 130, rotationCenterY: 94 }
];

// Backdrops
const ARCTIC_BACKDROP = {
  assetId: "67e0db3305b3c8bac3a363b1c428892e",
  name: "Arctic",
  bitmapResolution: 2,
  md5ext: "67e0db3305b3c8bac3a363b1c428892e.png",
  dataFormat: "png",
  rotationCenterX: 480,
  rotationCenterY: 360
};

const JURASSIC_BACKDROP = {
  assetId: "64025bdca5db4938f65597e3682fddcf",
  name: "Jurassic",
  bitmapResolution: 1,
  md5ext: "64025bdca5db4938f65597e3682fddcf.svg",
  dataFormat: "svg",
  rotationCenterX: 240,
  rotationCenterY: 180
};

const LIGHT_BACKDROP = {
  assetId: "4b98c07876ed8997c3762e75790507b4",
  name: "light",
  bitmapResolution: 1,
  md5ext: "4b98c07876ed8997c3762e75790507b4.svg",
  dataFormat: "svg",
  rotationCenterX: 240,
  rotationCenterY: 180
};

const STARS_BACKDROP = {
  assetId: "47282ff0f7047c6fab9c94b531abf721",
  name: "stars",
  bitmapResolution: 2,
  md5ext: "47282ff0f7047c6fab9c94b531abf721.png",
  dataFormat: "png",
  rotationCenterX: 480,
  rotationCenterY: 360
};

// Cat costumes
const CAT_COSTUMES = [
  {
    assetId: "bcf454acf82e4504149f7ffe07081dbc",
    name: "cat-a",
    bitmapResolution: 1,
    md5ext: "bcf454acf82e4504149f7ffe07081dbc.svg",
    dataFormat: "svg",
    rotationCenterX: 48,
    rotationCenterY: 50
  },
  {
    assetId: "0fb9be3e8397c983338cb71dc84d0b25",
    name: "cat-b",
    bitmapResolution: 1,
    md5ext: "0fb9be3e8397c983338cb71dc84d0b25.svg",
    dataFormat: "svg",
    rotationCenterX: 46,
    rotationCenterY: 53
  }
];

const MEOW_SOUND = {
  assetId: "83c36d806dc92327b9e7049a565c6bff",
  name: "Meow",
  dataFormat: "wav",
  format: "",
  rate: 44100,
  sampleCount: 37376,
  md5ext: "83c36d806dc92327b9e7049a565c6bff.wav"
};

// Star costume
const STAR_COSTUMES = [
  {
    assetId: "551629f2a64c1f3703e57aaa133effa6",
    name: "star1",
    bitmapResolution: 1,
    md5ext: "551629f2a64c1f3703e57aaa133effa6.svg",
    dataFormat: "svg",
    rotationCenterX: 22,
    rotationCenterY: 23
  }
];

const STAR_SOUND = {
  assetId: "32514c51e03db680e9c63857b840ae78",
  name: "collect",
  dataFormat: "wav",
  format: "adpcm",
  rate: 22050,
  sampleCount: 14225,
  md5ext: "32514c51e03db680e9c63857b840ae78.wav"
};

// Starter workspace block for Level 8 (change size by -5)
const LEVEL_8_STAR_BLOCKS = {
  "b_change_size": {
    opcode: "looks_changesizeby",
    next: null,
    parent: null,
    inputs: {
      CHANGE: [
        1,
        [
          4,
          "-5"
        ]
      ]
    },
    fields: {},
    shadow: false,
    topLevel: true,
    x: 100,
    y: 120
  }
};

// DEMO BLOCKS for Level 1: Bear says "Hello!" for 3 seconds
const LEVEL_1_DEMO_BLOCKS = {
  "b_flag": {
    opcode: "event_whenflagclicked",
    next: "b_say",
    parent: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: true,
    x: 43,
    y: 58
  },
  "b_say": {
    opcode: "looks_sayforsecs",
    next: null,
    parent: "b_flag",
    inputs: {
      MESSAGE: [1, [10, "Hello!"]],
      SECS: [1, [4, "3"]]
    },
    fields: {},
    shadow: false,
    topLevel: false
  }
};

// DEMO BLOCKS for Level 2: Snake switches to snake-a, waits 1s, switches to snake-b
const LEVEL_2_DEMO_BLOCKS = {
  "b_flag": {
    opcode: "event_whenflagclicked",
    next: "b_switch1",
    parent: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: true,
    x: 40,
    y: 50
  },
  "b_switch1": {
    opcode: "looks_switchcostumeto",
    next: "b_wait",
    parent: "b_flag",
    inputs: {
      COSTUME: [1, "b_costume1_menu"]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_costume1_menu": {
    opcode: "looks_costume",
    next: null,
    parent: "b_switch1",
    inputs: {},
    fields: {
      COSTUME: ["snake-a", null]
    },
    shadow: true,
    topLevel: false
  },
  "b_wait": {
    opcode: "control_wait",
    next: "b_switch2",
    parent: "b_switch1",
    inputs: {
      DURATION: [1, [5, "1"]]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_switch2": {
    opcode: "looks_switchcostumeto",
    next: null,
    parent: "b_wait",
    inputs: {
      COSTUME: [1, "b_costume2_menu"]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_costume2_menu": {
    opcode: "looks_costume",
    next: null,
    parent: "b_switch2",
    inputs: {},
    fields: {
      COSTUME: ["snake-b", null]
    },
    shadow: true,
    topLevel: false
  }
};

// DEMO BLOCKS for Level 3: Heart repeats 4 times: next costume, wait 1s
const LEVEL_3_DEMO_BLOCKS = {
  "b_flag": {
    opcode: "event_whenflagclicked",
    next: "b_repeat",
    parent: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: true,
    x: 40,
    y: 50
  },
  "b_repeat": {
    opcode: "control_repeat",
    next: null,
    parent: "b_flag",
    inputs: {
      TIMES: [1, [6, "4"]],
      SUBSTACK: [2, "b_next"]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_next": {
    opcode: "looks_nextcostume",
    next: "b_wait",
    parent: "b_repeat",
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_wait": {
    opcode: "control_wait",
    next: null,
    parent: "b_next",
    inputs: {
      DURATION: [1, [5, "1"]]
    },
    fields: {},
    shadow: false,
    topLevel: false
  }
};

// DEMO BLOCKS for Level 4: Bear walks forever: next costume, wait 0.3s
const LEVEL_4_DEMO_BLOCKS = {
  "b_flag": {
    opcode: "event_whenflagclicked",
    next: "b_forever",
    parent: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: true,
    x: 40,
    y: 50
  },
  "b_forever": {
    opcode: "control_forever",
    next: null,
    parent: "b_flag",
    inputs: {
      SUBSTACK: [2, "b_next"]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_next": {
    opcode: "looks_nextcostume",
    next: "b_wait",
    parent: "b_forever",
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_wait": {
    opcode: "control_wait",
    next: null,
    parent: "b_next",
    inputs: {
      DURATION: [1, [5, "0.3"]]
    },
    fields: {},
    shadow: false,
    topLevel: false
  }
};

// DEMO BLOCKS for Level 5: Stage switches to light, repeats 12: wait 1s, next backdrop
const LEVEL_5_DEMO_BLOCKS = {
  "b_flag": {
    opcode: "event_whenflagclicked",
    next: "b_switch",
    parent: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: true,
    x: 40,
    y: 50
  },
  "b_switch": {
    opcode: "looks_switchbackdropto",
    next: "b_repeat",
    parent: "b_flag",
    inputs: {
      BACKDROP: [1, "b_backdrop_menu"]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_backdrop_menu": {
    opcode: "looks_backdrops",
    next: null,
    parent: "b_switch",
    inputs: {},
    fields: {
      BACKDROP: ["light", null]
    },
    shadow: true,
    topLevel: false
  },
  "b_repeat": {
    opcode: "control_repeat",
    next: null,
    parent: "b_switch",
    inputs: {
      TIMES: [1, [6, "12"]],
      SUBSTACK: [2, "b_wait"]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_wait": {
    opcode: "control_wait",
    next: "b_next",
    parent: "b_repeat",
    inputs: {
      DURATION: [1, [5, "1"]]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_next": {
    opcode: "looks_nextbackdrop",
    next: null,
    parent: "b_wait",
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: false
  }
};

// DEMO BLOCKS for Level 7: Super cat flies/changes costume
const LEVEL_7_DEMO_BLOCKS = {
  "b_flag": {
    opcode: "event_whenflagclicked",
    next: "b_say",
    parent: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: true,
    x: 40,
    y: 50
  },
  "b_say": {
    opcode: "looks_sayforsecs",
    next: "b_forever",
    parent: "b_flag",
    inputs: {
      MESSAGE: [1, [10, "Super Cat!"]],
      SECS: [1, [4, "2"]]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_forever": {
    opcode: "control_forever",
    next: null,
    parent: "b_say",
    inputs: {
      SUBSTACK: [2, "b_next"]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_next": {
    opcode: "looks_nextcostume",
    next: "b_wait",
    parent: "b_forever",
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_wait": {
    opcode: "control_wait",
    next: null,
    parent: "b_next",
    inputs: {
      DURATION: [1, [5, "0.3"]]
    },
    fields: {},
    shadow: false,
    topLevel: false
  }
};

// DEMO BLOCKS for Level 8: Star decreases and increases size repeatedly
const LEVEL_8_DEMO_BLOCKS = {
  "b_flag": {
    opcode: "event_whenflagclicked",
    next: "b_forever",
    parent: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: true,
    x: 40,
    y: 50
  },
  "b_forever": {
    opcode: "control_forever",
    next: null,
    parent: "b_flag",
    inputs: {
      SUBSTACK: [2, "b_rep1"]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_rep1": {
    opcode: "control_repeat",
    next: "b_rep2",
    parent: "b_forever",
    inputs: {
      TIMES: [1, [6, "10"]],
      SUBSTACK: [2, "b_dec"]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_dec": {
    opcode: "looks_changesizeby",
    next: "b_wait1",
    parent: "b_rep1",
    inputs: {
      CHANGE: [1, [4, "-5"]]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_wait1": {
    opcode: "control_wait",
    next: null,
    parent: "b_dec",
    inputs: {
      DURATION: [1, [5, "0.1"]]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_rep2": {
    opcode: "control_repeat",
    next: null,
    parent: "b_rep1",
    inputs: {
      TIMES: [1, [6, "10"]],
      SUBSTACK: [2, "b_inc"]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_inc": {
    opcode: "looks_changesizeby",
    next: "b_wait2",
    parent: "b_rep2",
    inputs: {
      CHANGE: [1, [4, "5"]]
    },
    fields: {},
    shadow: false,
    topLevel: false
  },
  "b_wait2": {
    opcode: "control_wait",
    next: null,
    parent: "b_inc",
    inputs: {
      DURATION: [1, [5, "0.1"]]
    },
    fields: {},
    shadow: false,
    topLevel: false
  }
};

// Cache downloaded assets
const assetCache = new Map();

function buildClockSvg(hour) {
  const cx = 240;
  const cy = 180;
  const rNums = 108;
  const handLen = 78;
  let numbersSvg = "";
  for (let h = 1; h <= 12; h++) {
    const rad = (h * 30 * Math.PI) / 180;
    const nx = cx + rNums * Math.sin(rad);
    const ny = cy - rNums * Math.cos(rad) + 11;
    numbersSvg += `    <text x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="32" text-anchor="middle" fill="#000000">${h}</text>\n`;
  }
  const handRad = (hour * 30 * Math.PI) / 180;
  const hx = cx + handLen * Math.sin(handRad);
  const hy = cy - handLen * Math.cos(handRad);
  return `<svg version="1.1" width="480" height="360" viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="480" height="360" fill="#FFE7C0"/>
  <circle cx="${cx}" cy="${cy}" r="145" fill="#FFFCF9" stroke="#FFFFFF" stroke-width="4"/>
  <g>
${numbersSvg}  </g>
  <line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#000000" stroke-width="6" stroke-linecap="round"/>
</svg>`;
}

const CLOCK_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const CLOCK_BACKDROPS = CLOCK_HOURS.map((h, idx) => {
  const name = idx === 0 ? "light" : `light${idx + 1}`;
  const svg = buildClockSvg(h);
  const buf = Buffer.from(svg, 'utf8');
  const hash = crypto.createHash('md5').update(buf).digest('hex');
  const md5ext = `${hash}.svg`;
  assetCache.set(md5ext, buf);
  return {
    assetId: hash,
    name,
    bitmapResolution: 1,
    md5ext,
    dataFormat: "svg",
    rotationCenterX: 240,
    rotationCenterY: 180
  };
});

async function getAsset(md5ext) {
  if (assetCache.has(md5ext)) return assetCache.get(md5ext);

  // 1. Check existing .sb3 files in OUT_DIR
  try {
    const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.sb3'));
    for (const f of files) {
      const zip = new AdmZip(path.join(OUT_DIR, f));
      const entry = zip.getEntry(md5ext);
      if (entry) {
        const buf = entry.getData();
        assetCache.set(md5ext, buf);
        return buf;
      }
    }
  } catch (e) {}

  // 2. Check 18343 starter projects directory
  try {
    const dir18343 = path.resolve('public/starter-projects/18343');
    if (fs.existsSync(dir18343)) {
      const files = fs.readdirSync(dir18343).filter(f => f.endsWith('.sb3'));
      for (const f of files) {
        const zip = new AdmZip(path.join(dir18343, f));
        const entry = zip.getEntry(md5ext);
        if (entry) {
          const buf = entry.getData();
          assetCache.set(md5ext, buf);
          return buf;
        }
      }
    }
  } catch (e) {}

  const url = `https://assets.scratch.mit.edu/internalapi/asset/${md5ext}/get/`;
  console.log(`Downloading asset: ${md5ext}...`);
  const buf = await fetchBuffer(url);
  assetCache.set(md5ext, buf);
  return buf;
}

function makeStage(costumes, currentCostume = undefined, blocks = {}) {
  return {
    isStage: true,
    name: "Stage",
    variables: {},
    lists: {},
    broadcasts: {},
    blocks,
    comments: {},
    currentCostume: currentCostume !== undefined ? currentCostume : (costumes.length > 1 ? 1 : 0),
    costumes,
    sounds: [POP_SOUND],
    volume: 100,
    layerOrder: 0,
    tempo: 60,
    videoTransparency: 50,
    videoState: "on",
    textToSpeechLanguage: null
  };
}

function makeSprite(name, costumes, x = 0, y = 0, size = 100, blocks = {}, sounds = [POP_SOUND]) {
  return {
    isStage: false,
    name,
    variables: {},
    lists: {},
    broadcasts: {},
    blocks,
    comments: {},
    currentCostume: 0,
    costumes,
    sounds,
    volume: 100,
    layerOrder: 1,
    visible: true,
    x,
    y,
    size,
    direction: 90,
    draggable: false,
    rotationStyle: "all around"
  };
}

async function buildSb3(filename, targets) {
  const zip = new AdmZip();
  const projectJson = {
    targets,
    monitors: [],
    extensions: [],
    meta: {
      semver: "3.0.0",
      vm: "0.2.0",
      agent: "Mozilla/5.0 AlgoLMS"
    }
  };

  zip.addFile("project.json", Buffer.from(JSON.stringify(projectJson), "utf8"));

  // Collect all unique assets
  const neededAssets = new Set();
  for (const t of targets) {
    for (const c of t.costumes) neededAssets.add(c.md5ext);
    for (const s of t.sounds) neededAssets.add(s.md5ext);
  }

  for (const md5 of neededAssets) {
    try {
      const data = await getAsset(md5);
      zip.addFile(md5, data);
    } catch (e) {
      console.warn(`Could not add asset ${md5}:`, e.message);
    }
  }

  const outPath = path.join(OUT_DIR, filename);
  zip.writeZip(outPath);
  console.log(`Created: ${filename} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log('Building starter projects for Task 19097...');

  // Level 1: Bear on Arctic
  const lvl1Targets = [
    makeStage([BACKDROP1, ARCTIC_BACKDROP]),
    makeSprite("Bear", BEAR_COSTUMES, 0, 0, 100)
  ];
  await buildSb3("level_1.sb3", lvl1Targets);
  await buildSb3("9097624.sb3", lvl1Targets);

  // Level 2: Snake on Jurassic
  const lvl2Targets = [
    makeStage([BACKDROP1, JURASSIC_BACKDROP]),
    makeSprite("Snake", SNAKE_COSTUMES, -40, -40, 90)
  ];
  await buildSb3("level_2.sb3", lvl2Targets);
  await buildSb3("9097811.sb3", lvl2Targets);

  // Level 3: Heart
  const lvl3Targets = [
    makeStage([BACKDROP1]),
    makeSprite("Heart", HEART_COSTUMES, 0, 0, 100)
  ];
  await buildSb3("level_3.sb3", lvl3Targets);
  await buildSb3("9098276.sb3", lvl3Targets);

  // Level 4: Bear-walking on Arctic
  const lvl4Targets = [
    makeStage([BACKDROP1, ARCTIC_BACKDROP]),
    makeSprite("Bear-walking", BEAR_WALK_COSTUMES, -120, -20, 90)
  ];
  await buildSb3("level_4.sb3", lvl4Targets);
  await buildSb3("9098728.sb3", lvl4Targets);

  // Level 5: Light / Clock Stage (12 authentic clock backdrops)
  const lvl5Targets = [
    makeStage(CLOCK_BACKDROPS, 0)
  ];
  await buildSb3("level_5.sb3", lvl5Targets);
  await buildSb3("9099214.sb3", lvl5Targets);

  // Level 7: Bonus 1 - M1L2 Super cat
  const lvl7Targets = [
    makeStage([BACKDROP1]),
    makeSprite("Sprite1", CAT_COSTUMES, 0, 0, 100, {}, [MEOW_SOUND])
  ];
  await buildSb3("level_7.sb3", lvl7Targets);

  // Level 8: Bonus 2 - M1L2 A star / Flashing star
  const lvl8Targets = [
    makeStage([STARS_BACKDROP]),
    makeSprite("Star1", STAR_COSTUMES, 3, 23, 90, LEVEL_8_STAR_BLOCKS, [STAR_SOUND])
  ];
  await buildSb3("level_8.sb3", lvl8Targets);

  // === DEMO PROJECTS (Authentic working solutions for demonstration player) ===
  console.log('Building demo projects for Task 19097...');

  // Level 1 Demo: 9097732
  const lvl1DemoTargets = [
    makeStage([BACKDROP1, ARCTIC_BACKDROP], 1),
    makeSprite("Bear", BEAR_COSTUMES, 0, 0, 100, LEVEL_1_DEMO_BLOCKS)
  ];
  await buildSb3("9097732.sb3", lvl1DemoTargets);
  await buildSb3("level_1_demo.sb3", lvl1DemoTargets);

  // Level 2 Demo: 10653299
  const lvl2DemoTargets = [
    makeStage([BACKDROP1, JURASSIC_BACKDROP], 1),
    makeSprite("Snake", SNAKE_COSTUMES, -40, -40, 90, LEVEL_2_DEMO_BLOCKS)
  ];
  await buildSb3("10653299.sb3", lvl2DemoTargets);
  await buildSb3("level_2_demo.sb3", lvl2DemoTargets);

  // Level 3 Demo: 2660241
  const lvl3DemoTargets = [
    makeStage([BACKDROP1], 0),
    makeSprite("Heart", HEART_COSTUMES, 0, 0, 100, LEVEL_3_DEMO_BLOCKS)
  ];
  await buildSb3("2660241.sb3", lvl3DemoTargets);
  await buildSb3("level_3_demo.sb3", lvl3DemoTargets);

  // Level 4 Demo: 2660096
  const lvl4DemoTargets = [
    makeStage([BACKDROP1, ARCTIC_BACKDROP], 1),
    makeSprite("Bear-walking", BEAR_WALK_COSTUMES, -120, -20, 90, LEVEL_4_DEMO_BLOCKS)
  ];
  await buildSb3("2660096.sb3", lvl4DemoTargets);
  await buildSb3("level_4_demo.sb3", lvl4DemoTargets);

  // Level 5 Demo: 2660244
  const lvl5DemoTargets = [
    makeStage(CLOCK_BACKDROPS, 0, LEVEL_5_DEMO_BLOCKS)
  ];
  await buildSb3("2660244.sb3", lvl5DemoTargets);
  await buildSb3("level_5_demo.sb3", lvl5DemoTargets);

  // Level 7 Demo: level_7_demo
  const lvl7DemoTargets = [
    makeStage([BACKDROP1], 0),
    makeSprite("Sprite1", CAT_COSTUMES, 0, 0, 100, LEVEL_7_DEMO_BLOCKS, [MEOW_SOUND])
  ];
  await buildSb3("level_7_demo.sb3", lvl7DemoTargets);

  // Level 8 Demo: level_8_demo
  const lvl8DemoTargets = [
    makeStage([STARS_BACKDROP], 0),
    makeSprite("Star1", STAR_COSTUMES, 3, 23, 90, LEVEL_8_DEMO_BLOCKS, [STAR_SOUND])
  ];
  await buildSb3("level_8_demo.sb3", lvl8DemoTargets);

  console.log('All Task 19097 starter and demo projects created successfully!');
}

main().catch(err => console.error(err));
