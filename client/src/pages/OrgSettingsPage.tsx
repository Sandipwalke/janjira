import { useState } from "react";
import { useStore, useOrg, useProjects, useOrgMembers } from "@/lib/storeContext";
import { Settings, Building2, HardDrive, Shield, Check, AlertTriangle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Props { orgId: string; }

export default function OrgSettingsPage({ orgId }: Props) {
  const { store, refresh } = useStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const org = useOrg(orgId);
  const projects = useProjects(orgId);
  const members = useOrgMembers(orgId);

  const [orgName, setOrgName] = useState(org?.name || "");
  const [slug, setSlug] = useState(org?.slug || "");
  const [saved, setSaved] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  if (!org) return null;

  const handleSave = () => {
    store.updateOrg(orgId, {
      name: orgName.trim() || org.name,
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || org.slug,
    });
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast({ title: "Organisation settings saved" });
  };

  const handleConnectDrive = () => {
    // Simulate Google OAuth popup for Drive
    toast({ title: "Google Drive", description: "In production, this would launch Google OAuth to connect your Drive folder." });
    setDriveConnected(true);
    setDriveEmail("sandipwalke05@gmail.com");
  };

  const handleDisconnectDrive = () => {
    setDriveConnected(false);
    setDriveEmail("");
    toast({ title: "Drive disconnected" });
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <Settings className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold flex-1" style={{ fontFamily: "var(--font-display)" }}>Organisation Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* General */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              General
            </CardTitle>
            <CardDescription className="text-xs">Your organisation's public identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5">Organisation name</label>
              <Input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder={org.name}
                data-testid="input-org-name"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">URL slug</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">janjira.app/</span>
                <Input
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder={org.slug}
                  className="flex-1"
                  data-testid="input-org-slug"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Changing this will break existing invite links.</p>
            </div>
            <Button onClick={handleSave} className="gap-2" data-testid="button-save-org-settings">
              {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Workspace Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <p className="text-2xl font-bold">{org.plan === "free" ? "Free" : "Pro"}</p>
                <p className="text-xs text-muted-foreground">Plan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Google Drive integration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Google Drive Storage
            </CardTitle>
            <CardDescription className="text-xs">Connect Google Drive for encrypted data storage and file attachments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {driveConnected ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Connected</p>
                    <p className="text-xs text-muted-foreground">{driveEmail}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs" onClick={handleDisconnectDrive}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Not connected</p>
                    <p className="text-xs text-muted-foreground">Connect Drive to enable cloud storage</p>
                  </div>
                </div>
                <Button size="sm" className="text-xs gap-1.5" onClick={handleConnectDrive} data-testid="button-connect-drive">
                  Connect Drive
                </Button>
              </div>
            )}
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /> Data is encrypted at rest using AES-256</p>
              <p className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-primary" /> Stored in a private hidden folder in your Drive</p>
              <p className="flex items-center gap-2"><HardDrive className="w-3.5 h-3.5 text-primary" /> Up to 15 GB free with your Google account</p>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Require Google sign-in</p>
                <p className="text-xs text-muted-foreground">Members must authenticate with Google</p>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Public join</p>
                <p className="text-xs text-muted-foreground">Allow anyone with the link to join as a viewer</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete organisation</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently delete all projects, issues, and members. This cannot be undone.</p>
              </div>
              <Button
                variant="destructive" size="sm" className="ml-4 shrink-0"
                onClick={() => setDeleteOpen(true)}
                data-testid="button-delete-org"
              >
                Delete Org
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md" data-testid="delete-org-dialog">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Organisation</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{org.name}</strong>, all {projects.length} project{projects.length !== 1 ? "s" : ""}, and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs font-medium block mb-1.5">
              Type <strong>{org.name}</strong> to confirm
            </label>
            <Input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={org.name}
              data-testid="input-delete-org-confirm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== org.name}
              onClick={() => { toast({ title: "Demo: Cannot delete demo org", variant: "destructive" }); setDeleteOpen(false); }}
              data-testid="button-confirm-delete-org"
            >
              Delete Organisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
