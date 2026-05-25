import { useEffect, useState, useRef } from "react";

interface Props {
  enemyName: string;
  onComplete: (timingScore: number) => void;
  onCancel: () => void;
}

export default function CombatBar({ enemyName, onComplete, onCancel }: Props) {
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState(1);
  const [stopped, setStopped] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    animRef.current = setInterval(() => {
      setPosition((prev) => {
        let next = prev + direction * 2;
        if (next >= 100) { setDirection(-1); next = 100; }
        if (next <= 0) { setDirection(1); next = 0; }
        return next;
      });
    }, 20);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(animRef.current!);
          clearInterval(timerRef.current!);
          setStopped(true);
          setTimeout(() => onComplete(0), 400);
        }
        return next;
      });
    }, 1000);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        if (!stopped) {
          setStopped(true);
          clearInterval(animRef.current!);
          clearInterval(timerRef.current!);
          const score = position >= 55 && position <= 85 ? 100 : position >= 35 && position <= 95 ? 70 : 30;
          setTimeout(() => onComplete(score), 400);
        }
      }
      if (e.key === "Escape") {
        clearInterval(animRef.current!);
        clearInterval(timerRef.current!);
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      if (animRef.current) clearInterval(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("keydown", onKeyDown);
    };
  // eslint-disable-next-line
  }, [stopped, direction]);

  const getColor = () => {
    if (position >= 55 && position <= 85) return "#33aa33";
    if (position >= 35 && position <= 95) return "#c9a44b";
    return "#cc3333";
  };

  return (
    <div className="gathering-overlay" style={{ pointerEvents: "auto" }}>
      <div className="gathering-panel" style={{ minWidth: 340 }}>
        <div className="gathering-label" style={{ color: "#ff6644" }}>
          Combattimento contro {enemyName}!
        </div>
        <div className="gathering-bar-track" style={{ height: 24, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: "35%", height: "100%", background: "rgba(201,164,75,0.15)", borderRight: "1px dashed #c9a44b" }} />
          <div style={{ position: "absolute", left: "35%", top: 0, width: "20%", height: "100%", background: "rgba(51,170,51,0.25)", borderLeft: "1px dashed #33aa33", borderRight: "1px dashed #33aa33" }} />
          <div style={{ position: "absolute", left: "55%", top: 0, width: "40%", height: "100%", background: "rgba(201,164,75,0.15)", borderLeft: "1px dashed #c9a44b" }} />
          <div className="gathering-bar-fill" style={{
            position: "absolute",
            left: `${position}%`,
            top: 0,
            width: 4,
            height: "100%",
            background: getColor(),
            boxShadow: `0 0 8px ${getColor()}`,
            transform: "translateX(-50%)",
            transition: stopped ? "none" : "none",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 6 }}>
          <span style={{ color: "#cc3333" }}>Debole</span>
          <span style={{ color: "#c9a44b" }}>Buono</span>
          <span style={{ color: "#33aa33" }}>Perfetto!</span>
          <span style={{ color: "#c9a44b" }}>Buono</span>
          <span style={{ color: "#cc3333" }}>Debole</span>
        </div>
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <span style={{ color: timeLeft <= 2 ? "#ff3333" : "#c9a44b", fontSize: 7 }}>PREMI E ({timeLeft}s)</span>
          <span className="hud-label" style={{ marginLeft: 8 }}>Esc per scappare</span>
        </div>
      </div>
    </div>
  );
}
