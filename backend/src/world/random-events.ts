import { prisma } from "../db";
import { io } from "../sockets";

interface WorldItem {
  id: number;
  itemId: number;
  posX: number;
  posY: number;
  name: string;
  type: string;
  bonuses: string;
  expiresAt: number;
}

let nextItemId = 1;
const worldItems: Map<number, WorldItem> = new Map();

const MAP_WIDTH = 72;
const MAP_HEIGHT = 36;
const TILE = 32;

const eventTypes = ["war", "famine", "earthquake", "cold_winter", "random_loot"] as const;

const eventMessages: Record<string, string> = {
  war: "⚔️ Soffiano venti di guerra tra i villaggi!",
  famine: "🍂 Una terribile carestia colpisce la regione!",
  earthquake: "🌋 Un terremoto fa tremare la terra!",
  cold_winter: "❄️ Un inverno gelido si abbatte sul regno!",
  random_loot: "🎁 Una pioggia fortunata fa cadere equipaggiamento dal cielo!",
};

const eventDurations: Record<string, number> = {
  war: 120,
  famine: 90,
  earthquake: 60,
  cold_winter: 90,
  random_loot: 90,
};

const eventEffects: Record<string, string> = {
  war: "Fazioni opposte si attaccano ovunque nella mappa",
  famine: "Raccolta risorse ridotta del 50%",
  earthquake: "Movimento rallentato a 80px/s",
  cold_winter: "Danno 5 HP ogni 15 secondi fuori dagli edifici",
  random_loot: "4-8 item raccoglibili nella Terra di Nessuno",
};

const itemTemplates = [
  { name: "Spada d'Acciaio", type: "WEAPON", bonuses: JSON.stringify({ atk: 12 }) },
  { name: "Arco da Caccia", type: "RANGED", bonuses: JSON.stringify({ atk: 9, range: 3 }) },
  { name: "Scudo di Ferro", type: "ARMOR", bonuses: JSON.stringify({ def: 8 }) },
  { name: "Pozione Rigenerante", type: "CONSUMABLE", bonuses: JSON.stringify({ heal: 30 }) },
  { name: "Anello del Guerriero", type: "TALISMAN", bonuses: JSON.stringify({ atk: 4, def: 2 }) },
  { name: "Bastone Arcano", type: "STAFF", bonuses: JSON.stringify({ magicAtk: 10 }) },
  { name: "Elmo del Nord", type: "ARMOR", bonuses: JSON.stringify({ def: 6 }) },
  { name: "Pugnale Avvelenato", type: "WEAPON", bonuses: JSON.stringify({ atk: 7, agility: 2 }) },
];

let currentEvent: { type: string; endTime: number } | null = null;

function spawnLootItems(): void {
  const count = 4 + Math.floor(Math.random() * 5);
  const now = Date.now();

  const noMansX = 22 * TILE + 40;
  const noMansW = 28 * TILE - 80;
  const noMansY = 6 * TILE + 40;
  const noMansH = 16 * TILE - 80;

  for (let i = 0; i < count; i++) {
    const tpl = itemTemplates[Math.floor(Math.random() * itemTemplates.length)];
    const id = nextItemId++;
    const posX = Math.round(noMansX + Math.random() * noMansW);
    const posY = Math.round(noMansY + Math.random() * noMansH);

    const item: WorldItem = {
      id,
      itemId: 0,
      posX,
      posY,
      name: tpl.name,
      type: tpl.type,
      bonuses: tpl.bonuses,
      expiresAt: now + 180000,
    };

    worldItems.set(id, item);
    io.emit("world:item-spawned", { id, posX, posY, name: tpl.name, type: tpl.type });
  }
}

async function triggerRandomEvent(): Promise<void> {
  const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const durationSec = eventDurations[event];
  const now = Date.now();

  currentEvent = { type: event, endTime: now + durationSec * 1000 };

  await prisma.event.create({
    data: {
      type: event,
      scope: "global",
      payload: JSON.stringify({ triggered: "random", durationSec }),
    },
  });

  if (event === "random_loot") {
    spawnLootItems();
  }

  io.emit("world:event", {
    type: event,
    message: eventMessages[event],
    timestamp: new Date().toISOString(),
    durationSec,
    effect: eventEffects[event],
  });

  setTimeout(() => {
    currentEvent = null;
    io.emit("world:event-end", { type: event });
  }, durationSec * 1000);
}

export function getCurrentEvent(): { type: string; endTime: number } | null {
  return currentEvent;
}

export function startRandomEvents(): void {
  const scheduleNext = () => {
    const delay = 900000 + Math.random() * 300000; // 15-20 minuti
    setTimeout(() => {
      triggerRandomEvent();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
  console.log("Random world events started (4-8 min interval)");
}

export function getWorldItems(): WorldItem[] {
  const now = Date.now();
  for (const [id, item] of worldItems) {
    if (now > item.expiresAt) {
      worldItems.delete(id);
    }
  }
  return Array.from(worldItems.values());
}

export async function collectItem(characterId: number, itemId: number): Promise<{ collected: boolean; item?: WorldItem }> {
  const item = worldItems.get(itemId);
  if (!item || Date.now() > item.expiresAt) return { collected: false };

  worldItems.delete(itemId);

  let dbItem = await prisma.item.findFirst({ where: { name: item.name } });
  if (!dbItem) {
    dbItem = await prisma.item.create({
      data: {
        name: item.name,
        type: item.type,
        rarity: "raro",
        requiredRoles: "[]",
        statBonuses: item.bonuses,
        description: "Ottenuto da una pioggia fortunata",
      },
    });
  }

  const slot = item.type === "WEAPON" || item.type === "STAFF" ? "main_hand"
    : item.type === "ARMOR" ? "body" : "accessory";

  await prisma.equipment.create({
    data: { characterId, itemId: dbItem.id, slot },
  });

  io.emit("world:item-collected", { itemId, characterId });

  return { collected: true, item };
}
