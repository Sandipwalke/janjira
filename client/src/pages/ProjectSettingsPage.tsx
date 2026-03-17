import { useState } from "react";
import { useStore, useProject, useIssues } from "@/lib/storeContext";
import { Settings, Palette, Trash2, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Props { projectId: string; orgId: string; }

const PRESET_COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#f59e0b", "#22c55e", "#10b981", "#0ea5e9",
  "#64748b", "#1e293b",
];

export default function ProjectSettingsPage({ projectId, orgId }: Props) {
  const { store, refresh } = useStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const project = useProject(projectId);
  const issues = useIssues(projectId);

  const [name, setName] = useState(project?.name || "");
  const [key, setKey] = useState(project?.key || "");
  const [color, setColor] = useState(project?.color || PRESET_COLORS[0]);
  const [desc, setDesc] = useState((project as any)?.description || "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [saved, setSaved] = useState(false);

  if (!project) return null;

  const handleSave = () => {
    store.updateProject(projectId, { name: name.trim() || project.name, key: key.trim().toUpperCase() || project.key, color });
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast({ title: "Project settings saved" });
  };

  const handleDelete = () => {
    store.deleteProject(projectId);
    refresh();
    setLocation(`/org/${orgId}/dashboard`);
    toast({ title: "Project deleted", variant: "destructive" });
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <Settings className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold flex-1" style={{ fontFamily: "var(--font-display)" }}>Project Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* General */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">General</CardTitle>
            <CardDescription className="text-xs">Rename or adjust the project identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5">Project name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={project.name}
                data-testid="input-project-name"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Project key</label>
              <div className="flex items-center gap-2">
                <Input
                  value={key}
                  onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder={project.key}
                  className="w-28 font-mono uppercase"
                  data-testid="input-project-key"
                />
                <span className="text-xs text-muted-foreground">Used as issue prefix, e.g. {key || project.key}-1</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2">Project color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                    style={{ background: c, borderColor: color === c ? "white" : "transparent", outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                    onClick={() => setColor(c)}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-7 h-7 rounded-full cursor-pointer border border-border bg-transparent"
                  title="Custom color"
                />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ background: color }}
                >
                  {(key || project.key).slice(0, 2)}
                </span>
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
            </div>
            <Button onClick={handleSave} className="gap-2" data-testid="button-save-project-settings">
              {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Project Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Issues</p>
                <p className="font-semibold">{issues.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Completed</p>
                <p className="font-semibold">{issues.filter(i => i.status === "done").length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Project Key</p>
                <p className="font-mono font-semibold">{project.key}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Project ID</p>
                <p className="font-mono text-xs text-muted-foreground truncate">{project.id}</p>
              </div>
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
                <p className="text-sm font-medium">Delete this project</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently delete the project and all its issues. This cannot be undone.</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="ml-4 shrink-0"
                onClick={() => setDeleteOpen(true)}
                data-testid="button-delete-project"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md" data-testid="delete-project-dialog">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Project</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{project.name}</strong> and all {issues.length} issue{issues.length !== 1 ? "s" : ""} within it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs font-medium block mb-1.5">
              Type <strong>{project.name}</strong> to confirm
            </label>
            <Input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={project.name}
              data-testid="input-delete-confirm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== project.name}
              onClick={handleDelete}
              data-testid="button-confirm-delete-project"
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
