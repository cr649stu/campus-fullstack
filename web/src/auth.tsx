import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, TOKEN_KEY } from "./api";
import type { User } from "./types";

interface AuthValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (account: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setUser(null);
        setReady(true);
        return;
      }
      try {
        const result = await api.me();
        if (!cancelled) setUser(result.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const applySession = useCallback((next: { token: string; user: User }) => {
    localStorage.setItem(TOKEN_KEY, next.token);
    setToken(next.token);
    setUser(next.user);
  }, []);

  const login = useCallback(
    async (account: string, password: string) => {
      const result = await api.login(account, password);
      applySession(result);
      return result.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const result = await api.register(username, email, password);
      applySession(result);
      return result.user;
    },
    [applySession],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    const result = await api.me();
    setUser(result.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, ready, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return value;
}
