import { useState, useRef, useEffect } from "react";

interface Tile { col: number; row: number; key: string; }

const CHUNK_W = 36, CHUNK_H = 18;
const CHUNKS_X = 6, CHUNKS_Y = 6;
const MW = 216, MH = 108;

const ZONES: { key: string; name: string; x: number; y: number; w: number; h: number; floorKey: string; color: string }[] = [
  { key: "Abbey", name: "Abbazia", x: 70, y: 0, w: 76, h: 14, floorKey: "dung_0000", color: "#8a7a9a" },
  { key: "VillageA", name: "Villaggio del Nord", x: 0, y: 14, w: 55, h: 41, floorKey: "town_0000", color: "#4a7c59" },
  { key: "VillageB", name: "Villaggio del Sud", x: 161, y: 14, w: 55, h: 41, floorKey: "town_0000", color: "#5a6b8a" },
  { key: "NoMansLand", name: "Terra di Nessuno", x: 55, y: 14, w: 106, h: 41, floorKey: "town_0012", color: "#6b5b3a" },
  { key: "Forest", name: "Foresta", x: 0, y: 55, w: 100, h: 25, floorKey: "town_0002", color: "#2d5a27" },
  { key: "Lake", name: "Lago", x: 100, y: 55, w: 30, h: 25, floorKey: "rpg_0198", color: "#4a8a9a" },
  { key: "Coast", name: "Costa Marina", x: 130, y: 55, w: 86, h: 25, floorKey: "rpg_0198", color: "#3a6b8a" },
  { key: "DeepForest", name: "Foresta Profonda", x: 0, y: 80, w: 100, h: 28, floorKey: "town_0002", color: "#1d3a17" },
  { key: "Mountains", name: "Montagne", x: 100, y: 80, w: 80, h: 28, floorKey: "dung_0000", color: "#5a4a3a" },
];

const QUEST_BUILDINGS: { col: number; row: number; w: number; h: number; name: string; quest: boolean; rest: boolean }[] = [
  { col: 9, row: 20, w: 3, h: 3, name: "Castello Nord", quest: true, rest: false },
  { col: 5, row: 17, w: 2, h: 2, name: "Caserma", quest: false, rest: true },
  { col: 15, row: 21, w: 2, h: 1, name: "Taverna", quest: false, rest: false },
  { col: 6, row: 15, w: 2, h: 1, name: "Fucina", quest: false, rest: false },
  { col: 15, row: 17, w: 2, h: 2, name: "Capanna Foresta", quest: true, rest: false },
  { col: 8, row: 24, w: 2, h: 2, name: "Fattoria Nord", quest: true, rest: false },
  { col: 65, row: 6, w: 3, h: 2, name: "Abbazia", quest: false, rest: true },
  { col: 168, row: 21, w: 3, h: 3, name: "Palazzo Sud", quest: true, rest: false },
  { col: 161, row: 18, w: 2, h: 2, name: "Tempio", quest: true, rest: true },
  { col: 193, row: 28, w: 3, h: 2, name: "Porto Comm.le", quest: true, rest: false },
  { col: 196, row: 23, w: 2, h: 2, name: "Miniera", quest: true, rest: false },
  { col: 162, row: 26, w: 2, h: 1, name: "Bottega Pesce", quest: false, rest: false },
  { col: 164, row: 27, w: 2, h: 2, name: "Fattoria Sud", quest: true, rest: false },
  { col: 193, row: 62, w: 3, h: 1, name: "Molo del Porto", quest: false, rest: false },
  { col: 125, row: 56, w: 2, h: 1, name: "Capanna Lago", quest: false, rest: false },
  { col: 106, row: 84, w: 2, h: 2, name: "Rovine", quest: false, rest: false },
  { col: 140, row: 87, w: 2, h: 1, name: "Miniera Montagna", quest: false, rest: false },
];

