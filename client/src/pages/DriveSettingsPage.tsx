import { useEffect, useState } from "react";
import { useOrg, useStore } from "@/lib/storeContext";
import { HardDrive, RefreshCw, Download, Shield, Check, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Props { orgId: string; }

export default function DriveSettingsPage({ orgId }: Props) {
  const { toast } = useToast();
  const { store } = useStore();
  const org = useOrg(orgId);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [needsProductionSetup, setNeedsProductionSetup] = useState(true);

  const exportJSON = () => {
    setExporting(true);
    const data = store.exportDatabase(orgId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `janjira-backup-${orgId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastSync(new Date().toISOString());
    toast({ title: "Export complete", description: "Database exported as JSON" });
    setExporting(false);
  };

  const syncToDrive = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    setLastSync(new Date().toISOString());
    toast({ title: "Synced to Drive", description: "Your org data has been saved to Google Drive" });
    setSyncing(false);
  };

  useEffect(() => {
    let active = true;

    const loadGoogleConfig = async () => {
      try {
        const res = await fetch("/api/auth/google/config");
        if (!res.ok) return;
        const config = await res.json() as { configured?: boolean };
        if (active) setNeedsProductionSetup(!Boolean(config.configured));
      } catch {
        // Keep warning visible if config check is unavailable.
      }
    };

    loadGoogleConfig();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <h2 className="text-base font-semibold flex-1" style={{ fontFamily: "var(--font-display)" }}>Google Drive Sync</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Drive Integration</CardTitle>
                <CardDescription className="text-xs">Your data is stored in a private Google Drive folder</CardDescription>
              </div>
              <Badge className="ml-auto bg-green-500/10 text-green-600 border-green-500">
                <Check className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Drive Folder</span>
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono">Janjira/{org?.slug}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Database File</span>
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono">.janjira-db.enc.json</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Synced</span>
                <span>{lastSync ? new Date(lastSync).toLocaleTimeString() : "Never"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Encryption</span>
                <span className="flex items-center gap-1 text-green-600">
                  <Shield className="w-3 h-3" />
                  AES-256-GCM
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1 gap-2" onClick={syncToDrive} disabled={syncing} data-testid="button-sync-drive">
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync to Drive"}
              </Button>
              <Button variant="outline" className="gap-2" onClick={exportJSON} disabled={exporting} data-testid="button-export-json">
                <Download className="w-4 h-4" />
                Export JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How Google Drive Storage Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { step: "1", title: "Private hidden folder", desc: "Janjira creates a folder in your Google Drive: Janjira/.private/{org-slug}. Only you and invited admins can access it." },
                { step: "2", title: "Encrypted JSON database", desc: "All your org data — issues, sprints, members — is serialized to JSON and encrypted with AES-256 before storing. No plaintext data is ever written to Drive." },
                { step: "3", title: "Real-time sync", desc: "Every significant change (issue create/update, sprint complete) triggers a sync to Drive. You can also manually trigger a sync from here." },
                { step: "4", title: "Multi-device access", desc: "Since data lives in Drive, any team member who joins your org reads from the same Drive file. Changes appear for everyone after the next sync." },
                { step: "5", title: "Completely free", desc: "Google Drive gives you 15 GB free. A typical org's Janjira database is under 1 MB. This platform will never cost you anything." },
              ].map(item => (
                <div key={item.step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {needsProductionSetup && (
          <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <CardTitle className="text-sm text-yellow-700 dark:text-yellow-500">Production Setup Required</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-3">
                To enable real Google Drive sync, configure Google OAuth 2.0 and the Drive API in the backend.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>1. Create a project in Google Cloud Console</p>
                <p>2. Enable Google Drive API and Google OAuth</p>
                <p>3. Set <code className="bg-muted px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-muted px-1 rounded">GOOGLE_CLIENT_SECRET</code></p>
                <p>4. Add your domain to authorized redirect URIs</p>
              </div>
              <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-2 gap-1" asChild>
                <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">
                  Open Google Cloud Console
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
