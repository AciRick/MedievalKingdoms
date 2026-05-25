import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ROLES = [
  { name: "Re", description: "Sovrano del villaggio. Comanda e protegge il suo popolo.", statModifiers: { charisma: 2, strength: 1 }, allowedEquipmentTypes: ["WEAPON", "ARMOR"] },
  { name: "Paladino", description: "Guerriero sacro, campione della fede.", statModifiers: { strength: 2, faith: 1 }, allowedEquipmentTypes: ["WEAPON", "ARMOR", "TALISMAN"] },
  { name: "Pescatore", description: "Esperto di mari e fiumi. Sa dove trovare il pesce migliore.", statModifiers: { agility: 1, luck: 1 }, allowedEquipmentTypes: [] },
  { name: "Pirata", description: "Fuorilegge del mare, temuto da tutti.", statModifiers: { agility: 2, luck: 1 }, allowedEquipmentTypes: ["WEAPON"] },
  { name: "Artigiano", description: "Costruisce oggetti e ripara equipaggiamento.", statModifiers: { intellect: 1, agility: 1 }, allowedEquipmentTypes: [] },
  { name: "Chierico", description: "Servo della chiesa, guaritore e guida spirituale.", statModifiers: { faith: 2, intellect: 1 }, allowedEquipmentTypes: ["STAFF", "TALISMAN"] },
  { name: "Fabbro", description: "Forgia armi e armature di qualità.", statModifiers: { strength: 2 }, allowedEquipmentTypes: ["WEAPON"] },
  { name: "Stregone", description: "Maestro delle arti arcane oscure.", statModifiers: { intellect: 3 }, allowedEquipmentTypes: ["STAFF", "TALISMAN"] },
  { name: "Arciere", description: "Tiratore scelto, letale a distanza.", statModifiers: { agility: 2, strength: 1 }, allowedEquipmentTypes: ["RANGED"] },
  { name: "Berserker", description: "Guerriero furioso che combatte senza paura.", statModifiers: { strength: 3 }, allowedEquipmentTypes: ["WEAPON"] },
  { name: "Fante", description: "Soldato di fanteria, spina dorsale dell'esercito.", statModifiers: { strength: 1, agility: 1 }, allowedEquipmentTypes: ["WEAPON", "ARMOR"] },
  { name: "Druido", description: "Custode della natura e della foresta.", statModifiers: { intellect: 1, faith: 2 }, allowedEquipmentTypes: ["STAFF", "TALISMAN"] },
  { name: "Mercenario", description: "Combattente a pagamento, leale solo all'oro.", statModifiers: { strength: 2, agility: 1 }, allowedEquipmentTypes: ["WEAPON", "ARMOR"] },
  { name: "Allevatore", description: "Alleva animali e bestie da compagnia.", statModifiers: { charisma: 1, luck: 1 }, allowedEquipmentTypes: ["PET"] },
  { name: "Papa", description: "Massima autorità religiosa. Può scomunicare e benedire.", statModifiers: { faith: 3, charisma: 1 }, allowedEquipmentTypes: ["STAFF", "TALISMAN"] },
  { name: "Giullare di corte", description: "Intrattiene la corte con scherzi e acrobazie.", statModifiers: { charisma: 2, agility: 1 }, allowedEquipmentTypes: [] },
  { name: "Zoccola", description: "Personaggio ambiguo, sa come ottenere ciò che vuole.", statModifiers: { charisma: 3 }, allowedEquipmentTypes: [] },
  { name: "Sentinella", description: "Guardia vigile, protegge i confini del villaggio.", statModifiers: { agility: 1, strength: 1 }, allowedEquipmentTypes: ["WEAPON", "ARMOR"] },
  { name: "Pazzo", description: "Imprevedibile e caotico, nessuno sa cosa farà.", statModifiers: { luck: 3 }, allowedEquipmentTypes: [] },
  { name: "Mercante", description: "Commercia beni tra i villaggi.", statModifiers: { charisma: 2, intellect: 1 }, allowedEquipmentTypes: [] },
];

