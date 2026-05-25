import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./App";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CharacterSelect from "./pages/CharacterSelect";
import CharacterCreate from "./pages/CharacterCreate";
import Game from "./pages/Game";
import Pope from "./pages/Pope";
import King from "./pages/King";
import Admin from "./pages/Admin";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Login /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "characters", element: <CharacterSelect /> },
      { path: "characters/create", element: <CharacterCreate /> },
      { path: "game", element: <Game /> },
      { path: "pope", element: <Pope /> },
      { path: "king", element: <King /> },
      { path: "admin", element: <Admin /> },
    ],
  },
]);
