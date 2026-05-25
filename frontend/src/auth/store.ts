import { create } from "zustand";
import { api, setToken, getToken } from "../api/client";
import type { User, Character } from "../api/types";

interface AuthState {
  user: User | null;
  characters: Character[];
  selectedCharacter: Character | null;
  loading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  fetchCharacters: () => Promise<void>;
  setSelectedCharacter: (character: Character | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  characters: [],
  selectedCharacter: null,
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.login(username, password);
      setToken(res.token);
      set({ user: res.user, loading: false });
    } catch (err: unknown) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  register: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.register(username, password);
      setToken(res.token);
      set({ user: res.user, loading: false });
    } catch (err: unknown) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  logout: () => {
    setToken(null);
    set({ user: null, characters: [], selectedCharacter: null });
  },

  fetchMe: async () => {
    try {
      const user = await api.me();
      set({ user });
    } catch {
      // Non cancellare il token su errore transiente — il server potrebbe essere momentaneamente offline
      if (!getToken()) {
        set({ user: null });
      }
    }
  },

  fetchCharacters: async () => {
    try {
      const characters = await api.listCharacters();
      set({ characters });
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  setSelectedCharacter: (character) => {
    set({ selectedCharacter: character });
  },

  clearError: () => set({ error: null }),
}));