const ITEMS = [
  { name: "Spada di ferro", type: "WEAPON", rarity: "common", requiredRoles: ["Paladino", "Berserker", "Fante", "Mercenario", "Re", "Pirata", "Sentinella", "Fabbro"], statBonuses: { atk: 8 }, description: "Una spada affidabile in ferro battuto." },
  { name: "Arco lungo", type: "RANGED", rarity: "common", requiredRoles: ["Arciere"], statBonuses: { atk: 7, range: 3 }, description: "Arco di tasso, preciso e potente." },
  { name: "Bastone del saggio", type: "STAFF", rarity: "common", requiredRoles: ["Stregone", "Chierico", "Druido", "Papa"], statBonuses: { atk: 3, magicAtk: 5 }, description: "Bastone di legno intarsiato con rune." },
  { name: "Armatura di cuoio", type: "ARMOR", rarity: "common", requiredRoles: ["Paladino", "Fante", "Mercenario", "Sentinella", "Re"], statBonuses: { def: 5 }, description: "Corazza di cuoio rinforzato." },
  { name: "Scudo di quercia", type: "ARMOR", rarity: "common", requiredRoles: ["Paladino", "Fante", "Mercenario", "Sentinella", "Re"], statBonuses: { def: 4 }, description: "Scudo robusto in legno di quercia." },
  { name: "Pozione curativa", type: "CONSUMABLE", rarity: "common", requiredRoles: [], statBonuses: { heal: 25 }, description: "Pozione che ripristina 25 HP." },
  { name: "Talismano della fortuna", type: "TALISMAN", rarity: "rare", requiredRoles: ["Paladino", "Chierico", "Stregone", "Druido", "Papa"], statBonuses: { luck: 3 }, description: "Un ciondolo che porta fortuna a chi lo indossa." },
  { name: "Lupo addomesticato", type: "PET", rarity: "rare", requiredRoles: ["Allevatore", "Druido"], statBonuses: { atk: 4, agility: 1 }, description: "Un fedele compagno a quattro zampe." },
  { name: "Spadone a due mani", type: "WEAPON", rarity: "uncommon", requiredRoles: ["Berserker", "Mercenario", "Re"], statBonuses: { atk: 14 }, description: "Una lama enorme che richiede due mani." },
  { name: "Bacchetta del mago", type: "STAFF", rarity: "uncommon", requiredRoles: ["Stregone"], statBonuses: { magicAtk: 8, agility: 1 }, description: "Bacchetta di cristallo che amplifica la magia." },
];

