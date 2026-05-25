interface CombatResult {
  winnerId: number;
  loserId: number;
  damage: number;
  winnerScore: number;
  loserScore: number;
  message: string;
}

interface CharacterStats {
  id: number;
  name: string;
  strength: number;
  agility: number;
  luck: number;
  hp: number;
  kingdom: string;
  zone: string;
}

interface EquipmentBonuses {
  atk: number;
  def: number;
  magicAtk: number;
}

interface RoleModifiers {
  atk: number;
  def: number;
}

/**
 * Risolve un duello tra due personaggi.
 * Formula:
 *   attackerScore = forza*1.2 + weapon.atk + roleMod.atk + rng(0..10)
 *   defenderScore = agilità + armor.def + roleMod.def + rng(0..10)
 */
export function resolveDuel(
  attacker: CharacterStats,
  defender: CharacterStats,
  attackerEquipment: EquipmentBonuses,
  defenderEquipment: EquipmentBonuses,
  attackerRoleMod: RoleModifiers,
  defenderRoleMod: RoleModifiers
): CombatResult {
  const attackerRoll = Math.floor(Math.random() * 11);
  const defenderRoll = Math.floor(Math.random() * 11);

  const attackerScore =
    attacker.strength * 1.2 +
    attackerEquipment.atk +
    attackerRoleMod.atk +
    attackerRoll +
    Math.floor(attacker.luck * 0.5);

  const defenderScore =
    defender.agility +
    defenderEquipment.def +
    defenderRoleMod.def +
    defenderRoll +
    Math.floor(defender.luck * 0.5);

  if (attackerScore > defenderScore) {
    const diff = attackerScore - defenderScore;
    const damage = Math.max(5, Math.min(50, Math.floor(diff * 1.5)));
    return {
      winnerId: attacker.id,
      loserId: defender.id,
      damage,
      winnerScore: attackerScore,
      loserScore: defenderScore,
      message: `${attacker.name} ha sconfitto ${defender.name} infliggendo ${damage} danni!`,
    };
  } else if (defenderScore > attackerScore) {
    const diff = defenderScore - attackerScore;
    const damage = Math.max(5, Math.min(50, Math.floor(diff * 1.5)));
    return {
      winnerId: defender.id,
      loserId: attacker.id,
      damage,
      winnerScore: defenderScore,
      loserScore: attackerScore,
      message: `${defender.name} ha sconfitto ${attacker.name} infliggendo ${damage} danni!`,
    };
  } else {
    // Pareggio: danno leggero a entrambi
    return {
      winnerId: 0,
      loserId: 0,
      damage: 3,
      winnerScore: attackerScore,
      loserScore: defenderScore,
      message: `Pareggio tra ${attacker.name} e ${defender.name}! Entrambi perdono 3 HP.`,
    };
  }
}

/**
 * Calcola XP guadagnato da una vittoria in base al livello dello sconfitto.
 */
export function calculateXpGain(winnerLevel: number, loserLevel: number): number {
  const baseXp = 20;
  const levelDiff = loserLevel - winnerLevel;
  const bonus = Math.max(0, levelDiff * 5);
  return baseXp + bonus;
}

/**
 * Calcola la penalità XP in caso di morte.
 */
export function calculateXpLoss(level: number): number {
  return Math.floor((level * 10) * 0.1); // 10% dell'XP del livello
}
