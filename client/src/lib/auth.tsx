import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { store } from "./store";
import type { User } from "@shared/schema";

const AUTH_STORAGE_KEY = "janjira.auth.user.email";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type GoogleCredentialPayload = {
  email?: string;
  name?: string;
  picture?: string;
};

type GoogleLoginInput = string | Partial<User>;

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

function upsertLocalGoogleUser(payload: GoogleCredentialPayload) {
  if (!payload.email) throw new Error("Google authentication failed");
  const normalizedEmail = normalizeEmail(payload.email);
  const existing = store.getUserByEmail(normalizedEmail);
  const fallbackUser = existing || store.upsertUser({
    email: normalizedEmail,
    name: payload.name || normalizedEmail,
    avatar: payload.picture,
  });
  return fallbackUser;
}

interface AuthContext {
  user: User | null;
  loading: boolean;
  loginDemo: () => Promise<void>;
  loginGoogle: (input: GoogleLoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedEmail) {
      const existing = store.getUserByEmail(normalizeEmail(savedEmail));
      if (existing) setUser(existing);
    }
    setLoading(false);
  }, []);

  const loginDemo = async () => {
    const u = store.getUser("user-sandip")!;
    setUser(u);
    window.localStorage.setItem(AUTH_STORAGE_KEY, normalizeEmail(u.email));
  };

  const loginGoogle = async (input: GoogleLoginInput) => {
    // Backward-compatible path for branches that still pass profile payload objects.
    if (typeof input !== "string") {
      const normalizedEmail = input.email ? normalizeEmail(input.email) : undefined;
      const existing = normalizedEmail ? store.getUserByEmail(normalizedEmail) : undefined;
      const localUser = existing || store.upsertUser({
        email: normalizedEmail || "google@user.com",
        name: input.name || normalizedEmail || "Google User",
        avatar: input.avatar || `https://api.dicebear.com/8.x/avataaars/svg?seed=${Date.now()}`,
      });
      setUser(localUser);
      window.localStorage.setItem(AUTH_STORAGE_KEY, normalizeEmail(localUser.email));
      return;
    }

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: input }),
      });
      if (!res.ok) throw new Error("Google authentication failed");
      const u = await res.json();
      setUser(u);
      window.localStorage.setItem(AUTH_STORAGE_KEY, normalizeEmail(u.email));
      return;
    } catch {
      const payload = parseGoogleCredential(input);
      if (!payload) throw new Error("Google authentication failed");
      const localUser = upsertLocalGoogleUser(payload);
      setUser(localUser);
      window.localStorage.setItem(AUTH_STORAGE_KEY, normalizeEmail(localUser.email));
    }
  };

  const logout = async () => {
    setUser(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return <Ctx.Provider value={{ user, loading, loginDemo, loginGoogle, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