const TREE_POSITIONS: { x: number; y: number; key: string }[] = [
  { x: 1, y: 23, key: "town_0003" }, { x: 3, y: 24, key: "town_0004" }, { x: 5, y: 22, key: "town_0003" }, { x: 8, y: 25, key: "town_0004" },
  { x: 10, y: 23, key: "town_0003" }, { x: 12, y: 26, key: "town_0004" }, { x: 15, y: 24, key: "town_0003" }, { x: 18, y: 22, key: "town_0004" },
  { x: 20, y: 27, key: "town_0003" }, { x: 2, y: 28, key: "town_0004" }, { x: 6, y: 29, key: "town_0003" }, { x: 9, y: 27, key: "town_0004" },
  { x: 13, y: 30, key: "town_0003" }, { x: 16, y: 28, key: "town_0004" }, { x: 21, y: 25, key: "town_0003" }, { x: 25, y: 23, key: "town_0004" },
  { x: 28, y: 26, key: "town_0003" }, { x: 31, y: 24, key: "town_0004" }, { x: 34, y: 22, key: "town_0003" }, { x: 26, y: 28, key: "town_0004" },
  { x: 4, y: 31, key: "town_0003" }, { x: 11, y: 32, key: "town_0004" }, { x: 17, y: 30, key: "town_0003" }, { x: 23, y: 29, key: "town_0004" },
  { x: 30, y: 27, key: "town_0003" }, { x: 33, y: 25, key: "town_0004" }, { x: 7, y: 34, key: "town_0003" }, { x: 19, y: 33, key: "town_0004" },
  { x: 24, y: 31, key: "town_0003" }, { x: 29, y: 32, key: "town_0004" },
];

const BUSH_POSITIONS: { x: number; y: number }[] = [
  { x: 1, y: 7 }, { x: 5, y: 8 }, { x: 10, y: 7 }, { x: 14, y: 9 }, { x: 20, y: 8 },
  { x: 52, y: 8 }, { x: 58, y: 9 }, { x: 65, y: 7 }, { x: 70, y: 10 },
  { x: 3, y: 23 }, { x: 7, y: 25 }, { x: 14, y: 22 }, { x: 22, y: 24 },
  { x: 27, y: 23 }, { x: 32, y: 25 }, { x: 16, y: 10 }, { x: 60, y: 12 },
  { x: 55, y: 15 }, { x: 8, y: 14 }, { x: 68, y: 14 },
];

const BUILDING_TILES: { col: number; row: number; w: number; h: number; tileKey: string }[] = [
  { col: 9, row: 20, w: 3, h: 3, tileKey: "town_0052" }, { col: 5, row: 17, w: 2, h: 2, tileKey: "dung_0040" },
  { col: 15, row: 21, w: 2, h: 1, tileKey: "town_0048" }, { col: 6, row: 15, w: 2, h: 1, tileKey: "town_0048" },
  { col: 15, row: 17, w: 2, h: 2, tileKey: "town_0048" }, { col: 8, row: 24, w: 2, h: 2, tileKey: "town_0048" },
  { col: 65, row: 6, w: 3, h: 2, tileKey: "dung_0040" },
  { col: 168, row: 21, w: 3, h: 3, tileKey: "town_0052" }, { col: 161, row: 18, w: 2, h: 2, tileKey: "dung_0019" },
  { col: 193, row: 28, w: 3, h: 2, tileKey: "dung_0040" }, { col: 196, row: 23, w: 2, h: 2, tileKey: "dung_0040" },
  { col: 162, row: 26, w: 2, h: 1, tileKey: "town_0048" }, { col: 164, row: 27, w: 2, h: 2, tileKey: "town_0048" },
  { col: 193, row: 62, w: 3, h: 1, tileKey: "dung_0040" }, { col: 125, row: 56, w: 2, h: 1, tileKey: "town_0048" },
  { col: 106, row: 84, w: 2, h: 2, tileKey: "dung_0040" }, { col: 140, row: 87, w: 2, h: 1, tileKey: "dung_0040" },
];

function isWallTile(col: number, row: number): boolean {
  if (col === 55 && row >= 14 && row <= 54) return row !== 34 && row !== 35;
  if (col === 161 && row >= 14 && row <= 54) return row !== 34 && row !== 35;
  if (row === 14 && col >= 0 && col <= 54) return true;
  if (row === 55 && col >= 0 && col <= 54) return true;
  if (row === 14 && col >= 161 && col <= 215) return true;
  if (row === 55 && col >= 161 && col <= 215) return true;
  return false;
}

