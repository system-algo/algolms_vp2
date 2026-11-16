import AdmZip from "adm-zip";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT_DIR = path.resolve("public/starter-projects/19847");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Extract common assets from 19097/level_1.sb3
const baseZip = new AdmZip("public/starter-projects/19097/level_1.sb3");
const backdropSvgBuf = baseZip.readFile("cd21514d0531fdffb22204e0ec5ed84a.svg");
const popWavBuf = baseZip.readFile("83a9787d4cb6f3b7632b4ddfebf74367.wav");

// Extract Apple SVG
const appleZip = new AdmZip("public/starter-projects/M5L3_Apple_picking_season.sb3");
const appleSvgBuf = appleZip.readFile("3826a4091a33e4d26f87a2fac7cf796b.svg");

// Extract Beetle SVG
const beetleZip = new AdmZip("public/starter-projects/М3L2 Beetle on a tree.sb3");
const beetleSvgBuf = beetleZip.readFile("46d0dfd4ae7e9bfe3a6a2e35a4905eae.svg");

// Create Green Flag SVG matching Scratch library / g2_f0.png
const GREEN_FLAG_SVG = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="45" height="50" viewBox="0 0 45 50">
  <path fill="#549E1F" stroke="#3D7316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M 5 48 L 5 4 C 5 4 12 0 20 5 C 28 10 38 4 41 8 C 43 11 41 24 41 24 C 35 22 27 27 20 23 C 13 19 5 22 5 22 L 5 48 Z"/>
