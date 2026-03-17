import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { store } from "./store";
import type { User } from "@shared/schema";

interface AuthContext {
  user: User | null;
  loading: boolean;
  loginDemo: () => Promise<void>;
  loginGoogle: (payload: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No persistence — users re-login each session (sandboxed iframe environment)
    setLoading(false);
  }, []);

  const loginDemo = async () => {
    const u = store.getUser("user-sandip")!;
    setUser(u);
  };

  const loginGoogle = async (payload: Partial<User>) => {
    const existing = payload.email ? store.getUserByEmail(payload.email) : undefined;
    const u = existing || store.upsertUser({
      email: payload.email || "google@user.com",
      name: payload.name || "Google User",
      avatar: payload.avatar || `https://api.dicebear.com/8.x/avataaars/svg?seed=${Date.now()}`,
    });
    setUser(u);
  };

  const logout = async () => {
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, loginDemo, loginGoogle, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
