import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { logAction } from "../utils/action-log";

const router = Router();

// POST /api/rest — riposa per recuperare HP (costo 10 oro)
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      characterId: z.number().int().positive(),
    });
    const { characterId } = schema.parse(req.body);

    const char = await prisma.character.findUnique({ where: { id: characterId } });
    if (!char) {
      res.status(404).json({ error: "Personaggio non trovato" });
      return;
    }
    if (char.hp >= 100) {
      res.status(400).json({ error: "Sei già al massimo della vita" });
      return;
    }
    if (char.gold < 10) {
      res.status(400).json({ error: "Non hai abbastanza oro. Servono 10 monete." });
      return;
    }

    const healAmount = 100 - char.hp;

    await prisma.character.update({
      where: { id: characterId },
      data: { hp: 100, gold: { decrement: 10 } },
    });

    await logAction("character", characterId, "rest", { healAmount, cost: 10 });

    res.json({
      message: `Hai riposato e recuperato ${healAmount} HP per 10 oro!`,
      healed: healAmount,
      hp: 100,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("POST /rest error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// POST /api/rest/free — riposa gratis (es. Abbazia)
router.post("/free", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({ characterId: z.number().int().positive() });
    const { characterId } = schema.parse(req.body);
    const char = await prisma.character.findUnique({ where: { id: characterId } });
    if (!char) { res.status(404).json({ error: "Personaggio non trovato" }); return; }
    if (char.hp >= 100) { res.status(400).json({ error: "Sei già al massimo della vita" }); return; }
    const healAmount = 100 - char.hp;
    await prisma.character.update({ where: { id: characterId }, data: { hp: 100 } });
    await logAction("character", characterId, "rest_free", { healAmount });
    res.json({ message: `Hai riposato e recuperato ${healAmount} HP gratuitamente!`, healed: healAmount, hp: 100 });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: "Dati non validi" }); return; }
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
