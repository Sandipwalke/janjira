import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { SiGoogle } from "react-icons/si";
import { HardDrive, Zap, Shield, Users, GitBranch, Layers } from "lucide-react";
import { getGoogleClientId } from "@shared/googleAuth";

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const googleClientId = getGoogleClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function LoginPage() {
  const { loginDemo, loginGoogle } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (!googleClientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts?.id?.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) return;
          setLoading(true);
          try {
            await loginGoogle(response.credential);
            setLocation("/org/org-demo/dashboard");
          } finally {
            setLoading(false);
          }
        },
      });
      setGoogleReady(true);
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [loginGoogle, setLocation]);

  const handleDemo = async () => {
    setLoading(true);
    await loginDemo();
    setLocation("/org/org-demo/dashboard");
    setLoading(false);
  };

  const handleGoogle = () => {
    window.google?.accounts?.id?.prompt();
  };

  const features = [
    { icon: HardDrive, label: "Google Drive as database", desc: "All data lives in your private Drive folder" },
    { icon: Shield, label: "Encrypted storage", desc: "Your org data is encrypted before storing" },
    { icon: Users, label: "Team collaboration", desc: "Invite members via email, manage roles" },
    { icon: Layers, label: "Kanban + Backlog + Roadmap", desc: "Full Jira-like project views" },
    { icon: GitBranch, label: "Sprint management", desc: "Plan sprints, track velocity" },
    { icon: Zap, label: "Completely free", desc: "No infrastructure cost ever" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left: hero */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-sidebar p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="6" height="6" rx="1.5" fill="white"/>
              <rect x="10" y="2" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="2" y="10" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="10" y="10" width="6" height="6" rx="1.5" fill="white" opacity="0.3"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-sidebar-foreground" style={{ fontFamily: "var(--font-display)" }}>Janjira</span>
        </div>

        <div>
          <p className="text-3xl font-bold text-sidebar-foreground leading-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Project management,<br />powered by Google Drive.
          </p>
          <p className="text-sidebar-foreground/60 text-base leading-relaxed">
            Janjira is a free, fully-featured project management platform. No servers, no subscriptions — your Google Drive is the database.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-8">
            {features.map(f => (
              <div key={f.label} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">{f.label}</p>
                  <p className="text-xs text-sidebar-foreground/50">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/30">
          <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="hover:text-sidebar-foreground/50 transition-colors">
            Created with Perplexity Computer
          </a>
        </p>
      </div>

      {/* Right: login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="6" height="6" rx="1.5" fill="white"/>
                <rect x="10" y="2" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
                <rect x="2" y="10" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
                <rect x="10" y="10" width="6" height="6" rx="1.5" fill="white" opacity="0.3"/>
              </svg>
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Janjira</span>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-8">Sign in to access your workspace.</p>

          <div className="space-y-3">
            <Button
              className="w-full h-11 font-medium gap-3"
              onClick={handleGoogle}
              disabled={loading || !googleReady}
              data-testid="button-signin-google"
            >
              <SiGoogle className="w-4 h-4" />
              Continue with Google
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-background px-3">or</span></div>
            </div>

            <Button
              variant="outline"
              className="w-full h-11 font-medium"
              onClick={handleDemo}
              disabled={loading}
              data-testid="button-demo-login"
            >
              Try Demo (no sign-in)
            </Button>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">How it works</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When you sign in with Google, Janjira creates a private folder in your Drive to store your org's data as an encrypted JSON file. No external servers ever touch your data.
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Free forever · No credit card required
          </p>
        </div>
      </div>
    </div>
  );
}
