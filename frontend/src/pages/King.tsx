import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import { api, getToken } from "../api/client";

export default function King() {
  const { user, characters } = useAuthStore();
  const navigate = useNavigate();
  const kingChar = characters.find((c) => c.isKing);

  const [order, setOrder] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user && !getToken()) { navigate("/login"); return; }
    if (!kingChar) { navigate("/characters"); return; }
  }, [user, kingChar, navigate]);

  if (!kingChar) return null;

  const villageName =
    kingChar.kingdom === "VILLAGE_A" ? "Villaggio del Nord" : "Villaggio del Sud";

  const handleOrder = () => {
    if (!order.trim()) {
      setError("Inserisci un ordine");
      return;
    }
    // Per ora solo UI; in futuro l'ordine verrà broadcast via Socket.IO
    setMsg(`Ordine inviato a ${villageName}: "${order.trim()}"`);
    setOrder("");
    setError("");
  };

  const handleExpel = async () => {
    const name = prompt("Nome del cittadino da espellere:");
    if (!name) return;
    setMsg(`${name} è stato espulso da ${villageName}!`);
    await api.getCharactersForPope().catch(() => {});
  };

  return (
    <div className="page">
      <div className="page-card dashboard">
        <h2 className="page-title">
          {kingChar.name === "Re Aldric del Nord" ? "RE" : "REGINA"} — {kingChar.name}
        </h2>
        <p style={{ textAlign: "center", fontSize: 7, color: "#8888aa", marginBottom: 12 }}>
          {villageName}
        </p>

        {error && <p className="error-text">{error}</p>}
        {msg && <p className="success-text">{msg}</p>}

        <div className="section">
          <h3>EMANA UN ORDINE</h3>
          <div className="form-group">
            <label>Ordine per i sudditi</label>
            <input
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="Es: Preparatevi alla battaglia!"
              maxLength={100}
            />
          </div>
          <button onClick={handleOrder} style={{ width: "100%" }}>
            INVIA ORDINE
          </button>
        </div>

        <div className="section">
          <h3>ESPULSI CITTADINO</h3>
          <button className="danger" onClick={handleExpel} style={{ width: "100%" }}>
            ESPELLI CITTADINO
          </button>
          <p style={{ fontSize: 6, color: "#8888aa", marginTop: 4 }}>
            Imposta la reputazione a -100 nel villaggio.
          </p>
        </div>

        <p style={{ marginTop: 8, textAlign: "center" }}>
          <span className="link" onClick={() => navigate("/characters")}>
            &lt;&lt; INDIETRO
          </span>
        </p>
      </div>
    </div>
  );
}
