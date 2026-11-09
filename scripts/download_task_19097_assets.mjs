import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import sharp from 'sharp';

const ASSETS_DIR = path.resolve('public/vp-assets/19097');
fs.mkdirSync(ASSETS_DIR, { recursive: true });

const rawUrls = [
  "/uploads/2020/08/1_1598270842.PNG",
  "/uploads/2020/08/2_1598270849.PNG",
  "/uploads/2020/08/1_1598271971.PNG",
  "/uploads/2020/08/2_1598271978.PNG",
  "/uploads/2020/08/3 1_1598271985.PNG",
  "/uploads/2020/08/3 2_1598271991.PNG",
  "/uploads/2021/02/scratch2-1_1613627764.png",
  "/uploads/2021/02/scratch2-2_1613627788.png",
  "/uploads/2021/02/scratch2-3_1613627800.png",
  "/uploads/2020/08/0.PNG",
  "/uploads/2020/08/1_1598272246.PNG",
  "/uploads/2020/08/2_1598272253.PNG",
  "/uploads/2020/08/3 1_1598272259.PNG",
  "/uploads/2020/08/3 2_1598272274.PNG",
  "/uploads/2021/02/scratch2-1_1613628380.png",
  "/uploads/2021/02/scratch3-2.png",
  "/uploads/2021/02/scratch3-3.png",
  "/uploads/2021/02/scratch2-3_1613628407.png",
  "/uploads/2020/08/1_1598272440.PNG",
  "/uploads/2020/08/2 1_1598272446.PNG",
  "/uploads/2020/08/2 2_1598272452.PNG",
  "/uploads/2019/07/1562869412021.svg",
  "/uploads/2021/02/scratch2-1_1613628789.png",
  "/uploads/2019/07/1562869412037-1.svg",
  "/uploads/2021/02/scratch3-2_1613628798.png",
  "/uploads/2021/02/scratch4-1_1613629034.png",
  "/uploads/2021/02/scratch4-2_1613629047.png",
  "/uploads/2020/08/М1У2 Внешность М1Т2 4 (1).PNG",
  "/uploads/2020/08/М1У2 Внешность М1Т2 4 (2).PNG",
  "/uploads/2020/08/М1У2 Внешность М1Т2 4 (3).PNG",
  "/uploads/2021/07/switchlight.png",
  "/uploads/2021/02/ratch5-2.png",
  "/uploads/2021/02/scratch5-3.png"
];

function downloadFile(relUrl) {
  return new Promise((resolve) => {
    const filename = path.basename(relUrl);
    const dest = path.join(ASSETS_DIR, filename);
    const fullUrl = `https://learn.alg.academy${encodeURI(relUrl)}`;

    if (fs.existsSync(dest)) {
      console.log(`[SKIP] Already exists: ${filename}`);
      return resolve(filename);
    }

    const file = fs.createWriteStream(dest);
    https.get(fullUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`[DONE] Downloaded: ${filename}`);
          resolve(filename);
        });
      } else {
        console.warn(`[WARN] Status ${response.statusCode} for ${fullUrl}`);
        resolve(null);
      }
    }).on('error', (err) => {
      console.error(`[ERR] Failed: ${filename}`, err.message);
      resolve(null);
    });
  });
}

async function convertToWebp() {
  const files = fs.readdirSync(ASSETS_DIR);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.png' && ext !== '.gif') continue;

    const srcPath = path.join(ASSETS_DIR, file);
    const destPath = path.join(ASSETS_DIR, `${path.basename(file, ext)}.webp`);

    try {
      if (ext === '.gif') {
        await sharp(srcPath, { animated: true })
          .webp({ quality: 75, effort: 4 })
          .toFile(destPath);
      } else if (ext === '.png') {
        await sharp(srcPath)
          .webp({ quality: 80, effort: 4 })
          .toFile(destPath);
      }
      console.log(`[CONVERT] ${file} -> ${path.basename(destPath)}`);
    } catch (err) {
      console.warn(`[CONVERT WARN] Could not convert ${file}:`, err.message);
    }
  }
}

async function run() {
  console.log(`Downloading ${rawUrls.length} assets to ${ASSETS_DIR}...`);
  for (const u of rawUrls) {
    await downloadFile(u);
  }
  console.log('All downloads completed. Converting to webp...');
  await convertToWebp();
  console.log('Finished asset processing for Task 19097!');
}

run();
