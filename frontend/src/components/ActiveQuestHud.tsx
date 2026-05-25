interface ActiveQuest {
  id: number;
  templateId: number;
  progress: number;
  status: string;
  template: {
    buildingName: string;
    resourceLabel: string;
    targetAmount: number;
    goldReward: number;
    itemRewardName: string;
  } | null;
}

interface Props {
  quest: ActiveQuest;
  onClaim: (questId: number) => void;
}

export default function ActiveQuestHud({ quest, onClaim }: Props) {
  const tpl = quest.template;
  if (!tpl) return null;

  const pct = Math.min((quest.progress / tpl.targetAmount) * 100, 100);
  const completed = quest.status === "completed";

  return (
    <div className="hud-panel" style={{ maxWidth: 260 }}>
      <div style={{ fontSize: 7, color: "#c9a44b", marginBottom: 4 }}>
        {tpl.buildingName}
      </div>
      <div style={{ fontSize: 6, color: "#8888aa", marginBottom: 2 }}>
        {tpl.resourceLabel}: {quest.progress}/{tpl.targetAmount}
      </div>
      <div className="hp-bar" style={{ height: 6, marginBottom: 4 }}>
        <div
          className="hp-bar-fill"
          style={{
            width: `${pct}%`,
            background: completed ? "#33aa33" : "#c9a44b",
            height: 6,
          }}
        />
      </div>
      {completed && (
        <div style={{ marginTop: 4 }}>
          <button
            className="success"
            style={{ fontSize: 6, padding: "3px 8px", width: "100%" }}
            onClick={() => onClaim(quest.id)}
          >
            COMPLETA! ({tpl.goldReward} oro + {tpl.itemRewardName})
          </button>
        </div>
      )}
    </div>
  );
}
