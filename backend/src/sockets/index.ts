import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyToken } from "../auth/jwt";
import { prisma } from "../db";
import { getWorldItems, collectItem, getCurrentEvent } from "../world/random-events";

export let io: Server;

export function setupSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Auth middleware per Socket.IO
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Token non fornito"));
    }
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      socket.data.characterId = payload.characterId;
      next();
    } catch {
      next(new Error("Token non valido"));
    }
  });

  io.on("connection", async (socket) => {
    console.log(`🟢 Socket connesso: ${socket.id} (userId: ${socket.data.userId})`);

    // Il client invia "join" con il characterId dopo la connessione
    socket.on("join", async (data: { characterId: number }) => {
      const char = await prisma.character.findUnique({
        where: { id: data.characterId },
      });

      if (!char || char.userId !== socket.data.userId) {
        socket.emit("error", { message: "Personaggio non valido" });
        return;
      }

      socket.data.characterId = char.id;
      socket.data.characterName = char.name;
      socket.data.zone = char.zone;

      // Unisciti alla room della zona
      socket.join(`zone:${char.zone}`);
      socket.join("global");

      // Broadcast agli altri nella zona
      socket.to(`zone:${char.zone}`).emit("player:joined", {
        characterId: char.id,
        name: char.name,
        posX: char.posX,
        posY: char.posY,
        zone: char.zone,
      });

      // Invia la lista dei giocatori nella zona corrente
      const zoneSockets = await io.in(`zone:${char.zone}`).fetchSockets();
      const players = zoneSockets
        .filter((s) => s.id !== socket.id)
        .map((s) => ({
          characterId: s.data.characterId,
          name: s.data.characterName,
          posX: s.data.posX,
          posY: s.data.posY,
          zone: s.data.zone,
        }))
        .filter((p) => p.characterId != null);

      socket.emit("zone:players", { zone: char.zone, players });

      console.log(`   ${char.name} è entrato in ${char.zone}`);
    });

    socket.on("disconnect", () => {
      const charId = socket.data.characterId;
      const charName = socket.data.characterName;
      const zone = socket.data.zone;
      if (zone) {
        socket.to(`zone:${charId}`).emit("player:left", {
          characterId: charId,
          name: charName,
        });
      }
      console.log(`🔴 Socket disconnesso: ${socket.id} (${charName || "unknown"})`);
    });

    socket.on("world:items-sync", () => {
      socket.emit("world:items-list", getWorldItems());
    });

    socket.on("world:event-status", () => {
      socket.emit("world:event-status", getCurrentEvent());
    });

    socket.on("world:tiles-request", async () => {
      const row = await prisma.worldSetting.findUnique({ where: { key: "customTiles" } });
      socket.emit("world:tiles-list", row ? JSON.parse(row.value) : []);
    });

    socket.on("world:npc-positions-request", async () => {
      const row = await prisma.worldSetting.findUnique({ where: { key: "npcPositions" } });
      socket.emit("world:npc-positions-list", row ? JSON.parse(row.value) : []);
    });

    socket.on("item:collect", async (data: { itemId: number }) => {
      const charId = socket.data.characterId;
      if (!charId) {
        socket.emit("error", { message: "Personaggio non selezionato" });
        return;
      }
      const result = await collectItem(charId, data.itemId);
      if (result.collected) {
        socket.emit("item:collected", { itemId: data.itemId, item: result.item });
      } else {
        socket.emit("error", { message: "Item non più disponibile" });
      }
    });
  });

  return io;
}
