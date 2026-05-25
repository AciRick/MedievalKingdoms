import { useEffect, useState } from "react";
import { getSocket } from "../game/socket";

interface FeedEvent {
  type: string;
  message: string;
  timestamp: string;
  durationSec?: number;
  effect?: string;
  endTime?: number;
}

export default function WorldEventsFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<FeedEvent | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (event: FeedEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, 20));
      if (event.durationSec) {
        const end = Date.now() + event.durationSec * 1000;
        setActiveEvent({ ...event, endTime: end });
        setTimeLeft(event.durationSec);
      }
    };

    socket.on("world:event", handler);

    socket.on("world:event-end", () => {
      setActiveEvent(null);
      setTimeLeft(0);
    });

    socket.emit("world:event-status");
    socket.on("world:event-status", (data: { type: string; endTime: number } | null) => {
      if (data) {
        const remaining = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
        setActiveEvent({ type: data.type, message: "", timestamp: "", endTime: data.endTime });
        setTimeLeft(remaining);
      }
    });

    fetch("/api/world/events")
      .then((r) => r.json())
      .then((data: { type: string; payload: Record<string, unknown>; startTime: string }[]) => {
        if (Array.isArray(data)) {
          setEvents(data.map((e) => ({ type: e.type, message: (e.payload as any)?.message || `Evento: ${e.type}`, timestamp: e.startTime })).slice(0, 20));
        }
      }).catch(() => {});

    return () => {
      socket.off("world:event", handler);
      socket.off("world:event-end");
      socket.off("world:event-status");
    };
  }, []);

  useEffect(() => {
    if (!activeEvent || timeLeft <= 0) return;
    const interval = setInterval(() => {
      if (activeEvent.endTime) {
        const left = Math.max(0, Math.floor((activeEvent.endTime - Date.now()) / 1000));
        setTimeLeft(left);
        if (left <= 0) setActiveEvent(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeEvent, timeLeft]);

  const fmt = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, "0")}`; };

  return (
    <div className="hud-panel">
      <div className="panel-title" style={{ fontSize: 7 }}>EVENTI MONDO</div>

      {activeEvent && (
        <div className="event-item" style={{ borderLeftColor: "#ff6644", background: "rgba(255,100,50,0.15)", marginBottom: 4 }}>
          <div style={{ color: "#ff8844", fontWeight: "bold", marginBottom: 2 }}>
            {activeEvent.type === "war" && "⚔️ GUERRA"}
            {activeEvent.type === "famine" && "🍂 CARESTIA"}
            {activeEvent.type === "earthquake" && "🌋 TERREMOTO"}
            {activeEvent.type === "cold_winter" && "❄️ INVERNO RIGIDO"}
            {activeEvent.type === "random_loot" && "🎁 PIOGGIA FORTUNATA"}
          </div>
          {activeEvent.effect && <div style={{ color: "#ccc", marginBottom: 2 }}>{activeEvent.effect}</div>}
          <div style={{ color: "#ff8888" }}>Rimasti: {fmt(timeLeft)}</div>
        </div>
      )}

      <div className="events-feed">
        {events.map((e, i) => (
          <div key={i} className="event-item">{e.message}</div>
        ))}
        {events.length === 0 && !activeEvent && (<div className="event-item" style={{ color: "#8888aa" }}>Nessun evento recente</div>)}
      </div>
    </div>
  );
}
