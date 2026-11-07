import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ASSETS_DIR = path.resolve('public/vp-assets/18343');

async function convertAll() {
  const files = fs.readdirSync(ASSETS_DIR);
  let originalTotal = 0;
  let newTotal = 0;
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.png' && ext !== '.gif') continue;
    
    const srcPath = path.join(ASSETS_DIR, file);
    const destPath = path.join(ASSETS_DIR, `${path.basename(file, ext)}.webp`);
    const srcSize = fs.statSync(srcPath).size;
    originalTotal += srcSize;
    
    console.log(`Converting ${file} (${(srcSize / 1024).toFixed(1)} KB)...`);
    
    if (ext === '.gif') {
      await sharp(srcPath, { animated: true })
        .webp({ quality: 75, effort: 4 })
        .toFile(destPath);
    } else if (ext === '.png') {
      await sharp(srcPath)
        .webp({ quality: 80, effort: 4 })
        .toFile(destPath);
    }
    
    const destSize = fs.statSync(destPath).size;
    newTotal += destSize;
    console.log(` -> ${path.basename(destPath)} (${(destSize / 1024).toFixed(1)} KB) [-${((1 - destSize/srcSize) * 100).toFixed(1)}%]`);
    
    // Remove the old bulky source file
    fs.unlinkSync(srcPath);
  }
  
  console.log('====================================');
  console.log(`Original total: ${(originalTotal / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`WebP total: ${(newTotal / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Saved: ${(1 - newTotal / originalTotal) * 100}%`);
}

convertAll().catch(err => {
  console.error('Error during conversion:', err);
  process.exit(1);
});
