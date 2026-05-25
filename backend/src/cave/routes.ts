import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";

const router = Router();

// POST /api/cave/enter — entra nella grotta
router.post("/enter", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({ characterId: z.number().int().positive() });
    const { characterId } = schema.parse(req.body);
    const char = await prisma.character.findUnique({ where: { id: characterId } });
    if (!char) { res.status(404).json({ error: "Personaggio non trovato" }); return; }
    if (char.inCave) { res.status(400).json({ error: "Sei già nella grotta" }); return; }

    await prisma.character.update({
      where: { id: characterId },
      data: { inCave: true, cavePosX: 200, cavePosY: 400, exitPosX: char.posX, exitPosY: char.posY },
    });
    res.json({ message: "Sei entrato nella grotta", cavePosX: 200, cavePosY: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: "Dati non validi" }); return; }
    res.status(500).json({ error: "Errore interno" });
  }
});

// POST /api/cave/exit — esci dalla grotta
router.post("/exit", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({ characterId: z.number().int().positive() });
    const { characterId } = schema.parse(req.body);
    const char = await prisma.character.findUnique({ where: { id: characterId } });
    if (!char) { res.status(404).json({ error: "Personaggio non trovato" }); return; }
    if (!char.inCave) { res.status(400).json({ error: "Non sei nella grotta" }); return; }

    await prisma.character.update({
      where: { id: characterId },
      data: { inCave: false, cavePosX: null, cavePosY: null, posX: char.exitPosX || 6688, posY: char.exitPosY || 3424, exitPosX: null, exitPosY: null },
    });
    res.json({ message: "Sei uscito dalla grotta", posX: char.exitPosX || 6688, posY: char.exitPosY || 3424 });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: "Dati non validi" }); return; }
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
