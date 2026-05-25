import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "./auth/store";
import { getToken } from "./api/client";

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, fetchMe, logout } = useAuthStore();

  useEffect(() => {
    if (getToken() && !user) {
      fetchMe();
    }
  }, [user, fetchMe]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {user && (
        <div
          style={{
            position: "fixed",
            top: 4,
            right: 4,
            zIndex: 200,
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "rgba(22,33,62,0.9)",
            border: "2px solid #3a3a5e",
            padding: "4px 8px",
            fontSize: 7,
          }}
        >
          <span style={{ color: "#c9a44b" }}>{user.username}</span>
          <button
            style={{ fontSize: 6, padding: "2px 6px" }}
            onClick={handleLogout}
          >
            ESCI
          </button>
        </div>
      )}
      <Outlet />
    </div>
  );
}
