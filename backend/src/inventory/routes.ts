import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

// GET /api/inventory/:characterId
router.get("/:characterId", async (req: Request, res: Response): Promise<void> => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    let inv = await prisma.characterInventory.findUnique({ where: { characterId } });
    if (!inv) {
      inv = await prisma.characterInventory.create({
        data: { characterId },
      });
    }
    res.json(inv);
  } catch (err) {
    console.error("GET /inventory error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
