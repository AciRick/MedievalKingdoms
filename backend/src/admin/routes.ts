import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAdmin } from "../auth/middleware";
import { logAction } from "../utils/action-log";
import { io } from "../sockets";
import { env } from "../env";

const router = Router();

// Tutte le route admin richiedono requireAdmin
router.use(requireAdmin);

let genocideEnabled = false;

// GET /api/admin/status
router.get("/status", (_req: Request, res: Response): void => {
  res.json({ genocideEnabled, uptime: process.uptime() });
});

// POST /api/admin/toggle-genocide
router.post("/toggle-genocide", (req: Request, res: Response): void => {
  const mustConfirm = req.body.confirm;
  if (!mustConfirm) {
    res.status(400).json({ error: "Conferma richiesta per attivare/disattivare il genocidio" });
    return;
  }
  genocideEnabled = !genocideEnabled;
  logAction("system", null, genocideEnabled ? "genocide_enabled" : "genocide_disabled", {});
  io.emit("world:event", {
    type: genocideEnabled ? "genocide_enabled" : "genocide_disabled",
    message: genocideEnabled
      ? "⚠️ MODALITÀ GENOCIDIO ATTIVATA — tutte le azioni estreme sono ora permesse!"
      : "✅ Modalità genocidio disattivata.",
    timestamp: new Date().toISOString(),
  });
  res.json({ genocideEnabled, message: genocideEnabled ? "Genocidio attivato" : "Genocidio disattivato" });
});

// POST /api/admin/event
router.post("/event", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      type: z.enum(["war", "famine", "earthquake", "cold_winter", "random_loot"]),
      scope: z.enum(["global", "village_a", "village_b"]).default("global"),
    });
    const body = schema.parse(req.body);

    await prisma.event.create({
      data: {
        type: body.type,
        scope: body.scope,
        payload: JSON.stringify({ triggered: "admin" }),
      },
    });

    const messages: Record<string, string> = {
      war: "⚔️ L'Admin ha scatenato una guerra tra i villaggi!",
      famine: "🍂 Una terribile carestia colpisce la regione!",
      earthquake: "🌋 Un terremoto fa tremare la terra!",
      cold_winter: "❄️ Un inverno gelido si abbatte sul regno!",
      random_loot: "🎁 L'Admin fa piovere bottino casuale dal cielo!",
    };

    await logAction("system", null, "admin_event", { type: body.type, scope: body.scope });

    io.emit("world:event", {
      type: body.type,
      scope: body.scope,
      message: messages[body.type] || `Evento: ${body.type}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: messages[body.type] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Admin event error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/admin/force-excommunicate
router.post("/force-excommunicate", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({ characterId: z.number().int().positive() });
    const body = schema.parse(req.body);

    await prisma.character.update({
      where: { id: body.characterId },
      data: { isExcommunicated: true },
    });

    const char = await prisma.character.findUnique({ where: { id: body.characterId } });

    await logAction("system", null, "force_excommunicate", { characterId: body.characterId });

    io.emit("world:event", {
      type: "excommunication",
      message: `⚡ ${char?.name || "Un personaggio"} è stato scomunicato dall'Admin!`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: `${char?.name} scomunicato con successo` });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Force excommunicate error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/admin/force-pardon
router.post("/force-pardon", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({ characterId: z.number().int().positive() });
    const body = schema.parse(req.body);

    await prisma.character.update({
      where: { id: body.characterId },
      data: { isExcommunicated: false },
    });

    const char = await prisma.character.findUnique({ where: { id: body.characterId } });

    await logAction("system", null, "force_pardon", { characterId: body.characterId });

    io.emit("world:event", {
      type: "pardon",
      message: `🕊️ ${char?.name || "Un personaggio"} è stato perdonato dall'Admin!`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: `${char?.name} perdonato con successo` });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Force pardon error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/admin/action-log
router.get("/action-log", async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.actionLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
    });
    res.json(logs.map((l) => ({ ...l, details: JSON.parse(l.details) })));
  } catch (err) {
    console.error("Admin action log error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/admin/message
router.post("/message", async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      message: z.string().min(1).max(500),
      type: z.enum(["chat", "overlay", "both"]).default("both"),
    });
    const body = schema.parse(req.body);

    if (body.type === "chat" || body.type === "both") {
      io.emit("chat:message", {
        sender: "[ADMIN]",
        characterId: 0,
        message: body.message,
        channel: "all",
        zone: "global",
        timestamp: new Date().toISOString(),
      });
    }

    if (body.type === "overlay" || body.type === "both") {
      io.emit("world:overlay", {
        message: body.message,
        duration: 6000,
        timestamp: new Date().toISOString(),
      });
    }

    await logAction("system", null, "admin_message", { type: body.type });
    res.json({ message: "Messaggio inviato a tutti i giocatori" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Admin message error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/admin/connected — lista giocatori connessi (prossimamente)
router.get("/connected", (_req: Request, res: Response): void => {
  const sockets = Array.from(io.sockets.sockets.values());
  const clients = sockets.map((s) => ({
    id: s.id,
    characterId: (s.data as Record<string, unknown>)?.characterId || null,
    characterName: (s.data as Record<string, unknown>)?.characterName || null,
    zone: (s.data as Record<string, unknown>)?.zone || null,
  }));
  res.json({ count: clients.length, clients });
});

export default router;