async function main() {
  console.log("🌱 Avvio seed del database...");

  // Pulisci dati esistenti
  await prisma.actionLog.deleteMany();
  await prisma.treaty.deleteMany();
  await prisma.event.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.nPC.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.item.deleteMany();
  await prisma.characterRole.deleteMany();
  await prisma.character.deleteMany();
  await prisma.role.deleteMany();
  await prisma.village.deleteMany();
  await prisma.user.deleteMany();

  // Ruoli
  console.log("   Creazione ruoli...");
  for (const roleData of ROLES) {
    await prisma.role.create({
      data: {
        name: roleData.name,
        description: roleData.description,
        statModifiers: JSON.stringify(roleData.statModifiers),
        allowedEquipmentTypes: JSON.stringify(roleData.allowedEquipmentTypes),
      },
    });
  }

  // Villaggi
  console.log("   Creazione villaggi...");
  await prisma.village.create({
    data: { name: "Villaggio del Nord", description: "Un prospero villaggio sulle colline settentrionali, noto per le sue mura di pietra e il coraggio dei suoi abitanti." },
  });
  await prisma.village.create({
    data: { name: "Villaggio del Sud", description: "Villaggio costiero del sud, ricco di commerci marittimi e famoso per i suoi cantieri navali." },
  });

  // Admin user
  console.log("   Creazione utente admin...");
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: { username: "admin", passwordHash: adminHash, isAdmin: true },
  });

  // Utente sistema per NPC
  const systemHash = await bcrypt.hash("system-npc-no-login", 10);
  const systemUser = await prisma.user.create({
    data: { username: "_system_npc", passwordHash: systemHash, isAdmin: false },
  });

  // Personaggio Papa
  console.log("   Creazione Papa...");
  const popeRole = await prisma.role.findFirst({ where: { name: "Papa" } });
  const popeChar = await prisma.character.create({
    data: {
      userId: systemUser.id,
      name: "Sua Santità Clemente VII",
      peopleName: "Clan Papale",
      kingdom: "NEUTRAL",
      socialStatus: "Papa",
      level: 20,
      hp: 200,
      energy: 200,
      posX: 400,
      posY: 80,
      zone: "Abbey",
      strength: 5,
      agility: 5,
      charisma: 10,
      intellect: 10,
      faith: 15,
      luck: 5,
      isPope: true,
    },
  });
  if (popeRole) {
    await prisma.characterRole.create({
      data: { characterId: popeChar.id, roleId: popeRole.id },
    });
  }

  // Re del Nord
  console.log("   Creazione Re del Nord...");
  const reRole = await prisma.role.findFirst({ where: { name: "Re" } });
  const kingNorth = await prisma.character.create({
    data: {
      userId: systemUser.id,
      name: "Re Aldric del Nord",
      peopleName: "Casata del Nord",
      kingdom: "VILLAGE_A",
      socialStatus: "Re",
      level: 15,
      hp: 160,
      energy: 160,
      posX: 100,
      posY: 300,
      zone: "VillageA",
      strength: 10,
      agility: 6,
      charisma: 8,
      intellect: 7,
      faith: 5,
      luck: 4,
      isKing: true,
    },
  });
  if (reRole) {
    await prisma.characterRole.create({
      data: { characterId: kingNorth.id, roleId: reRole.id },
    });
  }

  // Re del Sud
  console.log("   Creazione Re del Sud...");
  const kingSouth = await prisma.character.create({
    data: {
      userId: systemUser.id,
      name: "Regina Isabella del Sud",
      peopleName: "Casata del Sud",
      kingdom: "VILLAGE_B",
      socialStatus: "Regina",
      level: 15,
      hp: 160,
      energy: 160,
      posX: 750,
      posY: 300,
      zone: "VillageB",
      strength: 6,
      agility: 8,
      charisma: 10,
      intellect: 7,
      faith: 5,
      luck: 4,
      isKing: true,
    },
  });
  if (reRole) {
    await prisma.characterRole.create({
      data: { characterId: kingSouth.id, roleId: reRole.id },
    });
  }

  // NPC erranti
  console.log("   Creazione PNG...");
  const npcs = [
    { name: "Mastro Tobia", role: "Mercante", posX: 250, posY: 300, zone: "NoMansLand", behaviorType: "wander" },
    { name: "Guardia Bruno", role: "Guardia", posX: 120, posY: 350, zone: "VillageA", behaviorType: "guard" },
    { name: "Vecchio Marinaio", role: "Pescatore", posX: 700, posY: 500, zone: "Coast", behaviorType: "idle" },
    { name: "Saggio della Foresta", role: "Druido", posX: 200, posY: 500, zone: "Forest", behaviorType: "wander" },
    { name: "Fabbro Armanno", role: "Fabbro", posX: 650, posY: 350, zone: "VillageB", behaviorType: "idle" },
    { name: "Il Matto Ghiribizzo", role: "Giullare di corte", posX: 400, posY: 300, zone: "NoMansLand", behaviorType: "wander" },
  ];
  for (const npc of npcs) {
    await prisma.nPC.create({ data: npc });
  }

  // Oggetti starter
  console.log("   Creazione oggetti...");
  for (const item of ITEMS) {
    await prisma.item.create({
      data: {
        ...item,
        requiredRoles: JSON.stringify(item.requiredRoles),
        statBonuses: JSON.stringify(item.statBonuses),
      },
    });
  }

  // Quest di esempio
  console.log("   Creazione quest...");
  await prisma.quest.create({
    data: {
      description: "Consegna un messaggio al Re del Nord.",
      requirements: JSON.stringify({ deliverTo: "KingNorth", item: "letter" }),
      rewardXp: 75,
      rewardGold: 15,
      rewardItems: JSON.stringify([]),
    },
  });
  await prisma.quest.create({
    data: {
      description: "Sconfiggi 3 lupi nella foresta.",
      requirements: JSON.stringify({ killType: "wolf", count: 3, zone: "Forest" }),
      rewardXp: 120,
      rewardGold: 25,
      rewardItems: JSON.stringify([1]), // Spada di ferro
    },
  });

  // Trattato di esempio
  console.log("   Creazione trattato di esempio...");
  await prisma.treaty.create({
    data: {
      type: "PEACE",
      partiesJson: JSON.stringify({ "Villaggio del Nord": true, "Villaggio del Sud": true }),
      status: "PROPOSED",
      createdByCharacterId: kingNorth.id,
    },
  });

  console.log("✅ Seed completato con successo!");
}

main()
  .catch((e) => {
    console.error("❌ Errore durante il seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
