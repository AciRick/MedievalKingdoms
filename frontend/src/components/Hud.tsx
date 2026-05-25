import { useAuthStore } from "../auth/store";

export default function Hud() {
  const { selectedCharacter } = useAuthStore();

  if (!selectedCharacter) return null;

  const hpPct = Math.max(0, Math.min(100, selectedCharacter.hp));
  const energyPct = Math.max(0, Math.min(100, selectedCharacter.energy));
  const xpNeeded = selectedCharacter.level * 100;
  const xpPct = Math.min(100, (selectedCharacter.xp / xpNeeded) * 100);

  const zoneNames: Record<string, string> = {
    VillageA: "Villaggio del Nord", VillageB: "Villaggio del Sud",
    NoMansLand: "Terra di Nessuno", Abbey: "Abbazia",
    Forest: "Foresta Oscura", Coast: "Costa Marina",
  };

  return (
    <div>
      <div className="hud-panel">
        <div style={{ color: "#c9a44b", fontSize: 10, marginBottom: 2 }}>
          {selectedCharacter.name}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <span className="hud-label">Lv.{selectedCharacter.level}</span>
          <span className="hud-label" style={{ color: "#c9a44b" }}>{selectedCharacter.gold} oro</span>
        </div>
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
            <span className="hud-label" style={{ fontSize: 5 }}>XP</span>
            <span className="hud-value" style={{ fontSize: 6 }}>{selectedCharacter.xp}/{xpNeeded}</span>
          </div>
          <div className="hp-bar" style={{ height: 4 }}>
            <div className="hp-bar-fill" style={{ width: `${xpPct}%`, background: "#c9a44b", height: 4 }} />
          </div>
        </div>
        <div className="hud-label" style={{ marginTop: 2 }}>
          {selectedCharacter.characterRoles.map((cr) => cr.role.name).join(" / ")}
        </div>
      </div>

      <div className="hud-panel" style={{ marginTop: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span className="hud-label">HP</span>
          <span className="hud-value">{selectedCharacter.hp}/100</span>
        </div>
        <div className="hp-bar"><div className="hp-bar-fill" style={{ width: `${hpPct}%` }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, marginTop: 4 }}>
          <span className="hud-label">Energia</span>
          <span className="hud-value">{selectedCharacter.energy}/100</span>
        </div>
        <div className="hp-bar"><div className="energy-bar-fill" style={{ width: `${energyPct}%` }} /></div>
      </div>

      <div className="hud-panel" style={{ marginTop: 4 }}>
        <span className="hud-label">Zona: </span>
        <span className="hud-value">{zoneNames[selectedCharacter.zone] || selectedCharacter.zone}</span>
      </div>

      {selectedCharacter.isExcommunicated && (
        <div className="hud-panel" style={{ marginTop: 4, borderColor: "#cc3333", color: "#cc3333", fontSize: 8 }}>
          ⛔ SCOMUNICATO
        </div>
      )}
    </div>
  );
}
