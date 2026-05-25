import { io } from "./index";
import { prisma } from "../db";

export function setupMovementHandlers(): void {
  io.on("connection", (socket) => {
    // Riceve aggiornamenti di posizione dal client (~10 Hz)
    socket.on("move", async (data: { characterId: number; posX: number; posY: number; zone: string }) => {
      if (socket.data.characterId !== data.characterId) return;

      // Aggiorna in memoria
      socket.data.posX = data.posX;
      socket.data.posY = data.posY;

      // Cambio zona
      if (data.zone && data.zone !== socket.data.zone) {
        const oldZone = socket.data.zone;
        socket.leave(`zone:${oldZone}`);
        socket.join(`zone:${data.zone}`);
        socket.data.zone = data.zone;

        socket.to(`zone:${oldZone}`).emit("player:left", {
          characterId: data.characterId,
          name: socket.data.characterName,
        });

        socket.to(`zone:${data.zone}`).emit("player:joined", {
          characterId: data.characterId,
          name: socket.data.characterName,
          posX: data.posX,
          posY: data.posY,
          zone: data.zone,
        });

        // Aggiorna il DB con la nuova zona
        await prisma.character.update({
          where: { id: data.characterId },
          data: { posX: data.posX, posY: data.posY, zone: data.zone },
        });
      }

      // Broadcast posizione agli altri nella stessa zona
      socket.to(`zone:${data.zone}`).emit("player:moved", {
        characterId: data.characterId,
        posX: data.posX,
        posY: data.posY,
        zone: data.zone,
      });
    });
  });
}
