import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireUser } from "../auth/middleware";
import { logAction } from "../utils/action-log";

const router = Router();

const popeActionSchema = z.object({
  popeCharacterId: z.number().int().positive(),
  targetCharacterId: z.number().int().positive(),
});

// POST /api/pope/excommunicate
router.post("/excommunicate", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = popeActionSchema.parse(req.body);

    const pope = await prisma.character.findUnique({ where: { id: body.popeCharacterId } });
    if (!pope || pope.userId !== req.user!.userId || !pope.isPope) {
      res.status(403).json({ error: "Solo il Papa può scomunicare" });
      return;
    }

    const target = await prisma.character.findUnique({ where: { id: body.targetCharacterId } });
    if (!target) {
      res.status(404).json({ error: "Personaggio bersaglio non trovato" });
      return;
    }

    await prisma.character.update({
      where: { id: body.targetCharacterId },
      data: { isExcommunicated: true },
    });

    await logAction("character", pope.id, "excommunicate", {
      targetId: target.id,
      targetName: target.name,
    });

    res.json({ message: `${target.name} è stato scomunicato!` });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Excommunicate error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/pope/pardon
router.post("/pardon", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = popeActionSchema.parse(req.body);

    const pope = await prisma.character.findUnique({ where: { id: body.popeCharacterId } });
    if (!pope || pope.userId !== req.user!.userId || !pope.isPope) {
      res.status(403).json({ error: "Solo il Papa può perdonare" });
      return;
    }

    const target = await prisma.character.findUnique({ where: { id: body.targetCharacterId } });
    if (!target) {
      res.status(404).json({ error: "Personaggio bersaglio non trovato" });
      return;
    }

    await prisma.character.update({
      where: { id: body.targetCharacterId },
      data: { isExcommunicated: false },
    });

    await logAction("character", pope.id, "pardon", {
      targetId: target.id,
      targetName: target.name,
    });

    res.json({ message: `${target.name} è stato perdonato!` });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Pardon error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/pope/set-corrupted
router.post("/set-corrupted", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = z.object({
      popeCharacterId: z.number().int().positive(),
      corrupted: z.boolean(),
    }).parse(req.body);

    const pope = await prisma.character.findUnique({ where: { id: body.popeCharacterId } });
    if (!pope || pope.userId !== req.user!.userId || !pope.isPope) {
      res.status(403).json({ error: "Solo il Papa può modificare il proprio stato" });
      return;
    }

    await prisma.character.update({
      where: { id: body.popeCharacterId },
      data: { isPopeCorrupted: body.corrupted },
    });

    await logAction("character", pope.id, body.corrupted ? "pope_corrupted" : "pope_uncorrupted", {});

    res.json({ message: body.corrupted ? "Il Papa si è dichiarato corrotto!" : "Il Papa ha purificato la propria anima." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Set corrupted error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/pope/characters — lista per scomunicare
router.get("/characters", requireUser, async (_req: Request, res: Response): Promise<void> => {
  try {
    const chars = await prisma.character.findMany({
      select: { id: true, name: true, kingdom: true, isExcommunicated: true },
      orderBy: { name: "asc" },
    });
    res.json(chars);
  } catch (err) {
    console.error("List characters for pope error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
