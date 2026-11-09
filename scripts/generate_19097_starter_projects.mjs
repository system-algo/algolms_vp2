import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
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

// Cache downloaded assets
const assetCache = new Map();

async function getAsset(md5ext) {
  if (assetCache.has(md5ext)) return assetCache.get(md5ext);
  const url = `https://assets.scratch.mit.edu/internalapi/asset/${md5ext}/get/`;
  console.log(`Downloading asset: ${md5ext}...`);
  const buf = await fetchBuffer(url);
  assetCache.set(md5ext, buf);
  return buf;
}

function makeStage(costumes) {
  return {
    isStage: true,
    name: "Stage",
    variables: {},
    lists: {},
    broadcasts: {},
    blocks: {},
    comments: {},
    currentCostume: costumes.length > 1 ? 1 : 0,
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

function makeSprite(name, costumes, x = 0, y = 0, size = 100) {
  return {
    isStage: false,
    name,
    variables: {},
    lists: {},
    broadcasts: {},
    blocks: {},
    comments: {},
    currentCostume: 0,
    costumes,
    sounds: [POP_SOUND],
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

  // Level 5: Light / Clock Stage
  const lvl5Targets = [
    makeStage([BACKDROP1, LIGHT_BACKDROP])
  ];
  await buildSb3("level_5.sb3", lvl5Targets);
  await buildSb3("9099214.sb3", lvl5Targets);

  console.log('All Task 19097 starter projects created successfully!');
}

main().catch(err => console.error(err));
