import { useEffect, useState } from "react";

interface Props {
  resourceLabel: string;
  gatherTime: number;
  onComplete: () => void;
  onCancel: () => void;
}

export default function GatheringBar({ resourceLabel, gatherTime, onComplete, onCancel }: Props) {
  const [progress, setProgress] = useState(0);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const totalMs = gatherTime * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalMs) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
      }
    }, 50);

    const timer = setTimeout(() => {
      if (!cancelled) {
        onComplete();
      }
    }, totalMs);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCancelled(true);
        clearTimeout(timer);
        clearInterval(interval);
        window.dispatchEvent(new CustomEvent("phaser:gathering-cancel"));
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [gatherTime, onComplete, onCancel, cancelled]);

  return (
    <div className="gathering-overlay">
      <div className="gathering-panel">
        <div className="gathering-label">
          Raccolta {resourceLabel} in corso...
        </div>
        <div className="gathering-bar-track">
          <div
            className="gathering-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div style={{ textAlign: "center" }}>
          <span className="hud-label">Premi Esc per annullare</span>
        </div>
      </div>
    </div>
  );
}
