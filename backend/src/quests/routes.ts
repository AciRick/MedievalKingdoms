import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { logAction } from "../utils/action-log";

const router = Router();

const defaultTemplates = [
  { buildingName: "Capanna Foresta", resourceName: "wood", resourceLabel: "Legna", targetAmount: 50, gatherTime: 4, gatherYield: 3, goldReward: 100, itemRewardName: "Spada di Legno", itemRewardType: "WEAPON", description: "Raccogli 50 unità di legna nella Foresta Oscura. Interagisci con gli alberi per tagliarli." },
  { buildingName: "Molo del Porto", resourceName: "fish", resourceLabel: "Pesce", targetAmount: 30, gatherTime: 3, gatherYield: 2, goldReward: 150, itemRewardName: "Amo da Pesca", itemRewardType: "TALISMAN", description: "Pesca 30 pesci dalla Costa Marina. Interagisci con l'acqua per pescare." },
  { buildingName: "Castello Nord", resourceName: "iron", resourceLabel: "Ferro", targetAmount: 20, gatherTime: 6, gatherYield: 1, goldReward: 200, itemRewardName: "Armatura di Ferro", itemRewardType: "ARMOR", description: "Estrai 20 unità di ferro nella Terra di Nessuno. Interagisci con i minerali per estrarli." },
  { buildingName: "Abbazia", resourceName: "herbs", resourceLabel: "Erbe", targetAmount: 15, gatherTime: 4, gatherYield: 2, goldReward: 120, itemRewardName: "Pozione Curativa", itemRewardType: "CONSUMABLE", description: "Raccogli 15 erbe medicinali nella Foresta Oscura. Interagisci con i cespugli." },
  { buildingName: "Palazzo Sud", resourceName: "stone", resourceLabel: "Pietra", targetAmount: 40, gatherTime: 5, gatherYield: 2, goldReward: 130, itemRewardName: "Piccone di Pietra", itemRewardType: "WEAPON", description: "Raccogli 40 unità di pietra nella Terra di Nessuno. Interagisci con le rocce." },
  { buildingName: "Porto Comm.le", resourceName: "fish", resourceLabel: "Pesce", targetAmount: 25, gatherTime: 3, gatherYield: 2, goldReward: 180, itemRewardName: "Amo d'Oro", itemRewardType: "TALISMAN", description: "Pesca 25 pesci per il Porto Commerciale. Interagisci con l'acqua della Costa." },
  { buildingName: "Tempio", resourceName: "herbs", resourceLabel: "Erbe", targetAmount: 20, gatherTime: 4, gatherYield: 2, goldReward: 140, itemRewardName: "Veste Sacra", itemRewardType: "ARMOR", description: "Raccogli 20 erbe per il Tempio del Sud. Interagisci con i cespugli della Foresta." },
  { buildingName: "Miniera", resourceName: "iron", resourceLabel: "Ferro", targetAmount: 15, gatherTime: 6, gatherYield: 1, goldReward: 250, itemRewardName: "Scudo di Ferro", itemRewardType: "ARMOR", description: "Estrai 15 unità di ferro dalla Miniera del Sud. Interagisci con i minerali nella Terra di Nessuno." },
];

async function ensureTemplates(): Promise<void> {
  const count = await prisma.questTemplate.count();
  if (count === 0) {
    for (const t of defaultTemplates) {
      await prisma.questTemplate.create({ data: t });
    }
  }
}

void ensureTemplates();