function getZoneFloor(col: number, row: number): string {
  for (const z of ZONES) if (col >= z.x && col < z.x + z.w && row >= z.y && row < z.y + z.h) return z.floorKey;
  return "town_0000";
}

function isWaterTile(col: number, row: number): boolean {
  const waters = [
    { x: 8, y: 30, w: 4, h: 3 }, { x: 14, y: 36, w: 2, h: 2 },
    { x: 175, y: 30, w: 4, h: 4 }, { x: 195, y: 34, w: 3, h: 2 },
  ];
  for (const w of waters) if (col >= w.x && col < w.x + w.w && row >= w.y && row < w.y + w.h) return true;
  return false;
}

function getFullTileKey(col: number, row: number, customMap: Map<string, string>): string {
  const c = customMap.get(`${col},${row}`);
  if (c) return c;

  for (const b of BUILDING_TILES) if (col >= b.col && col < b.col + b.w && row >= b.row && row < b.row + b.h) return b.tileKey;
  if (isWallTile(col, row)) return "dung_0040";
  if (isWaterTile(col, row)) return "rpg_0198";

  for (const t of TREE_POSITIONS) if (t.x === col && t.y === row) return t.key;
  for (const b of BUSH_POSITIONS) if (b.x === col && b.y === row) return "town_0005";

  return getZoneFloor(col, row);
}

const ALL_TILES: { key: string; src: string; label: string }[] = (() => {
  const t: { key: string; src: string; label: string }[] = [];
  for (let i = 0; i <= 131; i++) { const n = String(i).padStart(4, "0"); t.push({ key: `town_${n}`, src: `/assets/tiles/kenney-tiny-town/tile_${n}.png`, label: `T${i}` }); }
  for (let i = 0; i <= 131; i++) { const n = String(i).padStart(4, "0"); t.push({ key: `dung_${n}`, src: `/assets/tiles/kenney-tiny-dungeon/tile_${n}.png`, label: `D${i}` }); }
  t.push({ key: "rpg_0198", src: "/assets/tiles/kenney-rpg-urban/tile_0198.png", label: "Acqua" });
  for (let i = 200; i <= 204; i++) t.push({ key: `rpg_0${i}`, src: `/assets/tiles/kenney-rpg-urban/tile_0${i}.png`, label: `W${i}` });
  for (let i = 224; i <= 231; i++) t.push({ key: `rpg_0${i}`, src: `/assets/tiles/kenney-rpg-urban/tile_0${i}.png`, label: `W${i}` });
  return t;
})();

interface Props { tiles: Tile[]; onSave: (tiles: Tile[]) => void; onClose: () => void; npcPositions?: { label: string; x: number; y: number; hasQuest?: boolean; hasShop?: boolean }[]; onSaveNpc?: (positions: { label: string; x: number; y: number }[]) => void; }

