import { useRef, useEffect, useState } from "react";
import { useAuthStore } from "../auth/store";

const MAP_W = 6912;
const MAP_H = 3456;
const CANVAS_W = 140;
const CANVAS_H = 100;

interface WorldItem {
  id: number; posX: number; posY: number;
}

export default function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedCharacter } = useAuthStore();
  const [playerPos, setPlayerPos] = useState({ x: 400, y: 300 });
  const [worldItems, setWorldItems] = useState<WorldItem[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const pos = (window as any).__playerPos;
      if (pos) setPlayerPos({ x: pos.x, y: pos.y });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onItemSpawn = (e: Event) => {
      const d = (e as CustomEvent).detail as WorldItem;
      setWorldItems(prev => {
        const filtered = prev.filter(i => i.id !== d.id);
        return [...filtered, d];
      });
    };
    const onItemCollected = (e: Event) => {
      const d = (e as CustomEvent).detail as { itemId: number };
      setWorldItems(prev => prev.filter(i => i.id !== d.itemId));
    };
    window.addEventListener("minimap:item-spawned", onItemSpawn);
    window.addEventListener("minimap:item-collected", onItemCollected);
    return () => {
      window.removeEventListener("minimap:item-spawned", onItemSpawn);
      window.removeEventListener("minimap:item-collected", onItemCollected);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const scaleX = (x: number) => (x / MAP_W) * CANVAS_W;
    const scaleY = (y: number) => (y / MAP_H) * CANVAS_H;

    const zones = [
      { name: "Abbey", x: 2240, y: 0, w: 2432, h: 448, color: "#8a7a9a" },
      { name: "VillageA", x: 0, y: 448, w: 1760, h: 1312, color: "#4a7c59" },
      { name: "VillageB", x: 5152, y: 448, w: 1760, h: 1312, color: "#5a6b8a" },
      { name: "NoMansLand", x: 1760, y: 448, w: 3392, h: 1312, color: "#6b5b3a" },
      { name: "Forest", x: 0, y: 1760, w: 3200, h: 800, color: "#2d5a27" },
      { name: "Lake", x: 3200, y: 1760, w: 960, h: 800, color: "#3a6b8a" },
      { name: "Coast", x: 4160, y: 1760, w: 2752, h: 800, color: "#3a6b8a" },
      { name: "DeepForest", x: 0, y: 2560, w: 3200, h: 896, color: "#1d3a17" },
      { name: "Mountains", x: 3200, y: 2560, w: 2560, h: 896, color: "#5a4a3a" },
    ];

    for (const z of zones) {
      ctx.fillStyle = z.color;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(scaleX(z.x), scaleY(z.y), scaleX(z.w), scaleY(z.h));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(scaleX(z.x), scaleY(z.y), scaleX(z.w), scaleY(z.h));
    }

    ctx.fillStyle = "#666666";
    ctx.fillRect(scaleX(1760), scaleY(448), 2, scaleY(1312));
    ctx.fillRect(scaleX(5152), scaleY(448), 2, scaleY(1312));

    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(scaleX(playerPos.x), scaleY(playerPos.y), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    if (selectedCharacter) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "4px 'Press Start 2P'";
      ctx.fillText(selectedCharacter.name.substring(0, 6), scaleX(playerPos.x) + 4, scaleY(playerPos.y) - 2);
    }

    for (const item of worldItems) {
      ctx.fillStyle = "#ff6600";
      ctx.beginPath();
      ctx.arc(scaleX(item.posX), scaleY(item.posY), 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ff0";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }, [playerPos, worldItems, selectedCharacter]);

  return (
    <div className="hud-panel" style={{ padding: 4 }}>
      <canvas ref={canvasRef} className="mini-map" style={{ display: "block", width: 140, height: 100 }} />
    </div>
  );
}
