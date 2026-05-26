import { z } from "zod";

export const createCharacterSchema = z.object({
  name: z.string().min(2).max(30),
  peopleName: z.string().min(2).max(30),
  kingdom: z.enum(["VILLAGE_A", "VILLAGE_B", "NEUTRAL"]),
  roleIds: z.array(z.number().int().positive()).min(1).max(3),
  strength: z.number().int().min(0).max(10),
  agility: z.number().int().min(0).max(10),
  charisma: z.number().int().min(0).max(10),
  intellect: z.number().int().min(0).max(10),
  faith: z.number().int().min(0).max(10),
  luck: z.number().int().min(0).max(10),
});

// Posizione iniziale in base al regno
export function getSpawnPosition(kingdom: string): { posX: number; posY: number; zone: string } {
  switch (kingdom) {
    case "VILLAGE_A":
      return { posX: 350, posY: 720, zone: "VillageA" };
    case "VILLAGE_B":
      return { posX: 5400, posY: 720, zone: "VillageB" };
    default:
      return { posX: 2600, posY: 700, zone: "NoMansLand" };
  }
}