export default function WorldEditor({ tiles, onSave, onClose, npcPositions, onSaveNpc }: Props) {
  const [mode, setMode] = useState<"overview" | "section" | "zone">("overview");
  const [section, setSection] = useState({ cx: 0, cy: 0 });
  const [activeZone, setActiveZone] = useState("");
  const [editTiles, setEditTiles] = useState<Tile[]>(tiles);
  const [selectedTile, setSelectedTile] = useState(ALL_TILES[0]?.key || "");
  const [zoom, setZoom] = useState(1);
  const [versions, setVersions] = useState<{ time: string; desc: string; tiles: Tile[] }[]>([{ time: new Date().toLocaleTimeString(), desc: "Apertura", tiles: [...tiles] }]);
  const [editNpc, setEditNpc] = useState(npcPositions || []);
  const [draggingNpc, setDraggingNpc] = useState<string | null>(null);
  const zoneScrollRef = useRef<HTMLDivElement>(null);

  const addVersion = (desc: string, t: Tile[]) => setVersions(v => [...v, { time: new Date().toLocaleTimeString(), desc, tiles: [...t] }]);

  const tileMap = new Map<string, string>();
  for (const t of editTiles) tileMap.set(`${t.col},${t.row}`, t.key);

  const getTileKey = (col: number, row: number): string => getFullTileKey(col, row, tileMap);

  const getTileSrc = (col: number, row: number): string => {
    const t = ALL_TILES.find(at => at.key === getTileKey(col, row));
    return t?.src || ALL_TILES[0].src;
  };

  const handleTileClick = (globalCol: number, globalRow: number) => {
    if (selectedTile === "__eraser") {
      setEditTiles(prev => prev.filter(t => !(t.col === globalCol && t.row === globalRow)));
    } else {
      setEditTiles(prev => {
        const f = prev.filter(t => !(t.col === globalCol && t.row === globalRow));
        return [...f, { col: globalCol, row: globalRow, key: selectedTile }];
      });
    }
  };

  const getBuildingBorder = (col: number, row: number): string => {
    for (const b of QUEST_BUILDINGS) {
      if (col >= b.col && col < b.col + b.w && row >= b.row && row < b.row + b.h) {
        if (b.quest) return "1px solid #c9a44b";
        if (b.rest) return "1px solid #44aaff";
        return "1px solid #666";
      }
    }
    return "none";
  };

  const getBuildingTitle = (col: number, row: number): string => {
    for (const b of QUEST_BUILDINGS) if (col >= b.col && col < b.col + b.w && row >= b.row && row < b.row + b.h) return b.name;
    return "";
  };

  const renderTileGrid = (startCol: number, startRow: number, cols: number, rows: number) => {
    const grid: { col: number; row: number }[][] = [];
    for (let r = 0; r < rows; r++) {
      const rowTiles: { col: number; row: number }[] = [];
      for (let c = 0; c < cols; c++) rowTiles.push({ col: startCol + c, row: startRow + r });
      grid.push(rowTiles);
    }
    return (
      <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${32 * zoom}px)`, gap: 0, lineHeight: 0, background: "#000" }}>
        {grid.map((row, ri) =>
          row.map((tile) => (
            <img key={`${ri}-${tile.col}-${tile.row}`}
              src={getTileSrc(tile.col, tile.row)}
              onClick={() => handleTileClick(tile.col, tile.row)}
              title={getBuildingTitle(tile.col, tile.row)}
              style={{
                width: 32 * zoom, height: 32 * zoom, imageRendering: "pixelated",
                cursor: "crosshair", display: "block",
                outline: tileMap.has(`${tile.col},${tile.row}`) ? "1px solid rgba(255,220,0,0.6)" : getBuildingBorder(tile.col, tile.row),
                boxSizing: "border-box",
              }}
              alt=""
            />
          ))
        )}
      </div>
      {editNpc.map(n => {
        const lc = n.x / 32, lr = n.y / 32;
        if (lc < startCol || lc >= startCol + cols || lr < startRow || lr >= startRow + rows) return null;
        const color = n.hasShop ? "#ffcc00" : n.hasQuest ? "#44cc44" : "#4488ff";
        return (
          <div key={n.label}
            onMouseDown={e => { e.preventDefault(); setDraggingNpc(n.label); }}
            style={{
              position: "absolute", left: (lc - startCol) * 32 * zoom - 8, top: (lr - startRow) * 32 * zoom - 8,
              width: 16, height: 16, background: color, border: "2px solid #fff", borderRadius: "50%",
              cursor: "grab", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <span style={{ fontSize: 6, color: "#fff", pointerEvents: "none", marginTop: 16 }}>{n.label.substring(0,4)}</span>
          </div>
        );
      })}
      </div>
    );
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) { e.preventDefault(); setZoom(z => Math.max(0.25, Math.min(4, z + (e.deltaY < 0 ? 0.25 : -0.25)))); }
  };

  useEffect(() => {
    if (!draggingNpc) return;
    const onMove = (e: MouseEvent) => {
      const container = zoneScrollRef.current || document.body;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + container.scrollLeft;
      const y = e.clientY - rect.top + container.scrollTop;
      setEditNpc(prev => prev.map(n => n.label === draggingNpc ? { ...n, x: Math.round(x), y: Math.round(y) } : n));
    };
    const onUp = () => setDraggingNpc(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [draggingNpc]);

  if (mode === "section") {
    const startCol = section.cx * CHUNK_W, startRow = section.cy * CHUNK_H;
    return (
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
        <div style={{ background: "#0f0f1a", border: "2px solid #c9a44b", padding: 8, width: "100vw", height: "100vh", display: "flex", flexDirection: "column", gap: 6 }} onClick={e => e.stopPropagation()}>
        {/* Toolbar */}
        <div className="editor-toolbar">
          <button onClick={() => setMode("overview")} style={{ fontSize: 7, marginRight: 8 }}>◀ TORNA</button>
          <span style={{ color: "#c9a44b", fontSize: 8 }}>Sezione ({section.cx},{section.cy}) — {editTiles.length} tile</span>
          <div style={{ flex: 1 }} />
          <button style={{ fontSize: 7 }} onClick={() => { addVersion("Salvato", editTiles); onSave(editTiles); if (onSaveNpc) onSaveNpc(editNpc); }}>💾 SALVA</button>
          <button className="danger" style={{ fontSize: 7, marginLeft: 4 }} onClick={() => { if (versions.length > 0) setEditTiles(versions[versions.length - 1].tiles); }}>↩ RIPRISTINA</button>
        </div>
          <div style={{ display: "flex", gap: 6, flex: 1, overflow: "hidden" }}>
            <div style={{ flex: 1, overflow: "auto", background: "#060610", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 16 }}>
              {renderTileGrid(startCol, startRow, CHUNK_W, CHUNK_H)}
            </div>
            <Sidebar versions={versions} editTiles={editTiles} setEditTiles={setEditTiles} onClose={onClose} />
          </div>
          <div className="editor-palette-bar">
            <div onClick={() => setSelectedTile("__eraser")}
              style={{ border: selectedTile === "__eraser" ? "2px solid #ff3333" : "1px solid #333", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "#331111", cursor: "pointer", flexShrink: 0 }}>
              <span style={{ fontSize: 16 }}>🧹</span>
            </div>
            {ALL_TILES.map(t => (
              <div key={t.key} onClick={() => setSelectedTile(t.key)}
                style={{ border: selectedTile === t.key ? "2px solid #c9a44b" : "1px solid #333", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e", cursor: "pointer", flexShrink: 0 }}>
                <img src={t.src} alt="" style={{ width: 32, height: 32, imageRendering: "pixelated" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "zone") {
    const zone = ZONES.find(z => z.key === activeZone)!;
    return (
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
        <div style={{ background: "#0f0f1a", border: "2px solid #c9a44b", padding: 8, width: "100vw", height: "100vh", display: "flex", flexDirection: "column", gap: 6 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button onClick={() => setMode("overview")} style={{ fontSize: 7 }}>◀ TORNA</button>
            <span style={{ color: "#c9a44b", fontSize: 8 }}>{zone.name} ({zone.w}×{zone.h}) — {editTiles.length} tile custom</span>
            <span style={{ color: "#aaa", fontSize: 6 }}>Zoom: {Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} style={{ fontSize: 7, width: 24, height: 24, padding: 0 }}>−</button>
            <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} style={{ fontSize: 7, width: 24, height: 24, padding: 0 }}>+</button>
            <button onClick={() => setZoom(1)} style={{ fontSize: 7, width: 24, height: 24, padding: 0 }}>0</button>
            <div style={{ flex: 1 }} />
            <button onClick={() => { addVersion("Salvato", editTiles); onSave(editTiles); }} style={{ fontSize: 7 }}>💾 SALVA</button>
            <button className="danger" style={{ fontSize: 7 }} onClick={() => { if (versions.length > 0) setEditTiles(versions[versions.length - 1].tiles); }}>↩ RIPRISTINA</button>
          </div>
          <div style={{ display: "flex", gap: 6, flex: 1, overflow: "hidden" }}>
            <div ref={zoneScrollRef} onWheel={handleWheel} style={{ flex: 1, overflow: "auto", background: "#060610", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 16 }}>
              {renderTileGrid(zone.x, zone.y, zone.w, zone.h)}
            </div>
            <Sidebar versions={versions} editTiles={editTiles} setEditTiles={setEditTiles} onClose={onClose} />
          </div>
          <div className="editor-palette-bar">
            <div onClick={() => setSelectedTile("__eraser")}
              style={{ border: selectedTile === "__eraser" ? "2px solid #ff3333" : "1px solid #333", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "#331111", cursor: "pointer", flexShrink: 0 }}>
              <span style={{ fontSize: 16 }}>🧹</span>
            </div>
            {ALL_TILES.map(t => (
              <div key={t.key} onClick={() => setSelectedTile(t.key)}
                style={{ border: selectedTile === t.key ? "2px solid #c9a44b" : "1px solid #333", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e", cursor: "pointer", flexShrink: 0 }}>
                <img src={t.src} alt="" style={{ width: 32, height: 32, imageRendering: "pixelated" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
      <div style={{ background: "#0f0f1a", border: "2px solid #c9a44b", padding: 12, width: "85vw", maxHeight: "90vh", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h2 style={{ color: "#c9a44b", fontSize: 12, margin: 0, flex: 1 }}>EDITOR MAPPA</h2>
          <span style={{ color: "#888", fontSize: 7 }}>{editTiles.length} tile custom</span>
          <button style={{ fontSize: 7 }} onClick={() => { addVersion("Salvato", editTiles); onSave(editTiles); if (onSaveNpc) onSaveNpc(editNpc); }}>💾 SALVA</button>
          <button style={{ fontSize: 7 }} onClick={onClose}>CHIUDI</button>
        </div>

        <div style={{ color: "#c9a44b", fontSize: 8, marginBottom: 2 }}>ZONE (clicca per modificare l'intera zona)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          {ZONES.map(z => (
            <div key={z.key} onClick={() => { setActiveZone(z.key); setMode("zone"); }}
              style={{ background: z.color, cursor: "pointer", border: "2px solid #555", padding: "8px 12px", fontSize: 7, color: "#fff", textShadow: "1px 1px 2px #000", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{z.name}</span>
              <span style={{ fontSize: 5, color: "#ddd" }}>{z.w}×{z.h}</span>
            </div>
          ))}
        </div>

        <div style={{ color: "#aaa", fontSize: 8, marginBottom: 2 }}>SEZIONI (clicca per editing 36×18)</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${CHUNKS_X}, 1fr)`, gap: 2 }}>
          {Array.from({ length: CHUNKS_X * CHUNKS_Y }, (_, i) => {
            const cx = i % CHUNKS_X, cy = Math.floor(i / CHUNKS_X);
            const startCol = cx * CHUNK_W, startRow = cy * CHUNK_H;
            const customCount = editTiles.filter(t => t.col >= startCol && t.col < startCol + CHUNK_W && t.row >= startRow && t.row < startRow + CHUNK_H).length;
            const middle = ZONES.find(z => startCol + CHUNK_W / 2 >= z.x && startCol + CHUNK_W / 2 < z.x + z.w && startRow + CHUNK_H / 2 >= z.y && startRow + CHUNK_H / 2 < z.y + z.h);
            return (
              <div key={i} onClick={() => { setSection({ cx, cy }); setMode("section"); }}
                style={{ background: middle?.color || "#333", cursor: "pointer", border: "2px solid #555", padding: "6px 4px", fontSize: 7, color: "#fff", textAlign: "center", textShadow: "1px 1px 2px #000" }}>
                ({cx},{cy})<br />
                {customCount > 0 && <span style={{ fontSize: 5, color: "#ffcc00" }}>{customCount} tile</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ versions, editTiles, setEditTiles, onClose }: { versions: { time: string; desc: string; tiles: Tile[] }[]; editTiles: Tile[]; setEditTiles: (t: Tile[]) => void; onClose: () => void }) {
  return (
    <div style={{ width: 130, background: "#111", border: "1px solid #333", padding: 4, fontSize: 6, display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
      <div style={{ color: "#c9a44b", textAlign: "center" }}>VERSIONI ({versions.length})</div>
      <div style={{ maxHeight: 250, overflowY: "auto", fontSize: 5 }}>
        {[...versions].reverse().map((v, i) => (
          <div key={i} style={{ color: "#aaa", padding: "2px 3px", cursor: "pointer", borderBottom: "1px solid #222" }}
            onClick={() => setEditTiles(v.tiles)}>
            <span>{v.time}</span> <span style={{ color: "#888" }}>{v.desc}</span>
          </div>
        ))}
      </div>
      <div style={{ color: "#888", fontSize: 5, marginTop: 4 }}>{editTiles.length} tile</div>
      <button style={{ fontSize: 6, marginTop: 4 }} onClick={onClose}>CHIUDI</button>
    </div>
  );
}
