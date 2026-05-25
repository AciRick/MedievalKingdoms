import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3001"),
  HOST: z.string().default("0.0.0.0"),
  DB_PATH: z.string().default("file:./dev.db"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 chars"),
  UPLOADS_DIR: z.string().default("../uploads"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  ADMIN_PASSWORD: z.string().default("admin123"),
});

export const env = envSchema.parse(process.env);
