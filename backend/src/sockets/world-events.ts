import { io } from "./index";

export function setupWorldEventHandlers(): void {
  io.on("connection", (socket) => {
    // I client possono richiedere la lista eventi recenti
    socket.on("world:events:request", () => {
      // Gli eventi vengono broadcast dal server - il client mantiene una cache locale
      socket.emit("world:events:sync", { message: "Usa l'API REST per la lista completa" });
    });
  });
}
