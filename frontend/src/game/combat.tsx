import { useState } from "react";
import { useAuthStore } from "../auth/store";
import { api } from "../api/client";

interface DuelModalProps {
  targetId: number;
  targetName: string;
  onClose: () => void;
}

export function DuelModal({ targetId, targetName, onClose }: DuelModalProps) {
  const { selectedCharacter } = useAuthStore();
  const [result, setResult] = useState<string | null>(null);
  const [lootDetails, setLootDetails] = useState<{ gold: number; resources: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDuel = async () => {
    if (!selectedCharacter) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.duel(selectedCharacter.id, targetId);
      setResult(res.message);
      const loot = (res as any).lootedResources;
      const gold = (res as any).lootedGold;
      if (loot || gold) {
        setLootDetails({ gold: gold || 0, resources: loot || {} });
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>SFIDA A DUELLO</h2>
        <p style={{ fontSize: 8, textAlign: "center", marginBottom: 12 }}>
          Vuoi sfidare <strong>{targetName}</strong> a duello?
        </p>

        {result ? (
          <div>
            <p className="success-text" style={{ textAlign: "center", marginBottom: 12 }}>
              {result}
            </p>
            {lootDetails && (lootDetails.gold > 0 || Object.values(lootDetails.resources).some((v) => v > 0)) && (
              <div className="inv-section" style={{ marginBottom: 12 }}>
                <h3 className="inv-section-title" style={{ fontSize: 7 }}>BOTTINO</h3>
                {lootDetails.gold > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7, padding: "2px 4px" }}>
                    <span>Oro</span>
                    <span style={{ color: "#c9a44b" }}>+{lootDetails.gold}</span>
                  </div>
                )}
                {Object.entries(lootDetails.resources).map(([key, val]) => (
                  val > 0 && (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 7, padding: "2px 4px" }}>
                      <span>{key}</span>
                      <span style={{ color: "#33aa33" }}>+{val}</span>
                    </div>
                  )
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button onClick={onClose}>CHIUDI</button>
            </div>
          </div>
        ) : (
          <div>
            {error && <p className="error-text">{error}</p>}
            <div className="modal-actions">
              <button onClick={onClose}>ANNULLA</button>
              <button className="danger" onClick={handleDuel} disabled={loading}>
                {loading ? "COMBATTIMENTO..." : "SFIDA!"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
