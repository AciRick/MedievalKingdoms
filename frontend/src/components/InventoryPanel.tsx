import { useEffect, useState } from "react";
import { useAuthStore } from "../auth/store";
import { api } from "../api/client";
import type { Character, Equipment } from "../api/types";

interface InventoryPanelProps {
  visible: boolean;
  onClose: () => void;
}

const SLOT_NAMES: Record<string, string> = {
  weapon: "Arma",
  armor: "Armatura",
  accessory: "Accessorio",
};

export default function InventoryPanel({ visible, onClose }: InventoryPanelProps) {
  const { selectedCharacter } = useAuthStore();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [resources, setResources] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && selectedCharacter) {
      setLoading(true);
      Promise.all([
        api.getCharacter(selectedCharacter.id),
        api.getInventory(selectedCharacter.id),
      ])
        .then(([char, inv]) => {
          setEquipment(char.equipment || []);
          const { characterId, ...res } = inv;
          setResources(res);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible, selectedCharacter]);

  if (!visible) return null;

  const char = selectedCharacter;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="inventory-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose}>X</button>

        <h2 className="panel-title">INVENTARIO</h2>

        {char && (
          <div className="inv-stats">
            <div className="inv-stat-row">
              <span className="hud-label">Nome</span>
              <span className="hud-value">{char.name}</span>
            </div>
            <div className="inv-stat-row">
              <span className="hud-label">Livello</span>
              <span className="hud-value">{char.level}</span>
            </div>
            <div className="inv-stat-row">
              <span className="hud-label">Oro</span>
              <span className="hud-value" style={{ color: "#c9a44b" }}>{char.gold} monete</span>
            </div>
            <div className="inv-stat-row">
              <span className="hud-label">HP</span>
              <span className="hud-value">{char.hp}/100</span>
            </div>
            <div className="inv-stat-row">
              <span className="hud-label">Energia</span>
              <span className="hud-value">{char.energy}/100</span>
            </div>
          </div>
        )}

        <div className="inv-section">
          <h3 className="inv-section-title">EQUIPAGGIAMENTO</h3>
          {loading && <div className="hud-label">Caricamento...</div>}
          {!loading && equipment.length === 0 && (
            <div className="hud-label" style={{ textAlign: "center", padding: "8px 0" }}>
              Nessun equipaggiamento
            </div>
          )}
          {!loading && equipment.map((eq) => (
            <div key={eq.id} className="inv-item">
              <div className="inv-item-icon">
                {eq.slot === "weapon" ? "⚔" : eq.slot === "armor" ? "🛡" : "💍"}
              </div>
              <div className="inv-item-info">
                <div className="inv-item-name">{eq.item.name}</div>
                <div className="inv-item-slot">
                  {SLOT_NAMES[eq.slot] || eq.slot} — {eq.item.type}
                  <span className={`inv-rarity inv-rarity-${eq.item.rarity.toLowerCase()}`}>
                    {eq.item.rarity}
                  </span>
                </div>
                {eq.item.description && (
                  <div className="inv-item-desc">{eq.item.description}</div>
                )}
                {eq.item.statBonuses && (
                  <div className="inv-item-stats">{eq.item.statBonuses}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="inv-section">
          <h3 className="inv-section-title">ATTRIBUTI</h3>
          {char && (
            <div className="inv-attrs">
              <div className="inv-attr">
                <span className="hud-label">Forza</span>
                <span className="hud-value">{char.strength}</span>
              </div>
              <div className="inv-attr">
                <span className="hud-label">Agilità</span>
                <span className="hud-value">{char.agility}</span>
              </div>
              <div className="inv-attr">
                <span className="hud-label">Carisma</span>
                <span className="hud-value">{char.charisma}</span>
              </div>
              <div className="inv-attr">
                <span className="hud-label">Intelletto</span>
                <span className="hud-value">{char.intellect}</span>
              </div>
              <div className="inv-attr">
                <span className="hud-label">Fede</span>
                <span className="hud-value">{char.faith}</span>
              </div>
              <div className="inv-attr">
                <span className="hud-label">Fortuna</span>
                <span className="hud-value">{char.luck}</span>
              </div>
            </div>
          )}
        </div>

        <div className="inv-section">
          <h3 className="inv-section-title">RISORSE</h3>
          {loading ? (
            <div className="hud-label">Caricamento...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>
              {[
                { key: "wood", label: "Legna", icon: "🪵" },
                { key: "stone", label: "Pietra", icon: "🪨" },
                { key: "fish", label: "Pesce", icon: "🐟" },
                { key: "herbs", label: "Erbe", icon: "🌿" },
                { key: "meat", label: "Carne", icon: "🥩" },
                { key: "iron", label: "Ferro", icon: "⛏" },
              ].map((r) => (
                <div key={r.key} className="inv-attr">
                  <span className="hud-label">{r.icon} {r.label}</span>
                  <span className="hud-value">{resources[r.key] || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <span className="hud-label">Premi I per chiudere</span>
        </div>
      </div>
    </div>
  );
}
