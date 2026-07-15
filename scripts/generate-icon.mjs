// Wandelt app-icon.svg in ein 1024x1024-PNG um (Quelle für `tauri icon`).
// Aufruf aus dem Projektordner: node scripts/generate-icon.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("app-icon.svg");

await sharp(svg, { density: 384 })
  .resize(1024, 1024)
  .png()
  .toFile("app-icon.png");

console.log("app-icon.png erzeugt.");
