const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../../public/images/store');
const outputDir = path.join(inputDir, 'copy');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get list of image files
fs.readdir(inputDir, async (err, files) => {
  if (err) {
    console.error('Error reading input directory:', err);
    return;
  }

  const imageFiles = files.filter(file => 
    ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file).toLowerCase())
  );

  for (const file of imageFiles) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);

    try {
      const metadata = await sharp(inputPath).metadata();
      await sharp(inputPath)
        .resize({
          width: Math.round(metadata.width / 3),
          height: Math.round(metadata.height / 3),
          fit: 'inside'
        })
        .toFile(outputPath);
      console.log(`Resized ${file} and saved to ${outputPath}`);
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }
});
