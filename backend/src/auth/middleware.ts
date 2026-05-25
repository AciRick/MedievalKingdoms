import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "./jwt";

// Estendi Express Request per contenere l'utente
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token mancante o non valido" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Token scaduto o non valido" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminHeader = req.headers["x-admin-password"];
  if (!adminHeader || adminHeader !== process.env.ADMIN_PASSWORD) {
    res.status(403).json({ error: "Password admin non valida" });
    return;
  }
  next();
}