// GET /api/quests/available — tutte le quest disponibili
router.get("/available", async (_req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.questTemplate.findMany();
    const items = await prisma.item.findMany({ select: { id: true, name: true } });
    res.json(templates.map((t) => ({ ...t, items })));
  } catch (err) {
    console.error("GET /quests/available error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// GET /api/quests/my?characterId=X — quest attive del personaggio
router.get("/my", async (req: Request, res: Response): Promise<void> => {
  try {
    const characterId = parseInt(req.query.characterId as string, 10);
    if (!characterId) {
      res.status(400).json({ error: "characterId richiesto" });
      return;
    }
    const quests = await prisma.characterQuest.findMany({
      where: { characterId, status: "active" },
    });
    const templates = await prisma.questTemplate.findMany();
    const result = quests.map((q) => {
      const tpl = templates.find((t) => t.id === q.templateId);
      return { ...q, template: tpl || null };
    });
    res.json(result);
  } catch (err) {
    console.error("GET /quests/my error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// POST /api/quests/accept — accetta una quest
router.post("/accept", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      characterId: z.number().int().positive(),
      templateId: z.number().int().positive(),
    });
    const { characterId, templateId } = schema.parse(req.body);

    const existing = await prisma.characterQuest.findFirst({
      where: { characterId, templateId, status: { in: ["active", "claimed"] } },
    });
    if (existing) {
      res.status(400).json({ error: "Hai già accettato questa quest" });
      return;
    }

    const quest = await prisma.characterQuest.create({
      data: { characterId, templateId, progress: 0, status: "active" },
    });
    const tpl = await prisma.questTemplate.findUnique({ where: { id: templateId } });
    await logAction("character", characterId, "quest_accepted", { templateId, questName: tpl?.buildingName });
    res.json({ ...quest, template: tpl });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("POST /quests/accept error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// POST /api/quests/gather — raccogli risorsa (chiamato dopo progress bar completata)
router.post("/gather", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      characterId: z.number().int().positive(),
      resourceName: z.enum(["wood", "stone", "fish", "herbs", "meat", "iron"]),
      amount: z.number().int().min(1).default(1),
    });
    const { characterId, resourceName, amount } = schema.parse(req.body);

    // Upsert inventory
    const inv = await prisma.characterInventory.upsert({
      where: { characterId },
      update: { [resourceName]: { increment: amount } },
      create: { characterId, [resourceName]: amount },
    });

    // Update active quests that match this resource
    const activeQuests = await prisma.characterQuest.findMany({
      where: { characterId, status: "active" },
    });
    const templates = await prisma.questTemplate.findMany();

    const updated: { id: number; progress: number; completed: boolean; template: any }[] = [];

    for (const aq of activeQuests) {
      const tpl = templates.find((t) => t.id === aq.templateId);
      if (!tpl || tpl.resourceName !== resourceName) continue;

      const newProgress = Math.min(aq.progress + amount, tpl.targetAmount);

      await prisma.characterQuest.update({
        where: { id: aq.id },
        data: { progress: newProgress },
      });

      updated.push({ id: aq.id, progress: newProgress, completed: false, template: tpl });
    }

    res.json({ inventory: inv, updatedQuests: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("POST /quests/gather error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// POST /api/quests/claim — reclama ricompensa quest completata
router.post("/claim", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      characterId: z.number().int().positive(),
      questId: z.number().int().positive(),
    });
    const { characterId, questId } = schema.parse(req.body);

    const cq = await prisma.characterQuest.findUnique({ where: { id: questId } });
    if (!cq || cq.characterId !== characterId) {
      res.status(404).json({ error: "Quest non trovata" });
      return;
    }
    if (cq.status !== "completed") {
      res.status(400).json({ error: "La quest non è ancora completata" });
      return;
    }

    const tpl = await prisma.questTemplate.findUnique({ where: { id: cq.templateId } });
    if (!tpl) {
      res.status(500).json({ error: "Template quest non trovato" });
      return;
    }

    // Assegna oro
    await prisma.character.update({
      where: { id: characterId },
      data: { gold: { increment: tpl.goldReward } },
    });

    // Cerca o crea l'item ricompensa
    let item = await prisma.item.findFirst({ where: { name: tpl.itemRewardName } });
    if (!item) {
      item = await prisma.item.create({
        data: {
          name: tpl.itemRewardName,
          type: tpl.itemRewardType,
          rarity: "comune",
          requiredRoles: "[]",
          statBonuses: JSON.stringify({ atk: tpl.itemRewardType === "WEAPON" ? 5 : 0, def: tpl.itemRewardType === "ARMOR" ? 5 : 0 }),
          description: `Ricompensa per la quest "${tpl.buildingName}"`,
        },
      });
    }

    // Equipaggia o aggiungi all'inventario
    await prisma.equipment.create({
      data: {
        characterId,
        itemId: item.id,
        slot: tpl.itemRewardType === "WEAPON" ? "main_hand" : tpl.itemRewardType === "ARMOR" ? "body" : "accessory",
      },
    });

    // Marca quest come claimed
    await prisma.characterQuest.update({
      where: { id: questId },
      data: { status: "claimed" },
    });

    await logAction("character", characterId, "quest_claimed", {
      questId,
      reward: `${tpl.goldReward} gold + ${tpl.itemRewardName}`,
    });

    res.json({
      message: `Hai ricevuto ${tpl.goldReward} monete d'oro e ${tpl.itemRewardName}!`,
      gold: tpl.goldReward,
      item: tpl.itemRewardName,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("POST /quests/claim error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// POST /api/quests/deliver — consegna risorse, completa quest
router.post("/deliver", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      characterId: z.number().int().positive(),
      questId: z.number().int().positive(),
    });
    const { characterId, questId } = schema.parse(req.body);

    const cq = await prisma.characterQuest.findUnique({ where: { id: questId } });
    if (!cq || cq.characterId !== characterId) {
      res.status(404).json({ error: "Quest non trovata" });
      return;
    }
    if (cq.status !== "active") {
      res.status(400).json({ error: "La quest non è attiva" });
      return;
    }

    const tpl = await prisma.questTemplate.findUnique({ where: { id: cq.templateId } });
    if (!tpl) {
      res.status(500).json({ error: "Template quest non trovato" });
      return;
    }

    const inv = await prisma.characterInventory.findUnique({ where: { characterId } });
    const owned = (inv as any)?.[tpl.resourceName] || 0;

    if (owned < tpl.targetAmount) {
      const missing = tpl.targetAmount - owned;
      res.status(400).json({
        error: `Risorse insufficienti`,
        missing,
        resourceLabel: tpl.resourceLabel,
        owned,
        needed: tpl.targetAmount,
      });
      return;
    }

    await prisma.characterInventory.update({
      where: { characterId },
      data: { [tpl.resourceName]: { decrement: tpl.targetAmount } },
    });

    await prisma.characterQuest.update({
      where: { id: questId },
      data: { status: "completed", progress: tpl.targetAmount },
    });

    await logAction("character", characterId, "quest_delivered", {
      questId,
      resource: tpl.resourceLabel,
      amount: tpl.targetAmount,
    });

    res.json({
      message: `Hai consegnato ${tpl.targetAmount} ${tpl.resourceLabel}! Torna dall'NPC per la ricompensa.`,
      questCompleted: true,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("POST /quests/deliver error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

// POST /api/quests/abandon — abbandona una quest
router.post("/abandon", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      characterId: z.number().int().positive(),
      questId: z.number().int().positive(),
    });
    const { characterId, questId } = schema.parse(req.body);

    const cq = await prisma.characterQuest.findUnique({ where: { id: questId } });
    if (!cq || cq.characterId !== characterId) {
      res.status(404).json({ error: "Quest non trovata" });
      return;
    }
    if (cq.status !== "active") {
      res.status(400).json({ error: "La quest non è attiva" });
      return;
    }

    await prisma.characterQuest.update({
      where: { id: questId },
      data: { status: "abandoned" },
    });

    const tpl = await prisma.questTemplate.findUnique({ where: { id: cq.templateId } });
    await logAction("character", characterId, "quest_abandoned", {
      questId,
      questName: tpl?.buildingName,
    });

    res.json({ message: "Quest abbandonata. Le risorse restano nel tuo inventario." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("POST /quests/abandon error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
