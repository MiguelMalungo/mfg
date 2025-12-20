const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imageDir = path.join(__dirname, '../public/images');

// Get all JPG and PNG files recursively
function getAllImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && file !== 'optimized') {
      getAllImageFiles(filePath, fileList);
    } else if (/\.(jpg|jpeg|png)$/i.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

async function optimizeImages() {
  console.log('Starting image optimization for all images...\n');

  const imageFiles = getAllImageFiles(imageDir);
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;

  for (const inputPath of imageFiles) {
    try {
      const inputStats = fs.statSync(inputPath);
      const inputSizeKB = (inputStats.size / 1024).toFixed(2);
      totalOriginalSize += inputStats.size;

      // Generate WebP path (same location, different extension)
      const ext = path.extname(inputPath);
      const webpPath = inputPath.replace(new RegExp(ext + '$', 'i'), '.webp');

      // Skip if WebP already exists and is newer
      if (fs.existsSync(webpPath)) {
        const webpStats = fs.statSync(webpPath);
        if (webpStats.mtime > inputStats.mtime) {
          console.log(`⏭ Skipping ${path.relative(imageDir, inputPath)} - WebP already exists and is up to date`);
          totalOptimizedSize += webpStats.size;
          continue;
        }
      }

      // Convert to WebP with high quality compression
      await sharp(inputPath)
        .webp({ quality: 85, effort: 6 })
        .toFile(webpPath);

      const webpStats = fs.statSync(webpPath);
      const webpSizeKB = (webpStats.size / 1024).toFixed(2);
      const savings = ((1 - webpStats.size / inputStats.size) * 100).toFixed(1);
      totalOptimizedSize += webpStats.size;

      console.log(`✓ ${path.relative(imageDir, inputPath)}`);
      console.log(`  ${inputSizeKB} KB → ${webpSizeKB} KB (${savings}% smaller)\n`);

    } catch (error) {
      console.error(`✗ Error processing ${inputPath}:`, error.message);
    }
  }

  const totalSavings = ((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(1);
  console.log('\n=== Summary ===');
  console.log(`Total original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total optimized size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total savings: ${totalSavings}%`);
  console.log(`Processed ${imageFiles.length} images`);
}

optimizeImages().catch(console.error);
