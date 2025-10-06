import sharp from "sharp";
import fs from "fs";

async function generateFavicons() {
  const svgBuffer = fs.readFileSync("./public/favicon.svg");

  // Generate 32x32 PNG
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile("./public/favicon-32x32.png");

  // Generate 16x16 PNG
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile("./public/favicon-16x16.png");

  console.log("Favicon PNG files generated successfully!");
}

generateFavicons().catch(console.error);
