import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import { api, getToken } from "../api/client";
import type { Treaty } from "../api/types";
import ConfirmDialog from "../components/ConfirmDialog";

interface PopeChar {
  id: number;
  name: string;
  kingdom: string;
  isExcommunicated: boolean;
}

export default function Pope() {
  const { user, characters } = useAuthStore();
  const navigate = useNavigate();
  const popeChar = characters.find((c) => c.isPope);

  const [treaties, setTreaties] = useState<Treaty[]>([]);
  const [allChars, setAllChars] = useState<PopeChar[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; name: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"excommunicate" | "pardon" | "corrupt" | null>(null);

  useEffect(() => {
    if (!user && !getToken()) { navigate("/login"); return; }
    if (!popeChar) { navigate("/characters"); return; }
    loadData();
  }, [user, popeChar, navigate]);

  const loadData = async () => {
    try {
      const [tList, cList] = await Promise.all([
        api.getTreaties(),
        api.getCharactersForPope(),
      ]);
      setTreaties(tList);
      setAllChars(cList);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleApprove = async (treatyId: number) => {
    try {
      await api.approveTreaty(popeChar!.id, treatyId);
      setMsg("Trattato approvato!");
      loadData();
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleReject = async (treatyId: number) => {
    try {
      await api.rejectTreaty(popeChar!.id, treatyId);
      setMsg("Trattato rifiutato.");
      loadData();
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleExcommunicate = async () => {
    if (!confirmTarget) return;
    try {
      await api.excommunicate(popeChar!.id, confirmTarget.id);
      setMsg(`${confirmTarget.name} è stato scomunicato!`);
      setConfirmTarget(null);
      setConfirmAction(null);
      loadData();
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handlePardon = async () => {
    if (!confirmTarget) return;
    try {
      await api.pardon(popeChar!.id, confirmTarget.id);
      setMsg(`${confirmTarget.name} è stato perdonato!`);
      setConfirmTarget(null);
      setConfirmAction(null);
      loadData();
    } catch (err: unknown) { setError((err as Error).message); }
  };

  const handleCorruptToggle = async () => {
    try {
      await api.setPopeCorrupted(popeChar!.id, !popeChar!.isPopeCorrupted);
      setMsg(popeChar!.isPopeCorrupted ? "Anima purificata!" : "Il Papa si è dichiarato corrotto!");
      setConfirmAction(null);
    } catch (err: unknown) { setError((err as Error).message); }
  };

  if (!popeChar) return null;

  return (
    <div className="page">
      <div className="page-card dashboard">
        <h2 className="page-title">PAPA — {popeChar.name}</h2>
        <p style={{ textAlign: "center", fontSize: 7, color: "#8888aa", marginBottom: 12 }}>
          {popeChar.isPopeCorrupted ? "⚠️ PAPA CORROTTO" : "✨ Papa puro e giusto"}
        </p>

        {error && <p className="error-text">{error}</p>}
        {msg && <p className="success-text">{msg}</p>}

        {/* Trattati pendenti */}
        <div className="section">
          <h3>TRATTATI PENDENTI</h3>
          {treaties.filter((t) => t.status === "PROPOSED").length === 0 && (
            <p style={{ fontSize: 7, color: "#8888aa" }}>Nessun trattato in attesa.</p>
          )}
          {treaties.filter((t) => t.status === "PROPOSED").map((t) => (
            <div key={t.id} className="list-item">
              <div>
                <span className="name">{t.type} — Proposto da {t.createdBy?.name || "???"}</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="success" style={{ fontSize: 6, padding: "2px 6px" }} onClick={() => handleApprove(t.id)}>
                  APPROVA
                </button>
                <button className="danger" style={{ fontSize: 6, padding: "2px 6px" }} onClick={() => handleReject(t.id)}>
                  RIFIUTA
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Trattati attivi */}
        <div className="section">
          <h3>TRATTATI ATTIVI</h3>
          {treaties.filter((t) => t.status === "ACTIVE").map((t) => (
            <div key={t.id} className="list-item">
              <span className="name">
                {t.type} — {JSON.stringify(t.partiesJson)}
              </span>
              <span className="badge success">ATTIVO</span>
            </div>
          ))}
        </div>

        {/* Personaggi */}
        <div className="section">
          <h3>PERSONAGGI</h3>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {allChars.map((c) => (
              <div key={c.id} className="list-item">
                <div>
                  <span className="name">{c.name}</span>
                  {c.isExcommunicated && <span className="badge danger">SCOM.</span>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {!c.isExcommunicated ? (
                    <button
                      className="danger"
                      style={{ fontSize: 6, padding: "2px 6px" }}
                      onClick={() => { setConfirmTarget({ id: c.id, name: c.name }); setConfirmAction("excommunicate"); }}
                    >
                      SCOMUNICA
                    </button>
                  ) : (
                    <button
                      className="success"
                      style={{ fontSize: 6, padding: "2px 6px" }}
                      onClick={() => { setConfirmTarget({ id: c.id, name: c.name }); setConfirmAction("pardon"); }}
                    >
                      PERDONA
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toggle corrotto */}
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button
            className={popeChar.isPopeCorrupted ? "success" : "danger"}
            onClick={() => setConfirmAction("corrupt")}
          >
            {popeChar.isPopeCorrupted ? "PURIFICA ANIMA" : "DICHIARATI CORROTTO"}
          </button>
        </div>

        <p style={{ marginTop: 8, textAlign: "center" }}>
          <span className="link" onClick={() => navigate("/characters")}>
            &lt;&lt; INDIETRO
          </span>
        </p>
      </div>

      {/* Dialog di conferma */}
      {confirmAction && confirmTarget && (
        <ConfirmDialog
          title={
            confirmAction === "excommunicate" ? "Scomunica" : "Perdona"
          }
          message={
            confirmAction === "excommunicate"
              ? `Sei sicuro di voler scomunicare ${confirmTarget.name}?`
              : `Sei sicuro di voler perdonare ${confirmTarget.name}?`
          }
          onConfirm={confirmAction === "excommunicate" ? handleExcommunicate : handlePardon}
          onCancel={() => { setConfirmTarget(null); setConfirmAction(null); }}
        />
      )}

      {confirmAction === "corrupt" && (
        <ConfirmDialog
          title={popeChar.isPopeCorrupted ? "Purifica Anima" : "Dichiarati Corrotto"}
          message={
            popeChar.isPopeCorrupted
              ? "Sei sicuro di voler purificare la tua anima papale?"
              : "Sei sicuro di volerti dichiarare Papa corrotto? Questo è irreversibile senza intervento divino."
          }
          onConfirm={handleCorruptToggle}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
