import { io } from "./index";

export function setupChatHandlers(): void {
  io.on("connection", (socket) => {
    socket.on("chat:message", (data: { characterId: number; message: string; channel: string; target?: string }) => {
      const sender = socket.data.characterName || "???";
      const zone = socket.data.zone || "global";

      const broadcast = {
        sender,
        characterId: data.characterId,
        message: data.message,
        channel: data.channel,
        zone,
        timestamp: new Date().toISOString(),
      };

      switch (data.channel) {
        case "all":
          io.emit("chat:message", broadcast);
          break;
        case "zone":
          io.to(`zone:${zone}`).emit("chat:message", broadcast);
          break;
        case "whisper":
          // Cerca il socket del destinatario per nome
          if (data.target) {
            let delivered = false;
            const sockets = Array.from(io.sockets.sockets.values());
            for (const s of sockets) {
              if (s.data.characterName === data.target) {
                s.emit("chat:message", { ...broadcast, channel: "whisper" });
                socket.emit("chat:message", { ...broadcast, channel: "whisper_to", target: data.target });
                delivered = true;
                break;
              }
            }
            if (!delivered) {
              socket.emit("chat:error", { message: `Giocatore "${data.target}" non trovato` });
            }
          }
          break;
        default:
          socket.emit("chat:error", { message: "Canale non valido" });
      }
    });
  });
}
