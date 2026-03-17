import { useState } from "react";
import { useStore, useLabels, useIssues } from "@/lib/storeContext";
import { Plus, Pencil, Trash2, Tag, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props { projectId: string; orgId: string; }

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#10b981",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#6b7280",
];

export default function LabelsPage({ projectId, orgId }: Props) {
  const { store, refresh } = useStore();
  const { toast } = useToast();
  const labels = useLabels(projectId);
  const issues = useIssues(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[5]);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const usageCount = (labelId: string) => issues.filter(i => i.labelIds.includes(labelId)).length;

  const handleCreate = () => {
    if (!name.trim()) return;
    store.createLabel({ projectId, name: name.trim(), color });
    refresh();
    setName(""); setColor(PRESET_COLORS[5]);
    setCreateOpen(false);
    toast({ title: "Label created" });
  };

  const handleEdit = (id: string) => {
    store.updateLabel(id, { name: editName.trim(), color: editColor });
    refresh();
    setEditingId(null);
    toast({ title: "Label updated" });
  };

  const handleDelete = (id: string, labelName: string) => {
    store.deleteLabel(id);
    refresh();
    toast({ title: "Label deleted", description: `"${labelName}" removed` });
  };

  const startEdit = (label: { id: string; name: string; color: string }) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <Tag className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold flex-1" style={{ fontFamily: "var(--font-display)" }}>Labels</h2>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)} data-testid="button-create-label">
          <Plus className="w-3.5 h-3.5" />
          New Label
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        {labels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Tag className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No labels yet</p>
            <p className="text-xs text-muted-foreground mb-4">Labels help organize and filter your issues</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>Create your first label</Button>
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{labels.length} label{labels.length !== 1 ? "s" : ""}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {labels.map(label => (
                  <div key={label.id} className="flex items-center gap-3 px-6 py-3 group" data-testid={`label-row-${label.id}`}>
                    {editingId === label.id ? (
                      // Inline edit
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex gap-1">
                          {PRESET_COLORS.map(c => (
                            <button
                              key={c}
                              className="w-5 h-5 rounded-full border-2 transition-all"
                              style={{ background: c, borderColor: editColor === c ? "white" : "transparent" }}
                              onClick={() => setEditColor(c)}
                            />
                          ))}
                        </div>
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="h-7 text-xs flex-1"
                          autoFocus
                          onKeyDown={e => { if (e.key === "Enter") handleEdit(label.id); if (e.key === "Escape") setEditingId(null); }}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={() => handleEdit(label.id)}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ background: label.color }}
                        />
                        <span
                          className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ background: label.color + "20", color: label.color }}
                        >
                          {label.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{label.color}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {usageCount(label.id)} issue{usageCount(label.id) !== 1 ? "s" : ""}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => startEdit(label)}
                            data-testid={`button-edit-label-${label.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(label.id, label.name)}
                            data-testid={`button-delete-label-${label.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm" data-testid="create-label-dialog">
          <DialogHeader><DialogTitle>Create Label</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5">Label name</label>
              <Input
                placeholder="e.g. performance, security…"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
                data-testid="input-label-name"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                    style={{ background: c, borderColor: color === c ? "white" : "transparent", outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            {name && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Preview:</span>
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: color + "20", color }}>
                  {name}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim()} data-testid="button-confirm-create-label">
              Create Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
