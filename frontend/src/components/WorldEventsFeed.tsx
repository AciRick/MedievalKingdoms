import { useEffect, useState } from "react";
import { getSocket } from "../game/socket";

interface FeedEvent {
  type: string; message: string; timestamp: string; durationSec?: number; effect?: string; endTime?: number;
}

export default function WorldEventsFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<FeedEvent | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const socket = getSocket(); if (!socket) return;
    const handler = (event: FeedEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, 5));
      if (event.durationSec) { const end = Date.now() + event.durationSec * 1000; setActiveEvent({ ...event, endTime: end }); setTimeLeft(event.durationSec); }
    };
    socket.on("world:event", handler);
    socket.on("world:event-end", () => { setActiveEvent(null); setTimeLeft(0); });
    socket.emit("world:event-status");
    socket.on("world:event-status", (data: { type: string; endTime: number } | null) => {
      if (data) { const r = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000)); setActiveEvent({ type: data.type, message: "", timestamp: "", endTime: data.endTime }); setTimeLeft(r); }
    });
    fetch("/api/world/events").then(r => r.json()).then((d: { type: string; payload: Record<string, unknown>; startTime: string }[]) => {
      if (Array.isArray(d)) setEvents(d.map(e => ({ type: e.type, message: (e.payload as any)?.message || `Evento: ${e.type}`, timestamp: e.startTime })).slice(0, 5));
    }).catch(() => {});
    return () => { socket.off("world:event", handler); socket.off("world:event-end"); socket.off("world:event-status"); };
  }, []);

  useEffect(() => {
    if (!activeEvent || timeLeft <= 0) return;
    const iv = setInterval(() => { if (activeEvent.endTime) { const l = Math.max(0, Math.floor((activeEvent.endTime - Date.now()) / 1000)); setTimeLeft(l); if (l <= 0) setActiveEvent(null); } }, 1000);
    return () => clearInterval(iv);
  }, [activeEvent, timeLeft]);

  const fmt = (s: number) => { const m = Math.floor(s / 60); return `${m}:${(s % 60).toString().padStart(2, "0")}`; };

  return (
    <div className="hud-panel" style={{ maxWidth: 180, padding: "2px 4px" }}>
      {activeEvent && (
        <div style={{ fontSize: 5, color: "#ff6644", marginBottom: 2, borderLeft: "2px solid #ff6644", paddingLeft: 3, background: "rgba(255,100,50,0.1)" }}>
          <span>{activeEvent.effect ? activeEvent.effect.substring(0, 25) + "..." : activeEvent.type}</span>
          <span style={{ color: "#ff8888", marginLeft: 4 }}>{fmt(timeLeft)}</span>
        </div>
      )}
      {!activeEvent && events.length === 0 && (
        <div style={{ fontSize: 5, color: "#666" }}>Nessun evento</div>
      )}
    </div>
  );
}
