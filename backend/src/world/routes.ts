import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { ZONES } from "./seed-data";

const router = Router();

// GET /api/world/roles
router.get("/roles", async (_req: Request, res: Response): Promise<void> => {
  try {
    const roles = await prisma.role.findMany();
    res.json(roles.map((r) => ({
      ...r,
      statModifiers: JSON.parse(r.statModifiers),
      allowedEquipmentTypes: JSON.parse(r.allowedEquipmentTypes),
    })));
  } catch (err) {
    console.error("List roles error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/world/villages
router.get("/villages", async (_req: Request, res: Response): Promise<void> => {
  try {
    const villages = await prisma.village.findMany();
    res.json(villages);
  } catch (err) {
    console.error("List villages error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/world/npcs
router.get("/npcs", async (_req: Request, res: Response): Promise<void> => {
  try {
    const npcs = await prisma.nPC.findMany();
    res.json(npcs);
  } catch (err) {
    console.error("List NPCs error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/world/zones
router.get("/zones", (_req: Request, res: Response): void => {
  res.json(ZONES);
});

// GET /api/world/events
router.get("/events", async (_req: Request, res: Response): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { startTime: "desc" },
      take: 20,
    });
    res.json(events.map((e) => ({ ...e, payload: JSON.parse(e.payload) })));
  } catch (err) {
    console.error("List events error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/world/action-log
router.get("/action-log", async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.actionLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
    });
    res.json(logs.map((l) => ({ ...l, details: JSON.parse(l.details) })));
  } catch (err) {
    console.error("Action log error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/world/treaties
router.get("/treaties", async (_req: Request, res: Response): Promise<void> => {
  try {
    const treaties = await prisma.treaty.findMany({
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(treaties.map((t) => ({ ...t, partiesJson: JSON.parse(t.partiesJson) })));
  } catch (err) {
    console.error("List treaties error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/world/custom-tiles — pubblico, caricato dal gioco all'avvio
router.get("/custom-tiles", async (_req: Request, res: Response): Promise<void> => {
  try {
    const row = await prisma.worldSetting.findUnique({ where: { key: "customTiles" } });
    res.json(row ? JSON.parse(row.value) : []);
  } catch (err) {
    console.error("Custom tiles error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// GET /api/world/npc-positions — pubblico
router.get("/npc-positions", async (_req: Request, res: Response): Promise<void> => {
  try {
    const row = await prisma.worldSetting.findUnique({ where: { key: "npcPositions" } });
    res.json(row ? JSON.parse(row.value) : []);
  } catch (err) {
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
