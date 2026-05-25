import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { signToken, verifyToken } from "./jwt";
import { requireUser } from "./middleware";

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) {
      res.status(409).json({ error: "Username già in uso" });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: { username: body.username, passwordHash },
    });

    const token = signToken({ userId: user.id });
    res.status(201).json({ token, user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username: body.username } });
    if (!user) {
      res.status(401).json({ error: "Credenziali non valide" });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Credenziali non valide" });
      return;
    }

    const token = signToken({ userId: user.id });
    res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/auth/me
router.get("/me", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, username: true, isAdmin: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: "Utente non trovato" });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
