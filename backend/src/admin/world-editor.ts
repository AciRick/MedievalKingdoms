import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAdmin } from "../auth/middleware";
import { logAction } from "../utils/action-log";
import { io } from "../sockets";

const router = Router();
router.use(requireAdmin);

const defaultZones = [
  { zone: "VillageA", name: "Villaggio del Nord", x: 0, y: 6, w: 15, h: 15, floor: "town_grass", description: "Villaggio settentrionale tra le colline" },
  { zone: "VillageB", name: "Villaggio del Sud", x: 40, y: 6, w: 20, h: 15, floor: "town_grass", description: "Villaggio meridionale sulla costa" },
  { zone: "NoMansLand", name: "Terra di Nessuno", x: 15, y: 6, w: 25, h: 15, floor: "town_dirt", description: "Pericolosa terra di confine" },
  { zone: "Abbey", name: "Abbazia", x: 18, y: 0, w: 15, h: 6, floor: "dungeon_stone", description: "Sacro luogo di culto" },
  { zone: "Forest", name: "Foresta Oscura", x: 0, y: 21, w: 25, h: 9, floor: "town_grass3", description: "Foresta fitta e misteriosa" },
  { zone: "Coast", name: "Costa Marina", x: 25, y: 21, w: 35, h: 9, floor: "town_water", description: "Costa rocciosa con antiche rovine" },
];

async function getZones(): Promise<any[]> {
  const row = await prisma.worldSetting.findUnique({ where: { key: "zones" } });
  if (!row) return defaultZones;
  try {
    return JSON.parse(row.value);
  } catch {
    return defaultZones;
  }
}

async function ensureDefaults(): Promise<void> {
  const zonesRow = await prisma.worldSetting.findUnique({ where: { key: "zones" } });
  if (!zonesRow) {
    await prisma.worldSetting.create({ data: { key: "zones", value: JSON.stringify(defaultZones) } });
  }
  const magicRow = await prisma.worldSetting.findUnique({ where: { key: "magicEnabled" } });
  if (!magicRow) {
    await prisma.worldSetting.create({ data: { key: "magicEnabled", value: "false" } });
  }
}

void ensureDefaults();

// ─── NPC CRUD ────────────────────────────────────────────────────────────────

