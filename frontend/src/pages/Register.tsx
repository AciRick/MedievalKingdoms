import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../auth/store";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [validationError, setValidationError] = useState("");
  const { register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError("");

    if (password !== confirm) {
      setValidationError("Le password non coincidono");
      return;
    }
    if (password.length < 6) {
      setValidationError("La password deve essere di almeno 6 caratteri");
      return;
    }

    await register(username, password);
    if (useAuthStore.getState().user) {
      navigate("/characters");
    }
  };

  return (
    <div className="page">
      <div className="page-card">
        <h2 className="page-title">REGISTRATI</h2>
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
          <div className="form-group">
            <label>Conferma Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {(error || validationError) && (
            <p className="error-text">{validationError || error}</p>
          )}
          <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "CARICAMENTO..." : "REGISTRATI"}
          </button>
        </form>
        <p style={{ marginTop: 12, textAlign: "center", fontSize: 8 }}>
          <Link to="/login" className="link">
            &lt;&lt; GIÀ REGISTRATO? ACCEDI
          </Link>
        </p>
      </div>
    </div>
  );
}
