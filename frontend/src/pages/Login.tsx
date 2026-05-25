import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../auth/store";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    await login(username, password);
    if (useAuthStore.getState().user) {
      navigate("/characters");
    }
  };

  return (
    <div className="page">
      <div className="landing-screen">
        <h1>REGNI MEDIEVALI</h1>
        <p className="subtitle">
          Un MMORPG sandbox a 8-bit giocabile in LAN
        </p>
      </div>
      <div className="page-card" style={{ marginTop: -40 }}>
        <h2 className="page-title">ACCEDI</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={30}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "CARICAMENTO..." : "ENTRA"}
          </button>
        </form>
        <p style={{ marginTop: 12, textAlign: "center", fontSize: 8 }}>
          <Link to="/register" className="link">
            CREA ACCOUNT &gt;&gt;
          </Link>
        </p>
        <p style={{ marginTop: 8, textAlign: "center", fontSize: 7, color: "#8888aa" }}>
          Admin: <Link to="/admin" className="link">Pannello Admin</Link>
        </p>
      </div>
    </div>
  );
}
