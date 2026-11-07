import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const ASSETS_DIR = path.resolve('public/vp-assets/18343');
fs.mkdirSync(ASSETS_DIR, { recursive: true });

const urls = [
  "/uploads/2021/07/jurassic.gif",
  "/uploads/2021/07/dinos.gif",
  "/uploads/2021/07/delete sprite.gif",
  "/uploads/2021/07/saving a project.png",
  "/uploads/2021/02/1-3.gif",
  "/uploads/2021/07/jurassic_1627549486.gif",
  "/uploads/2021/02/1-3_1613029171.gif",
  "/uploads/2021/07/jurassic_1627549710.gif",
  "/uploads/2021/02/1-3_1612957339.gif",
  "/uploads/2021/07/dinos_1627549772.gif",
  "/uploads/2022/02/спрайт-3.gif",
  "/uploads/2021/02/44.gif",
  "/uploads/2021/07/dinos_1627554879.gif",
  "/uploads/2021/08/5.png",
  "/uploads/2021/02/44_1612957387.gif",
  "/uploads/2021/07/delete sprite_1627554929.gif",
  "/uploads/2021/02/6.gif",
  "/uploads/2021/07/delete sprite_1627554966.gif",
  "/uploads/2021/02/6_1612957429.gif",
  "/uploads/2021/07/backdrop.gif",
  "/uploads/2021/02/8_1613029277.gif",
  "/uploads/2021/07/costumes.gif",
  "/uploads/2021/02/star1.gif",
  "/uploads/2021/07/hello.png",
  "/uploads/2021/07/start.png",
  "/uploads/2021/07/hello_1626177879.png",
  "/uploads/2021/07/switch backdrop space.png",
  "/uploads/2021/07/hello_1626177970.png"
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

async function run() {
  console.log(`Downloading ${urls.length} assets to ${ASSETS_DIR}...`);
  for (const u of urls) {
    await downloadFile(u);
  }
  console.log('All downloads completed!');
}

run();
