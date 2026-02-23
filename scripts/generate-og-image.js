import sharp from "sharp";
import fs from "fs";
import path from "path";

const width = 1200;
const height = 630;

// Create SVG for OG image
const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#faf8f5"/>

  <!-- Subtle border -->
  <rect x="40" y="40" width="${width - 80}" height="${height - 80}"
        fill="none" stroke="#e0d8d0" stroke-width="2"/>

  <!-- Main title -->
  <text x="${width / 2}" y="260"
        font-family="Georgia, serif"
        font-size="72"
        font-weight="400"
        fill="#2c2420"
        text-anchor="middle">Hugues Costa</text>

  <!-- Subtitle -->
  <text x="${width / 2}" y="330"
        font-family="Georgia, serif"
        font-size="28"
        font-weight="400"
        font-style="italic"
        fill="#6b6360"
        text-anchor="middle">Photography Portfolio</text>

  <!-- Description -->
  <text x="${width / 2}" y="410"
        font-family="Arial, sans-serif"
        font-size="20"
        fill="#6b6360"
        text-anchor="middle">A memorial collection of photographs</text>

  <text x="${width / 2}" y="445"
        font-family="Arial, sans-serif"
        font-size="20"
        fill="#6b6360"
        text-anchor="middle">from India and Nepal, 1980-1981</text>
</svg>
`;

// Ensure output directory exists
const outputDir = "./src/images";
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate PNG from SVG
const outputPath = path.join(outputDir, "og-image.png");

sharp(Buffer.from(svg))
  .png()
  .toFile(outputPath)
  .then(() => {
    console.log(`✓ OG image generated: ${outputPath}`);
  })
  .catch((err) => {
    console.error("Error generating OG image:", err);
    process.exit(1);
  });
