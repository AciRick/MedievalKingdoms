import type { AuthResponse, Character, Role, Village, NPC, Treaty, WorldEvent, Zone, CombatResult } from "./types";

const BASE_URL = "/api";

let authToken: string | null = localStorage.getItem("auth_token");

export function setToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
}

export function getToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error("Server non raggiungibile. Assicurati che il backend sia avviato su porta 3001.");
  }

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error("Risposta non valida dal server. Il backend potrebbe essere offline o restituire HTML invece di JSON.");
  }

  if (!res.ok) {
    throw new Error((data.error as string) || `Errore HTTP ${res.status}`);
  }

  return data as T;
}

// Auth
export const api = {
  register: (username: string, password: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<{ id: number; username: string; isAdmin: boolean; createdAt: string }>("/auth/me"),

  // Characters
  listCharacters: () => request<Character[]>("/characters"),

  getCharacter: (id: number) => request<Character>(`/characters/${id}`),

  createCharacter: (data: {
    name: string;
    peopleName: string;
    kingdom: string;
    roleIds: number[];
    strength: number;
    agility: number;
    charisma: number;
    intellect: number;
    faith: number;
    luck: number;
  }) =>
    request<Character>("/characters", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  uploadFace: (characterId: number, file: File) => {
    const formData = new FormData();
    formData.append("face", file);
    return fetch(`${BASE_URL}/characters/${characterId}/face`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    }).then((r) => r.json());
  },

  uploadCry: (characterId: number, file: File) => {
    const formData = new FormData();
    formData.append("cry", file);
    return fetch(`${BASE_URL}/characters/${characterId}/cry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    }).then((r) => r.json());
  },

  // World
  getRoles: () => request<Role[]>("/world/roles"),
  getVillages: () => request<Village[]>("/world/villages"),
  getNpcs: () => request<NPC[]>("/world/npcs"),
  getZones: () => request<Zone[]>("/world/zones"),
  getEvents: () => request<WorldEvent[]>("/world/events"),
  getTreaties: () => request<Treaty[]>("/world/treaties"),
  getActionLog: () => request<{ id: number; actorType: string; actorId: number | null; actionType: string; details: Record<string, unknown>; timestamp: string }[]>("/world/action-log"),

  // Combat
  duel: (attackerCharacterId: number, defenderCharacterId: number) =>
    request<CombatResult>("/combat/duel", {
      method: "POST",
      body: JSON.stringify({ attackerCharacterId, defenderCharacterId }),
    }),

  // Treaties
  proposeTreaty: (characterId: number, type: string, partiesJson: Record<string, boolean>) =>
    request<Treaty>("/treaties/propose", {
      method: "POST",
      body: JSON.stringify({ characterId, type, partiesJson }),
    }),

  approveTreaty: (characterId: number, treatyId: number) =>
    request<Treaty>("/treaties/approve", {
      method: "POST",
      body: JSON.stringify({ characterId, treatyId }),
    }),

  rejectTreaty: (characterId: number, treatyId: number) =>
    request<Treaty>("/treaties/reject", {
      method: "POST",
      body: JSON.stringify({ characterId, treatyId }),
    }),

  // Pope
  excommunicate: (popeCharacterId: number, targetCharacterId: number) =>
    request<{ message: string }>("/pope/excommunicate", {
      method: "POST",
      body: JSON.stringify({ popeCharacterId, targetCharacterId }),
    }),

  pardon: (popeCharacterId: number, targetCharacterId: number) =>
    request<{ message: string }>("/pope/pardon", {
      method: "POST",
      body: JSON.stringify({ popeCharacterId, targetCharacterId }),
    }),

  setPopeCorrupted: (popeCharacterId: number, corrupted: boolean) =>
    request<{ message: string }>("/pope/set-corrupted", {
      method: "POST",
      body: JSON.stringify({ popeCharacterId, corrupted }),
    }),

  getCharactersForPope: () =>
    request<{ id: number; name: string; kingdom: string; isExcommunicated: boolean }[]>("/pope/characters"),

  // Admin
  adminStatus: (adminPassword: string) =>
    request<{ genocideEnabled: boolean; uptime: number }>("/admin/status", {
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
    }),

  triggerEvent: (adminPassword: string, type: string, scope: string = "global") =>
    request<{ message: string }>("/admin/event", {
      method: "POST",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify({ type, scope }),
    }),

  forceExcommunicate: (adminPassword: string, characterId: number) =>
    request<{ message: string }>("/admin/force-excommunicate", {
      method: "POST",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify({ characterId }),
    }),

  forcePardon: (adminPassword: string, characterId: number) =>
    request<{ message: string }>("/admin/force-pardon", {
      method: "POST",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify({ characterId }),
    }),

  toggleGenocide: (adminPassword: string, confirm: boolean) =>
    request<{ genocideEnabled: boolean; message: string }>("/admin/toggle-genocide", {
      method: "POST",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify({ confirm }),
    }),

  getAdminActionLog: (adminPassword: string) =>
    request<{ id: number; actorType: string; actorId: number | null; actionType: string; details: Record<string, unknown>; timestamp: string }[]>("/admin/action-log", {
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
    }),

  getConnectedPlayers: (adminPassword: string) =>
    request<{ count: number; clients: { id: string; characterId: number | null; characterName: string | null; zone: string | null }[] }>("/admin/connected", {
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
    }),

  sendAdminMessage: (adminPassword: string, message: string, type: string = "both") =>
    request<{ message: string }>("/admin/message", {
      method: "POST",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify({ message, type }),
    }),

  getAdminNpcs: (adminPassword: string) =>
    request<{ id: number; name: string; role: string; posX: number; posY: number; zone: string; behaviorType: string }[]>("/admin/npcs", {
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
    }),

  createAdminNpc: (adminPassword: string, data: { name: string; role: string; posX: number; posY: number; zone: string; behaviorType: string }) =>
    request<{ id: number; name: string; role: string; posX: number; posY: number; zone: string; behaviorType: string }>("/admin/npcs", {
      method: "POST",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateAdminNpc: (adminPassword: string, id: number, data: Record<string, unknown>) =>
    request<{ id: number; name: string; role: string; posX: number; posY: number; zone: string; behaviorType: string }>(`/admin/npcs/${id}`, {
      method: "PUT",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteAdminNpc: (adminPassword: string, id: number) =>
    request<{ message: string }>(`/admin/npcs/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
    }),

  getAdminQuests: (adminPassword: string) =>
    request<{ id: number; buildingName: string; resourceName: string; resourceLabel: string; targetAmount: number; gatherTime: number; gatherYield: number; goldReward: number; itemRewardName: string; itemRewardType: string; description: string }[]>("/admin/quests", {
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
    }),

  createAdminQuest: (adminPassword: string, data: { buildingName: string; resourceName: string; resourceLabel: string; targetAmount: number; gatherTime: number; gatherYield: number; goldReward: number; itemRewardName: string; itemRewardType: string; description: string }) =>
    request<{ id: number }>("/admin/quests", {
      method: "POST",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateAdminQuest: (adminPassword: string, id: number, data: Record<string, unknown>) =>
    request<{ id: number }>(`/admin/quests/${id}`, {
      method: "PUT",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteAdminQuest: (adminPassword: string, id: number) =>
    request<{ message: string }>(`/admin/quests/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
    }),

  getAdminZones: (adminPassword: string) =>
    request<{ zone: string; name: string; x: number; y: number; w: number; h: number; floor: string; description: string }[]>("/admin/zones", {
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
    }),

  updateAdminZones: (adminPassword: string, zones: { zone: string; name: string; x: number; y: number; w: number; h: number; floor: string; description: string }[]) =>
    request<{ message: string; zones: unknown[] }>("/admin/zones", {
      method: "PUT",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify(zones),
    }),

  getAdminMagic: (adminPassword: string) =>
    request<{ enabled: boolean; spells: { id: number; name: string; description: string; manaCost: number }[] }>("/admin/magic", {
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
    }),

  updateAdminMagic: (adminPassword: string, enabled: boolean) =>
    request<{ message: string; enabled: boolean }>("/admin/magic", {
      method: "PUT",
      headers: { "X-Admin-Password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    }),

  // Quests
  getAvailableQuests: () =>
    request<{ id: number; buildingName: string; resourceName: string; resourceLabel: string; targetAmount: number; gatherTime: number; gatherYield: number; goldReward: number; itemRewardName: string; itemRewardType: string; description: string }[]>("/quests/available"),

  getMyQuests: (characterId: number) =>
    request<{ id: number; characterId: number; templateId: number; progress: number; status: string; template: { id: number; buildingName: string; resourceName: string; resourceLabel: string; targetAmount: number; gatherTime: number; gatherYield: number; goldReward: number; itemRewardName: string } | null }[]>(`/quests/my?characterId=${characterId}`),

  acceptQuest: (characterId: number, templateId: number) =>
    request<{ id: number; progress: number; status: string; template: Record<string, unknown> | null }>("/quests/accept", {
      method: "POST",
      body: JSON.stringify({ characterId, templateId }),
    }),

  gatherResource: (characterId: number, resourceName: string, amount: number) =>
    request<{ inventory: Record<string, number>; updatedQuests: { id: number; progress: number; completed: boolean; template: Record<string, unknown> }[] }>("/quests/gather", {
      method: "POST",
      body: JSON.stringify({ characterId, resourceName, amount }),
    }),

  claimQuestReward: (characterId: number, questId: number) =>
    request<{ message: string; gold: number; item: string }>("/quests/claim", {
      method: "POST",
      body: JSON.stringify({ characterId, questId }),
    }),

  deliverQuest: (characterId: number, questId: number) =>
    request<{ message: string; questCompleted: boolean }>("/quests/deliver", {
      method: "POST",
      body: JSON.stringify({ characterId, questId }),
    }),

  abandonQuest: (characterId: number, questId: number) =>
    request<{ message: string }>("/quests/abandon", {
      method: "POST",
      body: JSON.stringify({ characterId, questId }),
    }),

  // Inventory
  getInventory: (characterId: number) =>
    request<{ characterId: number; wood: number; stone: number; fish: number; herbs: number; meat: number; iron: number }>(`/inventory/${characterId}`),

  // Shop
  sellResource: (characterId: number, resourceName: string, amount: number, sellPrice: number) =>
    request<{ message: string; goldEarned: number }>("/shop/sell", {
      method: "POST",
      body: JSON.stringify({ characterId, resourceName, amount, sellPrice }),
    }),

  // Combat PvE
  pveCombat: (characterId: number, enemyId: string, timingScore: number = 50) =>
    request<{ message: string; playerWon: boolean; playerDied?: boolean; xpGain?: number; goldGain?: number; damage: number }>("/combat/pve", {
      method: "POST",
      body: JSON.stringify({ characterId, enemyId, timingScore }),
    }),

  // Rest
  restHeal: (characterId: number) =>
    request<{ message: string; healed: number; hp: number }>("/rest", {
      method: "POST",
      body: JSON.stringify({ characterId }),
    }),

  restFree: (characterId: number) =>
    request<{ message: string; healed: number; hp: number }>("/rest/free", {
      method: "POST",
      body: JSON.stringify({ characterId }),
    }),

  caveEnter: (characterId: number) =>
    request<{ message: string; cavePosX: number; cavePosY: number }>("/cave/enter", {
      method: "POST",
      body: JSON.stringify({ characterId }),
    }),

  caveExit: (characterId: number) =>
    request<{ message: string; posX: number; posY: number }>("/cave/exit", {
      method: "POST",
      body: JSON.stringify({ characterId }),
    }),
};
