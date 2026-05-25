interface QuestTemplate {
  id: number;
  buildingName: string;
  resourceName: string;
  resourceLabel: string;
  targetAmount: number;
  gatherTime: number;
  gatherYield: number;
  goldReward: number;
  itemRewardName: string;
  itemRewardType: string;
  description: string;
}

interface Props {
  quest: QuestTemplate;
  onAccept: () => void;
  onRefuse: () => void;
}

export default function QuestOffer({ quest, onAccept, onRefuse }: Props) {
  return (
    <div className="modal-overlay" onClick={onRefuse}>
      <div className="npc-dialog-panel" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
        <button className="close-btn" onClick={onRefuse}>X</button>
        <h2 className="panel-title" style={{ color: "#c9a44b", marginBottom: 8 }}>
          {quest.buildingName}
        </h2>
        <p style={{ fontSize: 8, lineHeight: 2, color: "#e0e0e0", marginBottom: 12 }}>
          {quest.description}
        </p>
        <div className="quest-details">
          <div className="quest-detail-row">
            <span className="hud-label">Risorsa</span>
            <span style={{ color: "#c9a44b" }}>{quest.resourceLabel}</span>
          </div>
          <div className="quest-detail-row">
            <span className="hud-label">Quantità</span>
            <span style={{ color: "#c9a44b" }}>{quest.targetAmount}</span>
          </div>
          <div className="quest-detail-row">
            <span className="hud-label">Tempo raccolta</span>
            <span style={{ color: "#8888aa" }}>{quest.gatherTime}s per ciclo</span>
          </div>
          <div className="quest-detail-row">
            <span className="hud-label">Resa per ciclo</span>
            <span style={{ color: "#8888aa" }}>+{quest.gatherYield} {quest.resourceLabel}</span>
          </div>
          <div className="quest-detail-row">
            <span className="hud-label">Ricompensa</span>
            <span style={{ color: "#33aa33" }}>{quest.goldReward} oro + {quest.itemRewardName}</span>
          </div>
        </div>
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="success" onClick={onAccept}>
            ACCETTA QUEST
          </button>
          <button onClick={onRefuse}>
            RIFIUTA
          </button>
        </div>
      </div>
    </div>
  );
}
