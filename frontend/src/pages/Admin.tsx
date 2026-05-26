import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import WorldEditor from "../components/WorldEditor";

interface NpcRow {
  id: number; name: string; role: string; posX: number; posY: number; zone: string; behaviorType: string;
}
interface QuestRow {
  id: number; buildingName: string; resourceName: string; resourceLabel: string; targetAmount: number; gatherTime: number; gatherYield: number; goldReward: number; itemRewardName: string; itemRewardType: string; description: string;
}
interface ZoneRow {
  zone: string; name: string; x: number; y: number; w: number; h: number; floor: string; description: string;
}
interface Spell { id: number; name: string; description: string; manaCost: number; }

export default function Admin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmGenocide, setConfirmGenocide] = useState(0);
  const [genocideEnabled, setGenocideEnabled] = useState(false);
  const [actionLog, setActionLog] = useState<{ id: number; actionType: string; details: Record<string, unknown>; timestamp: string }[]>([]);
  const [connectedPlayers, setConnectedPlayers] = useState<{ count: number; clients: { id: string; characterName: string | null; zone: string | null }[] }>({ count: 0, clients: [] });

  const [adminMessage, setAdminMessage] = useState("");
  const [messageType, setMessageType] = useState<"chat" | "overlay" | "both">("both");

  const [npcs, setNpcs] = useState<NpcRow[]>([]);
  const [npcForm, setNpcForm] = useState<Partial<NpcRow>>({});
  const [editingNpcId, setEditingNpcId] = useState<number | null>(null);

  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [questForm, setQuestForm] = useState({ buildingName: "", resourceName: "wood", resourceLabel: "", targetAmount: 10, gatherTime: 4, gatherYield: 1, goldReward: 50, itemRewardName: "", itemRewardType: "WEAPON", description: "" });
  const [editingQuestId, setEditingQuestId] = useState<number | null>(null);

  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [zoneForm, setZoneForm] = useState<ZoneRow | null>(null);

  const [magicEnabled, setMagicEnabled] = useState(false);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [showWorldEditor, setShowWorldEditor] = useState(false);
  const [customTiles, setCustomTiles] = useState<{ col: number; row: number; key: string }[]>([]);
  const [backups, setBackups] = useState<{ key: string; timestamp: number; tiles: { col: number; row: number; key: string }[] }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleAuth = async () => {
    setError("");
    try {
      const status = await api.adminStatus(password);
      setGenocideEnabled(status.genocideEnabled);
      setAuthed(true);
      setMsg("Autenticazione admin riuscita!");
      await loadAllData();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const loadAllData = async () => {
    try {
      const [logs, players, npcList, questList, zoneList, magic, ct] = await Promise.all([
        api.getAdminActionLog(password),
        api.getConnectedPlayers(password),
        api.getAdminNpcs(password),
        api.getAdminQuests(password),
        api.getAdminZones(password),
        api.getAdminMagic(password),
        api.getCustomTiles(password),
      ]);
      setActionLog(logs.slice(0, 50));
      setConnectedPlayers(players);
      setNpcs(npcList);
      setQuests(questList);
      setZones(zoneList);
      setMagicEnabled(magic.enabled);
      setSpells(magic.spells);
      setCustomTiles(Array.isArray(ct) ? ct : []);
    } catch { /* ignore */ }
  };

  const loadData = async () => {
    try {
      const [logs, players] = await Promise.all([
        api.getAdminActionLog(password),
        api.getConnectedPlayers(password),
      ]);
      setActionLog(logs.slice(0, 50));
      setConnectedPlayers(players);
    } catch { /* ignore */ }
  };

  const handleEvent = async (type: string) => {
    try {
      const res = await api.triggerEvent(password, type);
      setMsg(res.message);
      await loadData();
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleToggleGenocide = async () => {
    if (confirmGenocide < 2) { setConfirmGenocide((c) => c + 1); return; }
    try {
      const res = await api.toggleGenocide(password, true);
      setGenocideEnabled(res.genocideEnabled);
      setMsg(res.message);
      setConfirmGenocide(0);
      await loadData();
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleSendMessage = async () => {
    if (!adminMessage.trim()) return;
    try {
      const res = await api.sendAdminMessage(password, adminMessage.trim(), messageType);
      setMsg(res.message);
      setAdminMessage("");
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleSaveNpc = async () => {
    try {
      if (editingNpcId) {
        await api.updateAdminNpc(password, editingNpcId, npcForm);
      } else {
        await api.createAdminNpc(password, npcForm as any);
      }
      setNpcForm({});
      setEditingNpcId(null);
      await loadAllData();
      setMsg("NPC salvato!");
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleDeleteNpc = async (id: number) => {
    try {
      await api.deleteAdminNpc(password, id);
      await loadAllData();
      setMsg("NPC eliminato");
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleEditNpc = (npc: NpcRow) => {
    setNpcForm(npc);
    setEditingNpcId(npc.id);
  };

  const handleSaveQuest = async () => {
    try {
      if (editingQuestId) {
        await api.updateAdminQuest(password, editingQuestId, questForm as any);
      } else {
        await api.createAdminQuest(password, questForm as any);
      }
      setQuestForm({ buildingName: "", resourceName: "wood", resourceLabel: "", targetAmount: 10, gatherTime: 4, gatherYield: 1, goldReward: 50, itemRewardName: "", itemRewardType: "WEAPON", description: "" });
      setEditingQuestId(null);
      await loadAllData();
      setMsg("Quest salvata!");
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleDeleteQuest = async (id: number) => {
    try {
      await api.deleteAdminQuest(password, id);
      await loadAllData();
      setMsg("Quest eliminata");
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleEditQuest = (q: QuestRow) => {
    setQuestForm({
      buildingName: q.buildingName,
      resourceName: q.resourceName,
      resourceLabel: q.resourceLabel,
      targetAmount: q.targetAmount,
      gatherTime: q.gatherTime,
      gatherYield: q.gatherYield,
      goldReward: q.goldReward,
      itemRewardName: q.itemRewardName,
      itemRewardType: q.itemRewardType,
      description: q.description,
    });
    setEditingQuestId(q.id);
  };

  const handleSaveZones = async () => {
    try {
      await api.updateAdminZones(password, zones);
      setZoneForm(null);
      setMsg("Zone aggiornate!");
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleToggleMagic = async () => {
    try {
      const res = await api.updateAdminMagic(password, !magicEnabled);
      setMagicEnabled(res.enabled);
      setMsg(res.message);
      await loadAllData();
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleSaveWorldTiles = async (tiles: { col: number; row: number; key: string }[]) => {
    try {
      await api.saveCustomTiles(password, tiles);
      setCustomTiles(tiles);
      setShowWorldEditor(false);
      setMsg("Mappa salvata! I giocatori vedranno le modifiche.");
      await loadBackups();
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const loadBackups = async () => {
    try {
      const b = await api.getCustomTileBackups(password);
      setBackups(b);
    } catch {}
  };

  const handleRestoreBackup = async (key: string) => {
    try {
      const r = await api.restoreCustomTileBackup(password, key);
      setMsg(r.message);
      await loadAllData();
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const drawWorldMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || zones.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = 3;
    const zoneColors: Record<string, string> = {
      VillageA: "#4a8", VillageB: "#48a", NoMansLand: "#864",
      Abbey: "#aaf", Forest: "#484", Coast: "#4aa",
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const z of zones) {
      ctx.fillStyle = zoneColors[z.zone] || "#666";
      ctx.fillRect(z.x * scale, z.y * scale, z.w * scale, z.h * scale);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(z.x * scale, z.y * scale, z.w * scale, z.h * scale);
      ctx.fillStyle = "#ffffff";
      ctx.font = "5px 'Press Start 2P'";
      ctx.fillText(z.name, z.x * scale + 2, z.y * scale + 8);
    }

    ctx.fillStyle = "#ff0";
    for (const n of npcs) {
      ctx.fillRect(n.posX / 32 * scale - 1, n.posY / 32 * scale - 1, 3, 3);
    }
  }, [zones, npcs]);

  useEffect(() => {
    if (authed) drawWorldMap();
  }, [authed, drawWorldMap]);

  if (!authed) {
    return (
      <div className="page">
        <div className="page-card">
          <h2 className="page-title">PANNELLO ADMIN</h2>
          <div className="form-group">
            <label>Password Admin</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAuth()} autoFocus />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button onClick={handleAuth} style={{ width: "100%" }}>ACCEDI</button>

          <p style={{ marginTop: 8, textAlign: "center" }}>
            <span className="link" onClick={() => navigate("/login")}>&lt;&lt; INDIETRO</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="page">
      <div className="page-card dashboard" style={{ maxWidth: 900, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 className="page-title">PANNELLO ADMIN</h2>
        {error && <p className="error-text">{error}</p>}
        {msg && <p className="success-text">{msg}</p>}

        {/* Messaggio Globale */}
        <div className="section">
          <h3>MESSAGGIO GLOBALE</h3>
          <textarea
            value={adminMessage}
            onChange={(e) => setAdminMessage(e.target.value)}
            placeholder="Scrivi un messaggio per tutti i giocatori..."
            style={{ width: "100%", height: 50, fontSize: 7, resize: "vertical" }}
            maxLength={500}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
          />
          <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
            <select value={messageType} onChange={(e) => setMessageType(e.target.value as any)} style={{ fontSize: 7 }}>
              <option value="both">Chat + Overlay</option>
              <option value="chat">Solo Chat</option>
              <option value="overlay">Solo Overlay</option>
            </select>
            <button onClick={handleSendMessage} style={{ flex: 1, fontSize: 7 }}>INVIA A TUTTI</button>
          </div>
        </div>

        {/* Modifica Mondo */}
        <div className="section">
          <h3>MODIFICA MONDO</h3>
          <button onClick={() => setShowWorldEditor(true)} style={{ width: "100%", fontSize: 8, padding: "10px 0" }}>
            APRI EDITOR MAPPA
          </button>
          <p style={{ fontSize: 6, color: "#8888aa", marginTop: 4 }}>{customTiles.length} tile personalizzati piazzati</p>
        </div>

        <div className="section">
          <h3>BACKUP MAPPA</h3>
          <button onClick={loadBackups} style={{ width: "100%", fontSize: 7, marginBottom: 4 }}>CARICA BACKUP</button>
          {backups.length === 0 && <p style={{ fontSize: 6, color: "#8888aa" }}>Nessun backup trovato</p>}
          {backups.map(b => (
            <div key={b.key} className="list-item" style={{ fontSize: 6 }}>
              <span>{new Date(b.timestamp).toLocaleString()} — {b.tiles.length} tile</span>
              <button className="admin-mini-btn edit" onClick={() => handleRestoreBackup(b.key)}>RIPRISTINA</button>
            </div>
          ))}
        </div>

        {/* Eventi Globali */}
        <div className="section">
          <h3>EVENTI GLOBALI</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            <button onClick={() => handleEvent("war")} style={{ fontSize: 7 }}>GUERRA</button>
            <button onClick={() => handleEvent("famine")} style={{ fontSize: 7 }}>CARESTIA</button>
            <button onClick={() => handleEvent("earthquake")} style={{ fontSize: 7 }}>TERREMOTO</button>
            <button onClick={() => handleEvent("cold_winter")} style={{ fontSize: 7 }}>INVERNO</button>
            <button onClick={() => handleEvent("random_loot")} style={{ fontSize: 7 }}>BOTTINO</button>
          </div>
        </div>

        <div className="admin-section-grid">
          {/* Genocidio */}
          <div className="section">
            <h3>GENOCIDIO</h3>
            <p style={{ fontSize: 7, color: "#8888aa", marginBottom: 4 }}>
              Stato: {genocideEnabled ? "ATTIVO" : "DISATTIVATO"}
            </p>
            <button className="danger" onClick={handleToggleGenocide} style={{ width: "100%", fontSize: 7 }}>
              {confirmGenocide === 0 ? "ATTIVA/DISATTIVA" : confirmGenocide === 1 ? "CONFERMA (1/3)" : "ULTIMA CONFERMA (2/3)"}
            </button>
          </div>

          {/* Magia */}
          <div className="section">
            <h3>SISTEMA MAGIA</h3>
            <p style={{ fontSize: 7, color: "#8888aa", marginBottom: 4 }}>
              Stato: {magicEnabled ? "ATTIVO" : "DISATTIVATO"}
            </p>
            <button onClick={handleToggleMagic} style={{ width: "100%", fontSize: 7 }} className={magicEnabled ? "danger" : "success"}>
              {magicEnabled ? "DISATTIVA MAGIA" : "ATTIVA MAGIA"}
            </button>
            {magicEnabled && (
              <div style={{ marginTop: 4, maxHeight: 100, overflowY: "auto" }}>
                {spells.map((s) => (
                  <div key={s.id} className="list-item" style={{ fontSize: 6 }}>
                    <span style={{ color: "#c9a44b" }}>{s.name}</span>
                    <span style={{ color: "#8888aa" }}>{s.manaCost} MP</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* World Editor Canvas */}
        <div className="section">
          <h3>MAPPA MONDO</h3>
          <canvas
            ref={canvasRef}
            className="world-editor-canvas"
            width={180}
            height={105}
            style={{ width: "100%", maxWidth: 540, height: "auto" }}
          />
          <p style={{ fontSize: 6, color: "#8888aa", marginTop: 4 }}>Verde = VillaggioA, Blu = VillaggioB, Marrone = NoMansLand — Giallo = NPC</p>
        </div>

        {/* Editore NPC */}
        <div className="section">
          <h3>EDITOR NPC ({npcs.length})</h3>
          <div style={{ fontSize: 6, maxHeight: 150, overflowY: "auto", marginBottom: 8 }}>
            {npcs.map((n) => (
              <div key={n.id} className="list-item" style={{ fontSize: 6 }}>
                <span>{n.name} ({n.role}) — {n.zone}</span>
                <span>
                  <button className="admin-mini-btn edit" onClick={() => handleEditNpc(n)}>E</button>
                  <button className="admin-mini-btn delete" onClick={() => handleDeleteNpc(n.id)}>X</button>
                </span>
              </div>
            ))}
          </div>
          <div className="admin-form-row"><label>Nome</label><input value={npcForm.name || ""} onChange={(e) => setNpcForm({ ...npcForm, name: e.target.value })} /></div>
          <div className="admin-form-row"><label>Ruolo</label><input value={npcForm.role || ""} onChange={(e) => setNpcForm({ ...npcForm, role: e.target.value })} /></div>
          <div className="admin-form-row"><label>Pos X/Y</label><input type="number" value={npcForm.posX || 0} onChange={(e) => setNpcForm({ ...npcForm, posX: +e.target.value })} style={{ width: 60 }} /><input type="number" value={npcForm.posY || 0} onChange={(e) => setNpcForm({ ...npcForm, posY: +e.target.value })} style={{ width: 60 }} /></div>
          <div className="admin-form-row">
            <label>Zona</label>
            <select value={npcForm.zone || ""} onChange={(e) => setNpcForm({ ...npcForm, zone: e.target.value })}>
              <option value="">—</option>
              {zones.map((z) => <option key={z.zone} value={z.zone}>{z.name}</option>)}
            </select>
          </div>
          <div className="admin-form-row">
            <label>Comport.</label>
            <select value={npcForm.behaviorType || "idle"} onChange={(e) => setNpcForm({ ...npcForm, behaviorType: e.target.value })}>
              <option value="idle">Fermo</option>
              <option value="wander">Vaga</option>
              <option value="guard">Guardia</option>
              <option value="merchant">Mercante</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={handleSaveNpc} style={{ flex: 1, fontSize: 7 }}>
              {editingNpcId ? "AGGIORNA NPC" : "CREA NPC"}
            </button>
            {editingNpcId && (
              <button onClick={() => { setNpcForm({}); setEditingNpcId(null); }} style={{ fontSize: 7 }}>
                ANNULLA
              </button>
            )}
          </div>
        </div>

        {/* Editore Quest */}
        <div className="section">
          <h3>EDITOR QUEST ({quests.length})</h3>
          <div style={{ fontSize: 6, maxHeight: 120, overflowY: "auto", marginBottom: 8 }}>
            {quests.map((q) => (
              <div key={q.id} className="list-item" style={{ fontSize: 6 }}>
                <span style={{ maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.buildingName} — {q.resourceLabel} x{q.targetAmount}
                </span>
                <span>
                  <button className="admin-mini-btn edit" onClick={() => handleEditQuest(q)}>E</button>
                  <button className="admin-mini-btn delete" onClick={() => handleDeleteQuest(q.id)}>X</button>
                </span>
              </div>
            ))}
          </div>
          <div className="admin-form-row"><label>Edificio</label><input value={questForm.buildingName} onChange={(e) => setQuestForm({ ...questForm, buildingName: e.target.value })} /></div>
          <div className="admin-form-row"><label>Risorsa</label><select value={questForm.resourceName} onChange={(e) => setQuestForm({ ...questForm, resourceName: e.target.value })}>
            <option value="wood">Legna</option><option value="stone">Pietra</option><option value="fish">Pesce</option><option value="herbs">Erbe</option><option value="meat">Carne</option><option value="iron">Ferro</option>
          </select></div>
          <div className="admin-form-row"><label>Label</label><input value={questForm.resourceLabel} onChange={(e) => setQuestForm({ ...questForm, resourceLabel: e.target.value })} /></div>
          <div className="admin-form-row">
            <label>Q.tà</label><input type="number" value={questForm.targetAmount} onChange={(e) => setQuestForm({ ...questForm, targetAmount: +e.target.value })} style={{ width: 60 }} />
            <label style={{ marginLeft: 8 }}>Oro</label><input type="number" value={questForm.goldReward} onChange={(e) => setQuestForm({ ...questForm, goldReward: +e.target.value })} style={{ width: 60 }} />
          </div>
          <div className="admin-form-row">
            <label>Tempo</label><input type="number" value={questForm.gatherTime} onChange={(e) => setQuestForm({ ...questForm, gatherTime: +e.target.value })} style={{ width: 60 }} />
            <label style={{ marginLeft: 8 }}>Resa</label><input type="number" value={questForm.gatherYield} onChange={(e) => setQuestForm({ ...questForm, gatherYield: +e.target.value })} style={{ width: 60 }} />
          </div>
          <div className="admin-form-row"><label>Item</label><input value={questForm.itemRewardName} onChange={(e) => setQuestForm({ ...questForm, itemRewardName: e.target.value })} /></div>
          <div className="admin-form-row"><label>Tipo</label><select value={questForm.itemRewardType} onChange={(e) => setQuestForm({ ...questForm, itemRewardType: e.target.value })}>
            <option value="WEAPON">WEAPON</option><option value="ARMOR">ARMOR</option><option value="TALISMAN">TALISMAN</option><option value="CONSUMABLE">CONSUMABLE</option>
          </select></div>
          <div className="admin-form-row"><label>Desc</label><input value={questForm.description} onChange={(e) => setQuestForm({ ...questForm, description: e.target.value })} /></div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={handleSaveQuest} style={{ flex: 1, fontSize: 7 }}>
              {editingQuestId ? "AGGIORNA" : "CREA"}
            </button>
            {editingQuestId && (
              <button onClick={() => { setQuestForm({ buildingName: "", resourceName: "wood", resourceLabel: "", targetAmount: 10, gatherTime: 4, gatherYield: 1, goldReward: 50, itemRewardName: "", itemRewardType: "WEAPON", description: "" }); setEditingQuestId(null); }} style={{ fontSize: 7 }}>
                ANNULLA
              </button>
            )}
          </div>
        </div>

        {/* Editore Zone */}
        <div className="section">
          <h3>EDITOR ZONE ({zones.length})</h3>
          <div style={{ fontSize: 6, maxHeight: 150, overflowY: "auto", marginBottom: 8 }}>
            {zones.map((z) => (
              <div key={z.zone} className="list-item" style={{ fontSize: 6 }}>
                <span
                  style={{ cursor: "pointer", color: zoneForm?.zone === z.zone ? "#c9a44b" : "#e0e0e0" }}
                  onClick={() => setZoneForm({ ...z })}
                >
                  {z.name} — {z.zone} ({z.x},{z.y} {z.w}x{z.h})
                </span>
                <span style={{ color: "#8888aa" }}>{z.floor}</span>
              </div>
            ))}
          </div>
          {zoneForm && (
            <>
              <div className="admin-form-row"><label>ID</label><input value={zoneForm.zone} onChange={(e) => setZoneForm({ ...zoneForm, zone: e.target.value })} /></div>
              <div className="admin-form-row"><label>Nome</label><input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} /></div>
              <div className="admin-form-row">
                <label>Pos</label>
                <input type="number" value={zoneForm.x} onChange={(e) => setZoneForm({ ...zoneForm, x: +e.target.value })} style={{ width: 60 }} />
                <input type="number" value={zoneForm.y} onChange={(e) => setZoneForm({ ...zoneForm, y: +e.target.value })} style={{ width: 60 }} />
                <label style={{ marginLeft: 8 }}>Dim</label>
                <input type="number" value={zoneForm.w} onChange={(e) => setZoneForm({ ...zoneForm, w: +e.target.value })} style={{ width: 60 }} />
                <input type="number" value={zoneForm.h} onChange={(e) => setZoneForm({ ...zoneForm, h: +e.target.value })} style={{ width: 60 }} />
              </div>
              <div className="admin-form-row"><label>Tile</label><input value={zoneForm.floor} onChange={(e) => setZoneForm({ ...zoneForm, floor: e.target.value })} /></div>
              <div className="admin-form-row"><label>Desc</label><input value={zoneForm.description || ""} onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })} /></div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => {
                  const updated = zones.map((z) => z.zone === zoneForm.zone ? zoneForm : z);
                  setZones(updated);
                }} style={{ flex: 1, fontSize: 7 }}>APPLICA MODIFICHE</button>
              </div>
            </>
          )}
          <button onClick={handleSaveZones} style={{ width: "100%", marginTop: 4, fontSize: 7 }}>SALVA TUTTE LE ZONE</button>
        </div>

        {/* Giocatori connessi */}
        <div className="section">
          <h3>GIOCATORI CONNESSI ({connectedPlayers.count})</h3>
          {connectedPlayers.clients.map((c) => (
            <div key={c.id} className="list-item">
              <span className="name">{c.characterName || c.id}</span>
              <span className="badge">{c.zone || "—"}</span>
            </div>
          ))}
          <button onClick={loadAllData} style={{ fontSize: 7, marginTop: 4, width: "100%" }}>AGGIORNA TUTTO</button>
        </div>

        {/* Action Log */}
        <div className="section">
          <h3>ACTION LOG</h3>
          <div style={{ maxHeight: 200, overflowY: "auto", fontSize: 6 }}>
            {actionLog.map((log) => (
              <div key={log.id} className="list-item">
                <span>{log.actionType}</span>
                <span style={{ color: "#8888aa" }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ marginTop: 8, textAlign: "center" }}>
          <span className="link" onClick={() => navigate("/login")}>&lt;&lt; INDIETRO</span>
        </p>
      </div>
    </div>
    {showWorldEditor && (
      <WorldEditor tiles={customTiles} onSave={handleSaveWorldTiles} onClose={() => setShowWorldEditor(false)} />
    )}
    </>
  );
}
