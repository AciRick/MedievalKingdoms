import { io, Socket } from "socket.io-client";
import { getToken } from "../api/client";

let socket: Socket | null = null;

export function connectSocket(characterId: number): Socket {
  if (socket?.connected) return socket;

  const wsUrl = import.meta.env.VITE_WS_URL || "http://localhost:3001";
  const token = getToken();

  socket = io(wsUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("🟢 Socket connesso");
    socket!.emit("join", { characterId });
  });

  socket.on("connect_error", (err) => {
    console.error("Socket error:", err.message);
  });

  // Esponi socket globalmente per la scena Phaser
  (window as any).__gameSocket = { getSocket: () => socket };

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
