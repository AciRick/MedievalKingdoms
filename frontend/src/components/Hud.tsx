import { useAuthStore } from "../auth/store";

export default function Hud() {
  const { selectedCharacter } = useAuthStore();
  if (!selectedCharacter) return null;

  const hpPct = Math.max(0, Math.min(100, selectedCharacter.hp));
  const energyPct = Math.max(0, Math.min(100, selectedCharacter.energy));
  const xpNeeded = selectedCharacter.level * 100;
  const xpPct = Math.min(100, (selectedCharacter.xp / xpNeeded) * 100);

  return (
    <div>
      <div className="hud-panel" style={{ minWidth: 160, maxWidth: 200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <span style={{ color: "#c9a44b", fontSize: 8 }}>{selectedCharacter.name}</span>
          <span style={{ fontSize: 6, color: "#8888aa" }}>Lv.{selectedCharacter.level}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1, fontSize: 6 }}>
          <span className="hud-label" style={{ fontSize: 5 }}>XP {selectedCharacter.xp}/{xpNeeded}</span>
          <span style={{ color: "#c9a44b", fontSize: 5 }}>{selectedCharacter.gold} oro</span>
        </div>
        <div className="hp-bar" style={{ height: 3, marginBottom: 3 }}>
          <div className="hp-bar-fill" style={{ width: `${xpPct}%`, background: "#c9a44b", height: 3 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 6 }}>
          <span className="hud-label" style={{ fontSize: 5 }}>HP {selectedCharacter.hp}/100</span>
          <span className="hud-label" style={{ fontSize: 5 }}>EN {selectedCharacter.energy}/100</span>
        </div>
        <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
          <div className="hp-bar" style={{ flex: 1 }}>
            <div className="hp-bar-fill" style={{ width: `${hpPct}%`, height: 3 }} />
          </div>
          <div className="hp-bar" style={{ flex: 1 }}>
            <div className="energy-bar-fill" style={{ width: `${energyPct}%`, height: 3 }} />
          </div>
        </div>
      </div>
      {selectedCharacter.isExcommunicated && (
        <div className="hud-panel" style={{ marginTop: 2, borderColor: "#cc3333", color: "#cc3333", fontSize: 6, padding: "2px 6px" }}>⛔ SCOMUNICATO</div>
      )}
    </div>
  );
}
