import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireUser } from "../auth/middleware";
import { resolveDuel, calculateXpGain, calculateXpLoss } from "./service";
import { logAction } from "../utils/action-log";
import { getSpawnPosition } from "../characters/service";
import { io } from "../sockets";

const router = Router();

const duelSchema = z.object({
  attackerCharacterId: z.number().int().positive(),
  defenderCharacterId: z.number().int().positive(),
});

// POST /api/combat/duel
router.post("/duel", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = duelSchema.parse(req.body);

    // Verifica che l'attaccante appartenga all'utente
    const [attacker, defender] = await Promise.all([
      prisma.character.findUnique({
        where: { id: body.attackerCharacterId },
        include: {
          characterRoles: { include: { role: true } },
          equipment: { include: { item: true } },
        },
      }),
      prisma.character.findUnique({
        where: { id: body.defenderCharacterId },
        include: {
          characterRoles: { include: { role: true } },
          equipment: { include: { item: true } },
        },
      }),
    ]);

    if (!attacker || !defender) {
      res.status(404).json({ error: "Personaggio non trovato" });
      return;
    }
    if (attacker.userId !== req.user!.userId) {
      res.status(403).json({ error: "Non puoi combattere con un personaggio non tuo" });
      return;
    }
    if (attacker.id === defender.id) {
      res.status(400).json({ error: "Non puoi duellare con te stesso" });
      return;
    }
    if (attacker.hp <= 0 || defender.hp <= 0) {
      res.status(400).json({ error: "Uno dei personaggi è già sconfitto" });
      return;
    }

    // Calcola bonus equipaggiamento
    const getEquipmentBonuses = (equip: typeof attacker.equipment) => {
      let atk = 0;
      let def = 0;
      let magicAtk = 0;
      for (const e of equip) {
        const bonuses = JSON.parse(e.item.statBonuses);
        atk += bonuses.atk || 0;
        def += bonuses.def || 0;
        magicAtk += bonuses.magicAtk || 0;
      }
      return { atk, def, magicAtk };
    };

    // Calcola modificatori dei ruoli
    const getRoleMods = (roles: typeof attacker.characterRoles) => {
      let atk = 0;
      let def = 0;
      for (const cr of roles) {
        const mods = JSON.parse(cr.role.statModifiers);
        atk += mods.strength || 0;
        def += mods.agility || 0;
      }
      return { atk, def };
    };

    const attackerEquip = getEquipmentBonuses(attacker.equipment);
    const defenderEquip = getEquipmentBonuses(defender.equipment);
    const attackerRole = getRoleMods(attacker.characterRoles);
    const defenderRole = getRoleMods(defender.characterRoles);

    const result = resolveDuel(
      attacker,
      defender,
      attackerEquip,
      defenderEquip,
      attackerRole,
      defenderRole
    );

    // Applica danni
    if (result.winnerId === 0) {
      // Pareggio
      const newAttackerHp = Math.max(0, attacker.hp - result.damage);
      const newDefenderHp = Math.max(0, defender.hp - result.damage);

      await prisma.character.update({ where: { id: attacker.id }, data: { hp: newAttackerHp } });
      await prisma.character.update({ where: { id: defender.id }, data: { hp: newDefenderHp } });

      await logAction("character", attacker.id, "duel_draw", {
        attackerId: attacker.id,
        defenderId: defender.id,
        damage: result.damage,
      });
    } else {
      const winner = result.winnerId === attacker.id ? attacker : defender;
      const loser = result.loserId === attacker.id ? attacker : defender;

      const newLoserHp = Math.max(0, loser.hp - result.damage);
      let loserData: Record<string, unknown> = { hp: newLoserHp };

      // Se HP <= 0, respawn al villaggio, perdi XP, e il vincitore ti saccheggia
      if (newLoserHp <= 0) {
        const xpLoss = calculateXpLoss(loser.level);
        const spawn = getSpawnPosition(loser.kingdom);
        loserData = {
          hp: 100,
          energy: 100,
          posX: spawn.posX,
          posY: spawn.posY,
          zone: spawn.zone,
          xp: Math.max(0, loser.xp - xpLoss),
        };

        // Saccheggio: trasferisci risorse e oro dal perdente al vincitore
        const [loserInv, winnerInv] = await Promise.all([
          prisma.characterInventory.findUnique({ where: { characterId: loser.id } }),
          prisma.characterInventory.upsert({
            where: { characterId: winner.id },
            update: {},
            create: { characterId: winner.id },
          }),
        ]);

        let lootedResources: Record<string, number> = {};
        let lootedGold = 0;

        if (loserInv) {
          const resources = ["wood", "stone", "fish", "herbs", "meat", "iron"] as const;
          for (const res of resources) {
            const amount = (loserInv as any)[res] || 0;
            if (amount > 0) {
              lootedResources[res] = amount;
              await prisma.characterInventory.update({
                where: { characterId: winner.id },
                data: { [res]: { increment: amount } },
              });
            }
          }

          // Trasferisci oro
          lootedGold = loser.gold || 0;
          await prisma.character.update({
            where: { id: winner.id },
            data: { gold: { increment: lootedGold } },
          });

          // Azzera inventario e oro del perdente
          await prisma.characterInventory.delete({ where: { characterId: loser.id } });
          loserData = { ...loserData, gold: 0 };
        }

        // Notifica socket
        io.emit("character:died", {
          characterId: loser.id,
          characterName: loser.name,
          winnerName: winner.name,
          position: { posX: spawn.posX, posY: spawn.posY, zone: spawn.zone },
        });

        (result as any).lootedResources = lootedResources;
        (result as any).lootedGold = lootedGold;
        (result as any).loserDied = true;
        (result as any).respawnPos = { posX: spawn.posX, posY: spawn.posY, zone: spawn.zone };
      }

      // Vincitore guadagna XP
      const xpGain = calculateXpGain(winner.level, loser.level);

      await Promise.all([
        prisma.character.update({ where: { id: winner.id }, data: { xp: winner.xp + xpGain } }),
        prisma.character.update({ where: { id: loser.id }, data: loserData }),
      ]);

      await logAction("character", winner.id, "duel_win", {
        winnerId: winner.id,
        loserId: loser.id,
        damage: result.damage,
        xpGain,
        winnerScore: result.winnerScore,
        loserScore: result.loserScore,
      });
    }

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("Duel error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/combat/pve — combattimento PvE contro NPC nemico
router.post("/pve", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      characterId: z.number().int().positive(),
      enemyId: z.string().min(1),
      timingScore: z.number().int().min(0).max(100).default(50),
    });
    const { characterId, enemyId, timingScore } = schema.parse(req.body);

    const char = await prisma.character.findUnique({
      where: { id: characterId },
      include: { equipment: { include: { item: true } } },
    });
    if (!char || char.userId !== req.user!.userId) {
      res.status(403).json({ error: "Personaggio non valido" });
      return;
    }
    if (char.hp <= 0) {
      res.status(400).json({ error: "Sei già sconfitto" });
      return;
    }

    const enemyStats: Record<string, { name: string; hp: number; strength: number; agility: number; xpReward: number; goldReward: number }> = {
      bandit_1: { name: "Bandito", hp: 30, strength: 4, agility: 3, xpReward: 15, goldReward: 20 },
      bandit_2: { name: "Bandito", hp: 35, strength: 5, agility: 2, xpReward: 18, goldReward: 25 },
      bandit_3: { name: "Bandito", hp: 25, strength: 3, agility: 4, xpReward: 12, goldReward: 15 },
      raider_north: { name: "Predone del Nord", hp: 40, strength: 6, agility: 3, xpReward: 25, goldReward: 35 },
      raider_south_1: { name: "Predone del Sud", hp: 40, strength: 5, agility: 4, xpReward: 25, goldReward: 35 },
      raider_south_2: { name: "Predone del Sud", hp: 38, strength: 4, agility: 5, xpReward: 22, goldReward: 30 },
    };
    const enemy = enemyStats[enemyId];
    if (!enemy) {
      res.status(400).json({ error: "Nemico non trovato" });
      return;
    }

    if (timingScore >= 70) {
      const damage = Math.max(3, Math.min(20, Math.floor(timingScore * 0.2)));
      await prisma.character.update({
        where: { id: characterId },
        data: { xp: { increment: enemy.xpReward }, gold: { increment: enemy.goldReward } },
      });

      await logAction("character", characterId, "pve_win", { enemyId, timingScore, xpGain: enemy.xpReward });

      res.json({
        winner: char.name,
        loser: enemy.name,
        damage,
        message: `Hai sconfitto ${enemy.name} infliggendo ${Math.round(damage)} danni! +${enemy.xpReward} XP +${enemy.goldReward} oro`,
        xpGain: enemy.xpReward,
        goldGain: enemy.goldReward,
        playerWon: true,
      });
    } else {
      const damage = Math.round((100 - timingScore) / 4);
      const finalDamage = Math.max(3, Math.min(25, damage));
      const newHp = Math.max(0, char.hp - finalDamage);

      const updateData: Record<string, unknown> = { hp: newHp };
      const died = newHp <= 0;
      if (died) {
        updateData.hp = 100;
        updateData.energy = 100;
        updateData.posX = char.kingdom === "VILLAGE_A" ? 150 : 700;
        updateData.posY = 280;
        updateData.zone = char.kingdom === "VILLAGE_A" ? "VillageA" : "VillageB";
      }

      await prisma.character.update({ where: { id: characterId }, data: updateData });

      await logAction("character", characterId, "pve_loss", { enemyId, timingScore, damage: finalDamage });

      res.json({
        winner: enemy.name,
        loser: char.name,
        damage: finalDamage,
        message: `${enemy.name} ti ha colpito per ${finalDamage} danni!`,
        playerWon: false,
        playerDied: died,
      });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Dati non validi", details: err.errors });
      return;
    }
    console.error("PvE error:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
