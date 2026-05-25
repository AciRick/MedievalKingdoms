import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import { api, getToken } from "../api/client";
import type { Role } from "../api/types";
import FaceUpload from "../components/FaceUpload";
import RecordCry from "../components/RecordCry";

const INITIAL_STATS = { strength: 3, agility: 3, charisma: 3, intellect: 3, faith: 3, luck: 5 };
const TOTAL_POINTS = 20;

export default function CharacterCreate() {
  const { user, fetchCharacters, setSelectedCharacter } = useAuthStore();
  const navigate = useNavigate();

  const [roles, setRoles] = useState<Role[]>([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [name, setName] = useState("");
  const [peopleName, setPeopleName] = useState("");
  const [kingdom, setKingdom] = useState("NEUTRAL");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [stats, setStats] = useState({ ...INITIAL_STATS });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [cryBlob, setCryBlob] = useState<Blob | null>(null);
  const [step, setStep] = useState(1); // 1=info, 2=stats, 3=roles, 4=media

  useEffect(() => {
    if (!user && !getToken()) { navigate("/login"); return; }
    api.getRoles().then(setRoles).catch(() => {});
  }, [user, navigate]);

  const usedPoints = stats.strength + stats.agility + stats.charisma + stats.intellect + stats.faith + stats.luck;
  const remaining = TOTAL_POINTS - usedPoints;

  const adjustStat = (stat: keyof typeof stats, delta: number) => {
    setStats((prev) => {
      const newVal = prev[stat] + delta;
      if (newVal < 0 || newVal > 10) return prev;
      const newTotal = usedPoints + delta;
      if (newTotal > TOTAL_POINTS || newTotal < 0) return prev;
      return { ...prev, [stat]: newVal };
    });
  };

  const toggleRole = (roleId: number) => {
    setSelectedRoleIds((prev) => {
      if (prev.includes(roleId)) return prev.filter((id) => id !== roleId);
      if (prev.length >= 3) return prev;
      return [...prev, roleId];
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Inserisci un nome"); return; }
    if (!peopleName.trim()) { setError("Inserisci il nome del popolo"); return; }
    if (selectedRoleIds.length === 0) { setError("Seleziona almeno un ruolo"); return; }
    if (usedPoints !== TOTAL_POINTS) { setError(`Devi usare esattamente ${TOTAL_POINTS} punti (ne hai usati ${usedPoints})`); return; }

    setLoading(true);
    try {
      const char = await api.createCharacter({
        name: name.trim(),
        peopleName: peopleName.trim(),
        kingdom,
        roleIds: selectedRoleIds,
        ...stats,
      });

      if (char && char.id) {
        if (faceFile) {
          await api.uploadFace(char.id, faceFile).catch(() => {});
        }
        if (cryBlob) {
          const cryFile = new File([cryBlob], "battlecry.webm", { type: "audio/webm" });
          await api.uploadCry(char.id, cryFile).catch(() => {});
        }
        await fetchCharacters();
        setSelectedCharacter(char);
        navigate("/game");
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    }
    setLoading(false);
  };

  if (!user) return null;

  const step1 = step === 1;
  const step2 = step === 2;
  const step3 = step === 3;
  const step4 = step === 4;

  return (
    <div className="page">
      <div className="page-card" style={{ maxWidth: 550, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 className="page-title">CREA PERSONAGGIO</h2>

        {/* Progress indicator */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, justifyContent: "center" }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                width: 40,
                height: 4,
                background: s <= step ? "#c9a44b" : "#3a3a5e",
              }}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {step1 && (
            <>
              <div className="form-group">
                <label>Nome del Personaggio</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={30} autoFocus />
              </div>
              <div className="form-group">
                <label>Nome del Popolo / Clan</label>
                <input value={peopleName} onChange={(e) => setPeopleName(e.target.value)} required maxLength={30} />
              </div>
              <div className="form-group">
                <label>Regno</label>
                <select value={kingdom} onChange={(e) => setKingdom(e.target.value)}>
                  <option value="NEUTRAL">Neutrale</option>
                  <option value="VILLAGE_A">Villaggio del Nord</option>
                  <option value="VILLAGE_B">Villaggio del Sud</option>
                </select>
              </div>
            </>
          )}

          {step2 && (
            <>
              <p style={{ fontSize: 8, marginBottom: 8, color: "#8888aa" }}>
                Distribuisci {TOTAL_POINTS} punti tra gli attributi (max 10). Punti rimanenti:{" "}
                <span style={{ color: remaining < 0 ? "#cc3333" : "#c9a44b" }}>{remaining}</span>
              </p>
              {(["strength", "agility", "charisma", "intellect", "faith", "luck"] as const).map((stat) => (
                <div key={stat} className="stat-row">
                  <span>
                    {stat === "strength" ? "Forza" : stat === "agility" ? "Agilità" : stat === "charisma" ? "Carisma" : stat === "intellect" ? "Intelletto" : stat === "faith" ? "Fede" : "Fortuna"}
                  </span>
                  <div className="stat-controls">
                    <button type="button" onClick={() => adjustStat(stat, -1)} disabled={stats[stat] <= 0}>-</button>
                    <span className="stat-value">{stats[stat]}</span>
                    <button type="button" onClick={() => adjustStat(stat, 1)} disabled={stats[stat] >= 10 || remaining <= 0}>+</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {step3 && (
            <>
              <p style={{ fontSize: 8, marginBottom: 8, color: "#8888aa" }}>
                Scegli da 1 a 3 ruoli per il tuo personaggio
              </p>
              <div className="form-group">
                <input
                  placeholder="Cerca ruolo..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  style={{ fontSize: 8 }}
                />
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {roles
                  .filter((r) => r.name.toLowerCase().includes(roleSearch.toLowerCase()))
                  .map((role) => {
                    const selected = selectedRoleIds.includes(role.id);
                    return (
                      <div
                        key={role.id}
                        className="panel"
                        style={{
                          cursor: "pointer",
                          borderColor: selected ? "#c9a44b" : "#3a3a5e",
                          background: selected ? "#1a2238" : undefined,
                        }}
                        onClick={() => toggleRole(role.id)}
                      >
                        <div style={{ fontSize: 9, color: selected ? "#c9a44b" : "#e0e0e0" }}>
                          {role.name}
                        </div>
                        <div style={{ fontSize: 7, color: "#8888aa" }}>{role.description}</div>
                      </div>
                    );
                  })}
                {roles.filter((r) => r.name.toLowerCase().includes(roleSearch.toLowerCase())).length === 0 && (
                  <p style={{ fontSize: 8, color: "#8888aa", textAlign: "center", padding: 12 }}>
                    Nessun ruolo trovato{roleSearch ? ` per "${roleSearch}"` : ""}
                  </p>
                )}
              </div>
            </>
          )}

          {step4 && (
            <>
              <p style={{ fontSize: 8, marginBottom: 8, color: "#8888aa" }}>
                Carica un volto e registra un grido di battaglia (opzionali)
              </p>
              <div className="form-group">
                <label>Volto (JPEG/PNG, max 2MB)</label>
                <FaceUpload onFile={(f) => setFaceFile(f)} />
              </div>
              <div className="form-group">
                <label>Grido di Battaglia (max 5 secondi)</label>
                <RecordCry onRecordingComplete={(blob) => setCryBlob(blob)} />
              </div>
            </>
          )}

          {error && <p className="error-text">{error}</p>}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} style={{ flex: 1 }}>
                INDIETRO
              </button>
            )}
            {step < 4 ? (
              <button type="button" onClick={() => setStep(step + 1)} style={{ flex: 1 }}>
                AVANTI
              </button>
            ) : (
              <button type="submit" disabled={loading} className="success" style={{ flex: 1 }}>
                {loading ? "CREAZIONE..." : "CREA!"}
              </button>
            )}
          </div>
        </form>

        <p style={{ marginTop: 8, textAlign: "center", fontSize: 7 }}>
          <span className="link" onClick={() => navigate("/characters")}>
            &lt;&lt; ANNULLA
          </span>
        </p>
      </div>
    </div>
  );
}