router.get("/npcs", async (_req: Request, res: Response): Promise<void> => {
  try {
    const npcs = await prisma.nPC.findMany({ orderBy: { id: "asc" } });
    res.json(npcs);
  } catch (err) {
    console.error("GET /admin/npcs error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

router.post("/npcs", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(50),
      role: z.string().min(1).max(50),
      posX: z.number(),
      posY: z.number(),
      zone: z.string(),
      behaviorType: z.enum(["idle", "wander", "guard", "merchant"]).default("idle"),
    });
    const body = schema.parse(req.body);
    const npc = await prisma.nPC.create({ data: body });
    await logAction("system", null, "npc_created", { npcId: npc.id, name: npc.name });
    io.emit("world:npc-updated", { action: "created", npc });
    res.json(npc);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("POST /admin/npcs error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

router.put("/npcs/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const schema = z.object({
      name: z.string().min(1).max(50).optional(),
      role: z.string().min(1).max(50).optional(),
      posX: z.number().optional(),
      posY: z.number().optional(),
      zone: z.string().optional(),
      behaviorType: z.enum(["idle", "wander", "guard", "merchant"]).optional(),
    });
    const body = schema.parse(req.body);
    const npc = await prisma.nPC.update({ where: { id }, data: body });
    await logAction("system", null, "npc_updated", { npcId: npc.id, name: npc.name });
    io.emit("world:npc-updated", { action: "updated", npc });
    res.json(npc);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("PUT /admin/npcs error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

router.delete("/npcs/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.nPC.delete({ where: { id } });
    await logAction("system", null, "npc_deleted", { npcId: id });
    io.emit("world:npc-updated", { action: "deleted", npcId: id });
    res.json({ message: "NPC eliminato" });
  } catch (err) {
    console.error("DELETE /admin/npcs error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── QUEST CRUD ──────────────────────────────────────────────────────────────

router.get("/quests", async (_req: Request, res: Response): Promise<void> => {
  try {
    const quests = await prisma.questTemplate.findMany({ orderBy: { id: "asc" } });
    res.json(quests);
  } catch (err) {
    console.error("GET /admin/quests error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

router.post("/quests", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      buildingName: z.string().min(1),
      resourceName: z.string().min(1),
      resourceLabel: z.string().min(1),
      targetAmount: z.number().int().min(1),
      gatherTime: z.number().int().min(1),
      gatherYield: z.number().int().min(1),
      goldReward: z.number().int().min(0),
      itemRewardName: z.string().min(1),
      itemRewardType: z.string().min(1),
      description: z.string().default(""),
    });
    const body = schema.parse(req.body);
    const quest = await prisma.questTemplate.create({ data: body });
    await logAction("system", null, "quest_created", { questId: quest.id, name: quest.buildingName });
    io.emit("world:quests-updated", { action: "created", quest });
    res.json(quest);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("POST /admin/quests error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

router.put("/quests/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const schema = z.object({
      buildingName: z.string().min(1).optional(),
      resourceName: z.string().min(1).optional(),
      resourceLabel: z.string().min(1).optional(),
      targetAmount: z.number().int().min(1).optional(),
      gatherTime: z.number().int().min(1).optional(),
      gatherYield: z.number().int().min(1).optional(),
      goldReward: z.number().int().min(0).optional(),
      itemRewardName: z.string().min(1).optional(),
      itemRewardType: z.string().min(1).optional(),
      description: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const quest = await prisma.questTemplate.update({ where: { id }, data: body });
    await logAction("system", null, "quest_updated", { questId: quest.id, name: quest.buildingName });
    io.emit("world:quests-updated", { action: "updated", quest });
    res.json(quest);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("PUT /admin/quests error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

router.delete("/quests/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.questTemplate.delete({ where: { id } });
    await logAction("system", null, "quest_deleted", { questId: id });
    io.emit("world:quests-updated", { action: "deleted", questId: id });
    res.json({ message: "Quest eliminata" });
  } catch (err) {
    console.error("DELETE /admin/quests error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── ZONE CRUD ───────────────────────────────────────────────────────────────

router.get("/zones", async (_req: Request, res: Response): Promise<void> => {
  try {
    const zones = await getZones();
    res.json(zones);
  } catch (err) {
    console.error("GET /admin/zones error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

router.put("/zones", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.array(z.object({
      zone: z.string().min(1),
      name: z.string().min(1),
      x: z.number().int().min(0),
      y: z.number().int().min(0),
      w: z.number().int().min(1),
      h: z.number().int().min(1),
      floor: z.string().min(1),
      description: z.string().default(""),
    }));
    const zones = schema.parse(req.body);
    await prisma.worldSetting.upsert({
      where: { key: "zones" },
      update: { value: JSON.stringify(zones) },
      create: { key: "zones", value: JSON.stringify(zones) },
    });
    await logAction("system", null, "zones_updated", { count: zones.length });
    io.emit("world:zones-updated", { zones });
    res.json({ message: "Zone aggiornate", zones });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("PUT /admin/zones error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── MAGIC ───────────────────────────────────────────────────────────────────

router.get("/magic", async (_req: Request, res: Response): Promise<void> => {
  try {
    const row = await prisma.worldSetting.findUnique({ where: { key: "magicEnabled" } });
    const enabled = row?.value === "true";
    const spells = [
      { id: 1, name: "Palla di Fuoco", description: "Lancia una sfera infuocata contro il nemico.", manaCost: 20 },
      { id: 2, name: "Cura", description: "Rigenera HP del bersaglio.", manaCost: 15 },
      { id: 3, name: "Teletrasporto", description: "Si teletrasporta in una zona adiacente.", manaCost: 40 },
      { id: 4, name: "Scudo Magico", description: "Riduce i danni subiti per 3 turni.", manaCost: 25 },
      { id: 5, name: "Fulmine", description: "Colpisce un nemico con una scarica elettrica.", manaCost: 30 },
    ];
    res.json({ enabled, spells: enabled ? spells : [] });
  } catch (err) {
    console.error("GET /admin/magic error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

router.put("/magic", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({ enabled: z.boolean() });
    const { enabled } = schema.parse(req.body);
    await prisma.worldSetting.upsert({
      where: { key: "magicEnabled" },
      update: { value: String(enabled) },
      create: { key: "magicEnabled", value: String(enabled) },
    });
    await logAction("system", null, enabled ? "magic_enabled" : "magic_disabled", {});
    io.emit("world:magic-updated", { enabled });
    res.json({ message: enabled ? "Magia attivata" : "Magia disattivata", enabled });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("PUT /admin/magic error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── CUSTOM TILES ────────────────────────────────────────────────────────────

router.get("/custom-tiles", async (_req: Request, res: Response): Promise<void> => {
  try {
    const row = await prisma.worldSetting.findUnique({ where: { key: "customTiles" } });
    res.json(row ? JSON.parse(row.value) : []);
  } catch (err) {
    res.status(500).json({ error: "Errore interno" });
  }
});

router.put("/custom-tiles", async (req: Request, res: Response): Promise<void> => {
  try {
    const tiles = req.body;
    const oldRow = await prisma.worldSetting.findUnique({ where: { key: "customTiles" } });
    if (oldRow && oldRow.value !== "[]") {
      const backupKey = `customTiles_backup_${Date.now()}`;
      await prisma.worldSetting.create({ data: { key: backupKey, value: oldRow.value } });
      const backups = await prisma.worldSetting.findMany({ where: { key: { startsWith: "customTiles_backup_" } }, orderBy: { key: "desc" } });
      if (backups.length > 10) {
        const toDelete = backups.slice(10);
        for (const b of toDelete) await prisma.worldSetting.delete({ where: { key: b.key } });
      }
    }
    await prisma.worldSetting.upsert({
      where: { key: "customTiles" },
      update: { value: JSON.stringify(tiles) },
      create: { key: "customTiles", value: JSON.stringify(tiles) },
    });
    await logAction("system", null, "custom_tiles_updated", { count: tiles.length });
    io.emit("world:tiles-updated", { tiles });
    res.json({ message: "Mappa salvata", tiles });
  } catch (err) {
    console.error("PUT /admin/custom-tiles error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

router.get("/custom-tiles/backups", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await prisma.worldSetting.findMany({ where: { key: { startsWith: "customTiles_backup_" } }, orderBy: { key: "desc" } });
    const backups = rows.map(r => ({ key: r.key, timestamp: parseInt(r.key.replace("customTiles_backup_", "")), tiles: JSON.parse(r.value) }));
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: "Errore interno" });
  }
});

router.post("/custom-tiles/restore", async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.body;
    const row = await prisma.worldSetting.findUnique({ where: { key } });
    if (!row) { res.status(404).json({ error: "Backup non trovato" }); return; }
    await prisma.worldSetting.upsert({
      where: { key: "customTiles" },
      update: { value: row.value },
      create: { key: "customTiles", value: row.value },
    });
    const tiles = JSON.parse(row.value);
    io.emit("world:tiles-updated", { tiles });
    await logAction("system", null, "custom_tiles_restored", { fromBackup: key });
    res.json({ message: "Backup ripristinato", tiles });
  } catch (err) {
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── NPC POSITIONS ──────────────────────────────────────────────────────────

router.get("/npc-positions", async (_req: Request, res: Response): Promise<void> => {
  try {
    const row = await prisma.worldSetting.findUnique({ where: { key: "npcPositions" } });
    res.json(row ? JSON.parse(row.value) : []);
  } catch (err) {
    res.status(500).json({ error: "Errore interno" });
  }
});

router.put("/npc-positions", async (req: Request, res: Response): Promise<void> => {
  try {
    const positions = req.body;
    await prisma.worldSetting.upsert({
      where: { key: "npcPositions" },
      update: { value: JSON.stringify(positions) },
      create: { key: "npcPositions", value: JSON.stringify(positions) },
    });
    await logAction("system", null, "npc_positions_updated", { count: positions.length });
    io.emit("world:npc-positions-updated", { positions });
    res.json({ message: "Posizioni NPC salvate", positions });
  } catch (err) {
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
