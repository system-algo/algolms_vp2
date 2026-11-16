import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import sharp from 'sharp';

const OUT_DIR = path.resolve('public/vp-assets/19846');
fs.mkdirSync(OUT_DIR, { recursive: true });

const images = [
  { url: '/uploads/2021/03/bo2_1616072433.png', name: 'bo2_1616072433.webp' },
  { url: '/uploads/2021/03/bo2-2.png', name: 'bo2-2.webp' },
  { url: '/uploads/2021/03/bo3_1616072587.png', name: 'bo3_1616072587.webp' },
  { url: '/uploads/2021/03/bo3-1.png', name: 'bo3-1.webp' },
  { url: '/uploads/2021/03/bo4_1616072739.png', name: 'bo4_1616072739.webp' },
  { url: '/uploads/2021/03/bo5_1616072838.png', name: 'bo5_1616072838.webp' },
  { url: '/uploads/2021/03/bo5-1.png', name: 'bo5-1.webp' },
  { url: '/uploads/2021/03/bo7_1616072917.png', name: 'bo7_1616072917.webp' },
  { url: '/uploads/2021/03/bonus-2.png', name: 'bonus-2.webp' },
  { url: '/uploads/2021/03/BONUS_21.png', name: 'BONUS_21.webp' },
  { url: '/uploads/2021/03/BONUS_22.png', name: 'BONUS_22.webp' },
  { url: '/uploads/2021/03/BONUS_23.png', name: 'BONUS_23.webp' }
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function main() {
  for (const item of images) {
    const targetPath = path.join(OUT_DIR, item.name);
    if (fs.existsSync(targetPath)) {
      console.log(` Already exists: ${item.name}`);
      continue;
    }
    const fullUrl = `https://learn.alg.academy${item.url}`;
    console.log(`Downloading ${fullUrl} -> ${item.name}...`);
    try {
      const buf = await fetchBuffer(fullUrl);
      await sharp(buf).webp({ quality: 85 }).toFile(targetPath);
      const stat = fs.statSync(targetPath);
      console.log(` Saved ${item.name} (${stat.size} bytes)`);
    } catch (err) {
      console.error(` Failed on ${item.url}:`, err.message);
    }
  }
}

main();
