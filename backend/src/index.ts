import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import rateLimit from "express-rate-limit";
import { env } from "./env";
import { setupSocketIO } from "./sockets";
import { setupMovementHandlers } from "./sockets/movement";
import { setupChatHandlers } from "./sockets/chat";
import { setupWorldEventHandlers } from "./sockets/world-events";

import authRoutes from "./auth/routes";
import characterRoutes from "./characters/routes";
import worldRoutes from "./world/routes";
import combatRoutes from "./combat/routes";
import treatyRoutes from "./treaties/routes";
import popeRoutes from "./pope/routes";
import adminRoutes from "./admin/routes";
import worldEditorRoutes from "./admin/world-editor";
import questRoutes from "./quests/routes";
import inventoryRoutes from "./inventory/routes";
import shopRoutes from "./shop/routes";
import restRoutes from "./rest/routes";
import caveRoutes from "./cave/routes";
import { startRandomEvents, getWorldItems, collectItem } from "./world/random-events";

const app = express();
const server = http.createServer(app);

// Trust proxy per rate limiter
app.set("trust proxy", 1);

// CORS
app.use(cors({
  origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
  credentials: true,
}));

// Body parser
app.use(express.json());

// Rate limiter per login
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: { error: "Troppi tentativi di login. Riprova tra un minuto." },
});

// Servi i file statici (uploads)
const uploadsDir = path.resolve(env.UPLOADS_DIR);
app.use("/uploads", express.static(uploadsDir));

// Rotte
app.use("/api/auth", (req, res, next) => {
  if (req.path === "/login") {
    return loginLimiter(req, res, next);
  }
  next();
}, authRoutes);

app.use("/api/characters", characterRoutes);
app.use("/api/world", worldRoutes);
app.use("/api/combat", combatRoutes);
app.use("/api/treaties", treatyRoutes);
app.use("/api/pope", popeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", worldEditorRoutes);
app.use("/api/quests", questRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/rest", restRoutes);
app.use("/api/cave", caveRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Socket.IO setup
setupSocketIO(server);
setupMovementHandlers();
setupChatHandlers();
setupWorldEventHandlers();

// Avvio server
const PORT = parseInt(env.PORT);
const HOST = env.HOST;

server.listen(PORT, HOST, () => {
  console.log(`⚔️  Regni Medievali — Server avviato su http://${HOST}:${PORT}`);
  console.log(`   CORS origin: ${env.CORS_ORIGIN}`);
  console.log(`   Uploads: ${uploadsDir}`);
});

startRandomEvents();

export default app;
