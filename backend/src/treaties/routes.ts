import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireUser } from "../auth/middleware";
import { logAction } from "../utils/action-log";

const router = Router();

const treatySchema = z.object({
  characterId: z.number().int().positive(),
  type: z.enum(["WAR", "PEACE"]),
  partiesJson: z.record(z.boolean()),
});

const approveSchema = z.object({
  characterId: z.number().int().positive(),
  treatyId: z.number().int().positive(),
});

// POST /api/treaties/propose
router.post("/propose", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = treatySchema.parse(req.body);

    const char = await prisma.character.findUnique({
      where: { id: body.characterId },
      include: { characterRoles: { include: { role: true } } },
    });
    if (!char || char.userId !== req.user!.userId) {
      res.status(403).json({ error: "Accesso negato" });
      return;
    }

    const treaty = await prisma.treaty.create({
      data: {
        type: body.type,
        partiesJson: JSON.stringify(body.partiesJson),
        status: "PROPOSED",
        createdByCharacterId: body.characterId,
      },
    });

    await logAction("character", char.id, "treaty_proposed", {
      treatyId: treaty.id,
      type: body.type,
      parties: body.partiesJson,
    });

    res.status(201).json({ ...treaty, partiesJson: JSON.parse(treaty.partiesJson) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Treaty propose error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/treaties/approve — solo il Papa può approvare
router.post("/approve", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = approveSchema.parse(req.body);

    const char = await prisma.character.findUnique({ where: { id: body.characterId } });
    if (!char || char.userId !== req.user!.userId || !char.isPope) {
      res.status(403).json({ error: "Solo il Papa può approvare i trattati" });
      return;
    }

    const treaty = await prisma.treaty.findUnique({ where: { id: body.treatyId } });
    if (!treaty) {
      res.status(404).json({ error: "Trattato non trovato" });
      return;
    }
    if (treaty.status !== "PROPOSED") {
      res.status(400).json({ error: "Il trattato non è in attesa di approvazione" });
      return;
    }

    const updated = await prisma.treaty.update({
      where: { id: body.treatyId },
      data: { status: "APPROVED_BY_POPE", approvedAt: new Date() },
    });

    // Auto-activate dopo approvazione papale
    await prisma.treaty.update({
      where: { id: body.treatyId },
      data: { status: "ACTIVE" },
    });

    await logAction("character", char.id, "treaty_approved", {
      treatyId: treaty.id,
    });

    res.json({ ...updated, partiesJson: JSON.parse(updated.partiesJson) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Treaty approve error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/treaties/reject — solo il Papa può rifiutare
router.post("/reject", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = approveSchema.parse(req.body);

    const char = await prisma.character.findUnique({ where: { id: body.characterId } });
    if (!char || char.userId !== req.user!.userId || !char.isPope) {
      res.status(403).json({ error: "Solo il Papa può rifiutare i trattati" });
      return;
    }

    const treaty = await prisma.treaty.findUnique({ where: { id: body.treatyId } });
    if (!treaty) {
      res.status(404).json({ error: "Trattato non trovato" });
      return;
    }

    const updated = await prisma.treaty.update({
      where: { id: body.treatyId },
      data: { status: "REJECTED" },
    });

    await logAction("character", char.id, "treaty_rejected", {
      treatyId: treaty.id,
    });

    res.json({ ...updated, partiesJson: JSON.parse(updated.partiesJson) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Treaty reject error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
