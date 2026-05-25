import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { logAction } from "../utils/action-log";

const router = Router();

// POST /api/shop/sell — vendi risorsa a un NPC
router.post("/sell", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      characterId: z.number().int().positive(),
      resourceName: z.enum(["wood", "stone", "fish", "herbs", "meat", "iron"]),
      amount: z.number().int().min(1),
      sellPrice: z.number().int().min(1),
    });
    const { characterId, resourceName, amount, sellPrice } = schema.parse(req.body);

    const inv = await prisma.characterInventory.findUnique({ where: { characterId } });
    const owned = (inv as any)?.[resourceName] || 0;

    if (owned < amount) {
      res.status(400).json({ error: `Non hai abbastanza ${resourceName}. Ne hai ${owned}.` });
      return;
    }

    const goldEarned = amount * sellPrice;

    await prisma.characterInventory.update({
      where: { characterId },
      data: { [resourceName]: { decrement: amount } },
    });

    await prisma.character.update({
      where: { id: characterId },
      data: { gold: { increment: goldEarned } },
    });

    await logAction("character", characterId, "shop_sell", {
      resourceName,
      amount,
      goldEarned,
    });

    res.json({
      message: `Hai venduto ${amount} ${resourceName} per ${goldEarned} oro!`,
      goldEarned,
      resourceName,
      amount,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("POST /shop/sell error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
