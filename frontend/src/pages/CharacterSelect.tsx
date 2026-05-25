import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import { getToken } from "../api/client";
import Avatar from "../components/Avatar";

export default function CharacterSelect() {
  const { user, characters, fetchCharacters, setSelectedCharacter } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !getToken()) {
      navigate("/login");
      return;
    }
    fetchCharacters();
  }, [user, fetchCharacters, navigate]);

  const handleSelect = (char: (typeof characters)[0]) => {
    setSelectedCharacter(char);
    navigate("/game");
  };

  const handleCreate = () => {
    navigate("/characters/create");
  };

  const handlePope = () => {
    const popeChar = characters.find((c) => c.isPope);
    if (popeChar) {
      setSelectedCharacter(popeChar);
      navigate("/pope");
    }
  };

  const handleKing = () => {
    const kingChar = characters.find((c) => c.isKing);
    if (kingChar) {
      setSelectedCharacter(kingChar);
      navigate("/king");
    }
  };

  return (
    <div className="page">
      <div className="page-card" style={{ maxWidth: 600 }}>
        <h2 className="page-title">I TUOI PERSONAGGI</h2>

        {characters.length === 0 && (
          <p style={{ textAlign: "center", color: "#8888aa", marginBottom: 16 }}>
            Nessun personaggio creato. Creane uno!
          </p>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: 400,
            overflowY: "auto",
            marginBottom: 12,
          }}
        >
          {characters.map((char) => (
            <div
              key={char.id}
              className="panel"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                borderColor: "#c9a44b",
              }}
              onClick={() => handleSelect(char)}
            >
              <Avatar faceImagePath={char.faceImagePath} seed={`${char.id}`} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#c9a44b", fontSize: 10, marginBottom: 4 }}>
                  {char.name}
                </div>
                <div style={{ color: "#8888aa", fontSize: 7 }}>
                  Lv.{char.level} — {char.kingdom === "VILLAGE_A" ? "Vill. Nord" : char.kingdom === "VILLAGE_B" ? "Vill. Sud" : "Neutrale"}
                </div>
                <div style={{ color: "#8888aa", fontSize: 7 }}>
                  {char.characterRoles.map((cr) => cr.role.name).join(", ")}
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 7 }}>
                <div>HP: {char.hp}/{char.hp > 50 ? 100 : 100}</div>
                <div>Energia: {char.energy}</div>
                {char.isExcommunicated && (
                  <span className="badge danger">SCOMUNICATO</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleCreate} style={{ flex: 1 }}>
            CREA PERSONAGGIO
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {characters.some((c) => c.isPope) && (
            <button onClick={handlePope} style={{ flex: 1 }}>
              PAPA
            </button>
          )}
          {characters.some((c) => c.isKing) && (
            <button onClick={handleKing} style={{ flex: 1 }}>
              RE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
