import jwt from "jsonwebtoken";
import { env } from "../env";

export interface JwtPayload {
  userId: number;
  characterId?: number;
}

const JWT_EXPIRY = "7d";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
