// Interfaccia utente
export interface User {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  statModifiers: Record<string, number>;
  allowedEquipmentTypes: string[];
}

export interface Character {
  id: number;
  userId: number;
  name: string;
  peopleName: string;
  kingdom: "VILLAGE_A" | "VILLAGE_B" | "NEUTRAL";
  socialStatus: string;
  level: number;
  xp: number;
  hp: number;
  energy: number;
  reputationVillageA: number;
  reputationVillageB: number;
  isExcommunicated: boolean;
  isBannedUntil: string | null;
  faceImagePath: string | null;
  battleCryAudioPath: string | null;
  posX: number;
  posY: number;
  zone: string;
  gold: number;
  strength: number;
  agility: number;
  charisma: number;
  intellect: number;
  faith: number;
  luck: number;
  isPope: boolean;
  isKing: boolean;
  isPopeCorrupted: boolean;
  createdAt: string;
  characterRoles: CharacterRole[];
  equipment?: Equipment[];
}

export interface CharacterRole {
  characterId: number;
  roleId: number;
  role: Role;
}

export interface Equipment {
  id: number;
  characterId: number;
  itemId: number;
  slot: string;
  item: Item;
}

export interface Item {
  id: number;
  name: string;
  type: string;
  rarity: string;
  requiredRoles: string;
  statBonuses: string;
  description: string;
}

export interface Village {
  id: number;
  name: string;
  description: string;
  kingCharacterId: number | null;
}

export interface NPC {
  id: number;
  name: string;
  role: string;
  posX: number;
  posY: number;
  zone: string;
  behaviorType: string;
}

export interface Treaty {
  id: number;
  type: string;
  partiesJson: Record<string, boolean>;
  status: string;
  createdByCharacterId: number;
  createdBy: { id: number; name: string };
  createdAt: string;
  approvedAt: string | null;
}

export interface WorldEvent {
  id: number;
  type: string;
  scope: string;
  startTime: string;
  endTime: string | null;
  payload: Record<string, unknown>;
}

export interface ActionLogEntry {
  id: number;
  actorType: string;
  actorId: number | null;
  actionType: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface Zone {
  id: string;
  name: string;
  description: string;
}

export interface CombatResult {
  winnerId: number;
  loserId: number;
  damage: number;
  winnerScore: number;
  loserScore: number;
  message: string;
}