</svg>`;
const flagSvgBuf = Buffer.from(GREEN_FLAG_SVG, "utf8");
const flagHash = crypto.createHash("md5").update(flagSvgBuf).digest("hex");

// Create blank costume SVG for empty drawing canvas
const BLANK_SVG = `<svg version="1.1" width="2" height="2" viewBox="0 0 2 2" xmlns="http://www.w3.org/2000/svg"/>`;
const blankSvgBuf = Buffer.from(BLANK_SVG, "utf8");
const blankHash = crypto.createHash("md5").update(blankSvgBuf).digest("hex");

function makeStage() {
  return {
    isStage: true,
    name: "Stage",
    variables: {},
    lists: {},
    broadcasts: {},
    blocks: {},
    comments: {},
    currentCostume: 0,
    costumes: [
      {
        assetId: "cd21514d0531fdffb22204e0ec5ed84a",
        name: "backdrop1",
        bitmapResolution: 1,
        md5ext: "cd21514d0531fdffb22204e0ec5ed84a.svg",
        dataFormat: "svg",
        rotationCenterX: 240,
        rotationCenterY: 180
      }
    ],
    sounds: [
      {
        assetId: "83a9787d4cb6f3b7632b4ddfebf74367",
        name: "pop",
        dataFormat: "wav",
        format: "",
        rate: 44100,
        sampleCount: 1032,
        md5ext: "83a9787d4cb6f3b7632b4ddfebf74367.wav"
      }
    ],
    volume: 100,
    layerOrder: 0,
    tempo: 60,
    videoTransparency: 50,
    videoState: "on",
    textToSpeechLanguage: null
  };
}

function makeSprite(name, costumeObj, x = 0, y = 0, size = 100) {
  return {
    isStage: false,
    name: name,
    variables: {},
    lists: {},
    broadcasts: {},
    blocks: {},
    comments: {},
    currentCostume: 0,
    costumes: [costumeObj],
    sounds: [
      {
        assetId: "83a9787d4cb6f3b7632b4ddfebf74367",
        name: "pop",
        dataFormat: "wav",
        format: "",
        rate: 44100,
        sampleCount: 1032,
        md5ext: "83a9787d4cb6f3b7632b4ddfebf74367.wav"
      }
    ],
    volume: 100,
    layerOrder: 1,
    visible: true,
    x: x,
    y: y,
    size: size,
    direction: 90,
    draggable: false,
    rotationStyle: "all around"
  };
}

function buildSb3(filename, targets, extraAssets = []) {
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
  zip.addFile("cd21514d0531fdffb22204e0ec5ed84a.svg", backdropSvgBuf);
  zip.addFile("83a9787d4cb6f3b7632b4ddfebf74367.wav", popWavBuf);

  for (const a of extraAssets) {
    zip.addFile(a.name, a.buf);
  }

  const out = path.join(OUT_DIR, filename);
  zip.writeZip(out);
  console.log(`Created: ${filename} (${fs.statSync(out).size} bytes)`);
}

// 1. Level 1: Apple
const appleCostume = {
  assetId: "3826a4091a33e4d26f87a2fac7cf796b",
  name: "apple",
  bitmapResolution: 1,
  md5ext: "3826a4091a33e4d26f87a2fac7cf796b.svg",
  dataFormat: "svg",
  rotationCenterX: 31,
  rotationCenterY: 31
};
const lvl1Targets = [makeStage(), makeSprite("Apple", appleCostume, 0, 0, 100)];
buildSb3("9639729.sb3", lvl1Targets, [{ name: "3826a4091a33e4d26f87a2fac7cf796b.svg", buf: appleSvgBuf }]);
buildSb3("level_1.sb3", lvl1Targets, [{ name: "3826a4091a33e4d26f87a2fac7cf796b.svg", buf: appleSvgBuf }]);

// 2. Level 2: Green Flag
const flagCostume = {
  assetId: flagHash,
  name: "green flag",
  bitmapResolution: 1,
  md5ext: `${flagHash}.svg`,
  dataFormat: "svg",
  rotationCenterX: 5,
  rotationCenterY: 4
};
const lvl2Targets = [makeStage(), makeSprite("Green flag", flagCostume, 0, 0, 100)];
buildSb3("9639743.sb3", lvl2Targets, [{ name: `${flagHash}.svg`, buf: flagSvgBuf }]);
buildSb3("level_2.sb3", lvl2Targets, [{ name: `${flagHash}.svg`, buf: flagSvgBuf }]);

// 3. Level 3: Snowman (Draw character)
const blankCostume = {
  assetId: blankHash,
  name: "costume1",
  bitmapResolution: 1,
  md5ext: `${blankHash}.svg`,
  dataFormat: "svg",
  rotationCenterX: 1,
  rotationCenterY: 1
};
const lvl3Targets = [makeStage(), makeSprite("Snowman", blankCostume, 0, 0, 100)];
buildSb3("9639758.sb3", lvl3Targets, [{ name: `${blankHash}.svg`, buf: blankSvgBuf }]);
buildSb3("level_3.sb3", lvl3Targets, [{ name: `${blankHash}.svg`, buf: blankSvgBuf }]);

// 4. Level 4: Flower
const lvl4Targets = [makeStage(), makeSprite("Flower", blankCostume, 0, 0, 100)];
buildSb3("9639774.sb3", lvl4Targets, [{ name: `${blankHash}.svg`, buf: blankSvgBuf }]);
buildSb3("level_4.sb3", lvl4Targets, [{ name: `${blankHash}.svg`, buf: blankSvgBuf }]);

// 5. Level 5: Beetle
const beetleCostume = {
  assetId: "46d0dfd4ae7e9bfe3a6a2e35a4905eae",
  name: "beetle",
  bitmapResolution: 1,
  md5ext: "46d0dfd4ae7e9bfe3a6a2e35a4905eae.svg",
  dataFormat: "svg",
  rotationCenterX: 43,
  rotationCenterY: 38
};
const lvl5Targets = [makeStage(), makeSprite("Beetle", beetleCostume, 0, 0, 100)];
buildSb3("9639793.sb3", lvl5Targets, [{ name: "46d0dfd4ae7e9bfe3a6a2e35a4905eae.svg", buf: beetleSvgBuf }]);
buildSb3("level_5.sb3", lvl5Targets, [{ name: "46d0dfd4ae7e9bfe3a6a2e35a4905eae.svg", buf: beetleSvgBuf }]);

console.log("All 19847 starter projects generated!");
