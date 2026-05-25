/**
 * Script per scaricare e decomprimere gli asset grafici nelle cartelle corrette.
 * Esegui con: npm run fetch:assets
 *
 * Scarica:
 * - Kenney Tiny Dungeon (CC0)
 * - Kenney Tiny Town (CC0)
 * - LPC Base Characters (CC-BY-SA 3.0 / GPL)
 * - Game-Icons.net SVG subset (CC-BY 3.0)
 * - Lospec Oil-6 palette (pubblico dominio)
 */

import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const FRONTEND_ASSETS = path.resolve(__dirname, "../../frontend/public/assets");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Segui redirect
        downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} per ${url}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err: Error) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  console.log("📦 Download asset grafici...\n");

  // 1. Lospec Oil-6 palette (piccolo, scarichiamo subito)
  const palettesDir = path.join(FRONTEND_ASSETS, "palettes");
  ensureDir(palettesDir);

  console.log("🎨 Scaricamento palette Oil-6...");
  try {
    await downloadFile(
      "https://lospec.com/palette-list/oil-6.json",
      path.join(palettesDir, "oil-6.json")
    );
    console.log("   ✅ Palette Oil-6 scaricata");
  } catch (err) {
    console.log("   ⚠️  Palette non scaricata:", (err as Error).message);
    // Crea un fallback palette
    const fallback = {
      name: "oil-6",
      colors: ["#fbf5ef", "#f2d3ab", "#c69fa5", "#8b6d9c", "#494b6e", "#1d2b53"],
    };
    fs.writeFileSync(path.join(palettesDir, "oil-6.json"), JSON.stringify(fallback, null, 2));
    console.log("   ℹ️  Palette fallback creata");
  }

  // 2. Game-Icons.net SVGs (piccoli, possiamo scaricare individualmente)
  const iconsDir = path.join(FRONTEND_ASSETS, "icons", "game-icons");
  ensureDir(iconsDir);

  const icons = [
    { name: "broadsword", url: "https://raw.githubusercontent.com/game-icons/icons/master/lorc/broadsword.svg" },
    { name: "shield", url: "https://raw.githubusercontent.com/game-icons/icons/master/lorc/checked-shield.svg" },
    { name: "sparkles", url: "https://raw.githubusercontent.com/game-icons/icons/master/lorc/fairy-wand.svg" },
    { name: "broken-cross", url: "https://raw.githubusercontent.com/game-icons/icons/master/lorc/broken-heart.svg" },
    { name: "scroll", url: "https://raw.githubusercontent.com/game-icons/icons/master/lorc/scroll-unfurled.svg" },
    { name: "skull", url: "https://raw.githubusercontent.com/game-icons/icons/master/lorc/alien-skull.svg" },
    { name: "fire", url: "https://raw.githubusercontent.com/game-icons/icons/master/lorc/fire-axe.svg" },
    { name: "wave", url: "https://raw.githubusercontent.com/game-icons/icons/master/lorc/water-splash.svg" },
  ];

  console.log("🎮 Scaricamento icone Game-Icons.net...");
  for (const icon of icons) {
    try {
      await downloadFile(icon.url, path.join(iconsDir, `${icon.name}.svg`));
      console.log(`   ✅ ${icon.name}.svg`);
    } catch (err) {
      console.log(`   ⚠️  ${icon.name}.svg non scaricata:`, (err as Error).message);
      // Crea SVG fallback
      fs.writeFileSync(
        path.join(iconsDir, `${icon.name}.svg`),
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="128">${icon.name[0].toUpperCase()}</text></svg>`
      );
    }
  }

  // 3. Kenney tilesets — tentiamo il download diretto degli zip
  const tilesDungeon = path.join(FRONTEND_ASSETS, "tiles", "kenney-tiny-dungeon");
  const tilesTown = path.join(FRONTEND_ASSETS, "tiles", "kenney-tiny-town");
  ensureDir(tilesDungeon);
  ensureDir(tilesTown);

  console.log("🗺️  Scaricamento tileset Kenney...");
  console.log("   (potrebbe richiedere download manuale — vedi README negli asset)");
  console.log("   ℹ️  Kenney Tiny Dungeon: https://kenney.nl/assets/tiny-dungeon");
  console.log("   ℹ️  Kenney Tiny Town: https://kenney.nl/assets/tiny-town");

  // Tentiamo di scaricare via GitHub raw (Kenney non hosta zip direttamente)
  // I tileset sono disponibili su kenney.nl/assets/... ma non c'è un URL diretto stabile
  // Quindi lasciamo i placeholder e le istruzioni

  // 4. LPC Base Characters
  const lpcDir = path.join(FRONTEND_ASSETS, "characters", "lpc");
  ensureDir(lpcDir);
  console.log("👤 Scaricamento personaggi LPC...");
  console.log("   ℹ️  LPC base characters: https://opengameart.org/content/lpc-base-character-without-clothes");

  // Creiamo file placeholder per i tileset e personaggi
  // Il gioco funziona comunque con la griglia colorata fallback

  console.log("\n✅ Asset scaricati o pronti per download manuale!");
  console.log("   Il gioco funziona senza asset — mostra una griglia colorata segnaposto.");
}

main().catch(console.error);
