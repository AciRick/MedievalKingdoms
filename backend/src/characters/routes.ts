import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireUser } from "../auth/middleware";
import { createCharacterSchema, getSpawnPosition } from "./service";
import { upload, uploadCry } from "../utils/upload";
import { z } from "zod";
import path from "path";

const router = Router();

// GET /api/characters — lista personaggi dell'utente
router.get("/", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const characters = await prisma.character.findMany({
      where: { userId: req.user!.userId },
      include: { characterRoles: { include: { role: true } } },
    });
    res.json(characters);
  } catch (err) {
    console.error("List characters error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/characters/:id
router.get("/:id", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const char = await prisma.character.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        characterRoles: { include: { role: true } },
        equipment: { include: { item: true } },
      },
    });
    if (!char) {
      res.status(404).json({ error: "Personaggio non trovato" });
      return;
    }
    if (char.userId !== req.user!.userId) {
      res.status(403).json({ error: "Non sei il proprietario di questo personaggio" });
      return;
    }
    res.json(char);
  } catch (err) {
    console.error("Get character error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/characters — crea personaggio
router.post("/", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = createCharacterSchema.parse(req.body);

    // Verifica point-buy: somma attributi = 20, max 10 per attributo
    const stats = [body.strength, body.agility, body.charisma, body.intellect, body.faith, body.luck];
    const total = stats.reduce((a, b) => a + b, 0);
    if (total !== 20) {
      res.status(400).json({ error: `La somma degli attributi deve essere esattamente 20 (hai usato ${total})` });
      return;
    }
    if (stats.some((s) => s > 10)) {
      res.status(400).json({ error: "Nessun attributo può superare 10" });
      return;
    }

    // Verifica che i ruoli esistano
    const roles = await prisma.role.findMany({ where: { id: { in: body.roleIds } } });
    if (roles.length !== body.roleIds.length) {
      res.status(400).json({ error: "Uno o più ruoli non validi" });
      return;
    }

    const spawn = getSpawnPosition(body.kingdom);

    const char = await prisma.character.create({
      data: {
        userId: req.user!.userId,
        name: body.name,
        peopleName: body.peopleName,
        kingdom: body.kingdom,
        strength: body.strength,
        agility: body.agility,
        charisma: body.charisma,
        intellect: body.intellect,
        faith: body.faith,
        luck: body.luck,
        posX: spawn.posX,
        posY: spawn.posY,
        zone: spawn.zone,
        hp: 100,
        energy: 100,
      },
    });

    // Associa ruoli
    for (const roleId of body.roleIds) {
      await prisma.characterRole.create({
        data: { characterId: char.id, roleId },
      });
    }

    const full = await prisma.character.findUnique({
      where: { id: char.id },
      include: { characterRoles: { include: { role: true } } },
    });

    res.status(201).json(full);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Create character error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/characters/:id/face — carica volto
router.post("/:id/face", requireUser, upload.single("face"), async (req: Request, res: Response): Promise<void> => {
  try {
    const charId = parseInt(req.params.id);
    const char = await prisma.character.findUnique({ where: { id: charId } });
    if (!char || char.userId !== req.user!.userId) {
      res.status(403).json({ error: "Accesso negato" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Nessun file caricato" });
      return;
    }
    const relativePath = "faces/" + req.file.filename;
    await prisma.character.update({
      where: { id: charId },
      data: { faceImagePath: relativePath },
    });
    res.json({ faceImagePath: relativePath });
  } catch (err) {
    console.error("Face upload error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/characters/:id/cry — carica grido
router.post("/:id/cry", requireUser, uploadCry.single("cry"), async (req: Request, res: Response): Promise<void> => {
  try {
    const charId = parseInt(req.params.id);
    const char = await prisma.character.findUnique({ where: { id: charId } });
    if (!char || char.userId !== req.user!.userId) {
      res.status(403).json({ error: "Accesso negato" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Nessun file caricato" });
      return;
    }
    const relativePath = "cries/" + req.file.filename;
    await prisma.character.update({
      where: { id: charId },
      data: { battleCryAudioPath: relativePath },
    });
    res.json({ battleCryAudioPath: relativePath });
  } catch (err) {
    console.error("Cry upload error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
