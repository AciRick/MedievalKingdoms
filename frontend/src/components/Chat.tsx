import { useEffect, useState, useRef, useCallback } from "react";
import { getSocket } from "../game/socket";
import { useAuthStore } from "../auth/store";

interface ChatMsg {
  sender: string;
  message: string;
  channel: string;
  zone?: string;
  timestamp: string;
}

export default function Chat() {
  const { selectedCharacter } = useAuthStore();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [faded, setFaded] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [inputText, setInputText] = useState("");
  const [channel, setChannel] = useState<"all" | "zone" | "whisper">("all");
  const [whisperTarget, setWhisperTarget] = useState("");
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const resetFade = useCallback(() => {
    setFaded(false);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setFaded(true), 10000);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (data: ChatMsg & { characterId?: number }) => {
      setMessages((prev) => [...prev.slice(-49), data]);
      resetFade();
    };

    socket.on("chat:message", handler);
    return () => {
      socket.off("chat:message", handler);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [resetFade]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "'" || e.key === "Dead" || e.code === "Quote") {
        e.preventDefault();
        setShowInput((prev) => !prev);
        return;
      }
      if (e.key === "Escape" && showInput) {
        setShowInput(false);
        setInputText("");
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showInput]);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !selectedCharacter) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit("chat:message", {
      characterId: selectedCharacter.id,
      message: text,
      channel,
      target: channel === "whisper" ? whisperTarget.trim() : undefined,
    });

    setInputText("");
    if (channel === "whisper") setWhisperTarget("");
  };

  const channelLabel = (ch: string) => {
    switch (ch) {
      case "all": return "TUTTI";
      case "zone": return "ZONA";
      case "whisper": return "WHISPER";
      case "whisper_to": return "SUSSURRO";
      default: return ch.toUpperCase();
    }
  };

  return (
    <div className="chat-wrapper">
      <div
        ref={logRef}
        className={`chat-log ${faded ? "faded" : "visible"}`}
      >
        {messages.map((m, i) => (
          <div key={i} className="chat-msg">
            <span className={`sender ${m.sender === "[ADMIN]" ? "admin" : ""}`}>
              {m.sender}
            </span>
            <span className="channel-tag">{channelLabel(m.channel)}</span>
            <span>: {m.message}</span>
          </div>
        ))}
      </div>

      {showInput && (
        <div className="chat-input-row">
          <button
            className={`chat-channel-btn ${channel === "all" ? "active" : ""}`}
            onClick={() => setChannel("all")}
          >
            TUTTI
          </button>
          <button
            className={`chat-channel-btn ${channel === "zone" ? "active" : ""}`}
            onClick={() => setChannel("zone")}
          >
            ZONA
          </button>
          <button
            className={`chat-channel-btn ${channel === "whisper" ? "active" : ""}`}
            onClick={() => setChannel("whisper")}
          >
            WHISPER
          </button>
          {channel === "whisper" && (
            <input
              className="chat-whisper-target"
              placeholder="Nome..."
              value={whisperTarget}
              onChange={(e) => setWhisperTarget(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          )}
          <input
            ref={inputRef}
            className="chat-input"
            type="text"
            placeholder="Scrivi un messaggio..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
              if (e.key === "Escape") {
                setShowInput(false);
                setInputText("");
              }
              e.stopPropagation();
            }}
            maxLength={200}
          />
        </div>
      )}

      {!showInput && (
        <div className="chat-hint">
          Premi <span style={{ color: "#c9a44b" }}>'</span> per aprire la chat
        </div>
      )}
    </div>
  );
}
