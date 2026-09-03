import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { get, post } from "./api";

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: "parent" | "child";
  balance: number;
  handle?: string | null;
}

export interface Family {
  id: string;
  name: string;
  code?: string;
  exchangeRate: number;
  interest7: number;
  interest14: number;
  interest30: number;
}

interface AuthState {
  loading: boolean;
  user: User | null;
  family: Family | null;
  kids: { id: string; name: string; avatar: string }[];
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  loading: true,
  user: null,
  family: null,
  kids: [],
  refresh: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; user: User | null; family: Family | null; kids: any[] }>({
    loading: true,
    user: null,
    family: null,
    kids: [],
  });

  const refresh = useCallback(async () => {
    try {
      const data = await get<{ user: User; family: Family; kids: any[] }>("/api/me");
      setState({ loading: false, user: data.user, family: data.family, kids: data.kids || [] });
    } catch {
      setState({ loading: false, user: null, family: null, kids: [] });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await post("/api/logout");
    } catch {
      /* ignore */
    }
    setState({ loading: false, user: null, family: null, kids: [] });
  }, []);

  return (
    <AuthCtx.Provider value={{ ...state, refresh, logout }}>{children}</AuthCtx.Provider>
  );
}
