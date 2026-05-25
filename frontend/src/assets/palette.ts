/**
 * Carica la palette Lospec Oil-6 e fornisce helper per ricolorare.
 * Se il file JSON non esiste, usa una palette fallback.
 */

interface Palette {
  name: string;
  colors: string[];
}

let cachedPalette: Palette | null = null;

export async function loadPalette(): Promise<Palette> {
  if (cachedPalette) return cachedPalette as Palette;

  try {
    const res = await fetch("/assets/palettes/oil-6.json");
    cachedPalette = await res.json();
  } catch {
    cachedPalette = {
      name: "oil-6-fallback",
      colors: ["#fbf5ef", "#f2d3ab", "#c69fa5", "#8b6d9c", "#494b6e", "#1d2b53"],
    };
  }
  return cachedPalette!;
}

export function getColors(): string[] {
  if (cachedPalette) return cachedPalette.colors;
  return ["#fbf5ef", "#f2d3ab", "#c69fa5", "#8b6d9c", "#494b6e", "#1d2b53"];
}

export function recolor(textureKey: string): string {
  // Placeholder: in futuro applicherà una remappatura dei colori
  // ai texture Phaser per unificare lo stile visivo.
  return textureKey;
}
