/**
 * Genera URL per avatar DiceBear pixel-art.
 * Usato come fallback quando l'utente non ha caricato un volto.
 * Funziona offline senza richieste (il browser carica l'SVG quando online).
 */
export function dicebearUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;
}
