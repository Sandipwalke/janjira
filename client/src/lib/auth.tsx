import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { store } from "./store";
import type { User } from "@shared/schema";

type GoogleCredentialPayload = {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

function parseGoogleCredential(credential: string): GoogleCredentialPayload | null {
  try {
    const [, payload] = credential.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json) as GoogleCredentialPayload;
  } catch {
    return null;
  }
}

interface AuthContext {
  user: User | null;
  loading: boolean;
  loginDemo: () => Promise<void>;
  loginGoogle: (credential: string) => Promise<void>;
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

  const loginGoogle = async (credential: string) => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      if (!res.ok) throw new Error("Google authentication failed");
      const u = await res.json();
      setUser(u);
      return;
    } catch {
      const payload = parseGoogleCredential(credential);
      if (!payload?.email) throw new Error("Google authentication failed");

      const existing = store.getUserByEmail(payload.email);
      const fallbackUser = existing || store.upsertUser({
        email: payload.email,
        name: payload.name || payload.email,
        avatar: payload.picture,
      });
      setUser(fallbackUser);
    }
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
