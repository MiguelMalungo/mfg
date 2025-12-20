const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imageDir = path.join(__dirname, '../public/images');
const outputDir = path.join(__dirname, '../public/images/optimized');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const imageFiles = [
  'imageA.png',
  'imaged.png',
  'glutamato.jpg',
  'oxitocina.jpg',
  'dopamina.jpg',
  'adrenalina.jpg',
  'serotonina.jpg',
  'dual.jpg',
  'void0.jpg',
  'void2.jpg',
  'void4.jpg',
  'void1.jpg',
  'noradrenalina.jpg',
  'gaba.jpg',
  'blocks.png'
];

async function optimizeImages() {
  console.log('Starting image optimization...\n');

  for (const file of imageFiles) {
    const inputPath = path.join(imageDir, file);

    // Skip if file doesn't exist
    if (!fs.existsSync(inputPath)) {
      console.log(`Skipping ${file} - file not found`);
      continue;
    }

    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, ext);

    try {
      const inputStats = fs.statSync(inputPath);
      const inputSizeKB = (inputStats.size / 1024).toFixed(2);

      // Convert to WebP with high quality compression
      const webpPath = path.join(outputDir, `${baseName}.webp`);
      await sharp(inputPath)
        .webp({ quality: 85, effort: 6 })
        .toFile(webpPath);

      const webpStats = fs.statSync(webpPath);
      const webpSizeKB = (webpStats.size / 1024).toFixed(2);
      const savings = ((1 - webpStats.size / inputStats.size) * 100).toFixed(1);

      console.log(`✓ ${file}`);
      console.log(`  Original: ${inputSizeKB} KB → WebP: ${webpSizeKB} KB (${savings}% smaller)\n`);

    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }

  console.log('Image optimization complete!');
}

optimizeImages().catch(console.error);
