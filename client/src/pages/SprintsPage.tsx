import { useState } from "react";
import { useStore, useProject, useSprints, useIssues } from "@/lib/storeContext";
import { Plus, Play, CheckCircle, Clock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, cn } from "@/lib/utils";
import type { Sprint, Issue, Project } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface Props { projectId: string; orgId: string; }

export default function SprintsPage({ projectId, orgId }: Props) {
  const { store, refresh } = useStore();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", startDate: "", endDate: "" });

  const project = useProject(projectId);
  const sprints = useSprints(projectId);
  const issues = useIssues(projectId);

  const createSprint = (data: typeof form) => {
    store.createSprint({ ...data, projectId, orgId, status: "planning" });
    refresh(); setCreateOpen(false); setForm({ name: "", goal: "", startDate: "", endDate: "" }); toast({ title: "Sprint created" });
  };
  const updateSprint = (id: string, status: string) => { store.updateSprint(id, { status: status as any }); refresh(); };

  const getSprintIssues = (sprintId: string) => issues.filter(i => i.sprintId === sprintId);

  const sorted = [...sprints].sort((a, b) => {
    const order = { active: 0, planning: 1, completed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <h2 className="text-base font-semibold flex-1" style={{ fontFamily: "var(--font-display)" }}>Sprints</h2>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)} data-testid="button-create-sprint">
          <Plus className="w-3.5 h-3.5" />
          New Sprint
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Clock className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-semibold mb-2">No sprints yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Create your first sprint to start planning</p>
            <Button onClick={() => setCreateOpen(true)}>Create Sprint</Button>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl">
            {sorted.map(sprint => {
              const sIssues = getSprintIssues(sprint.id);
              const done = sIssues.filter(i => i.status === "done").length;
              const inProgress = sIssues.filter(i => i.status === "in_progress").length;
              const pct = sIssues.length > 0 ? Math.round((done / sIssues.length) * 100) : 0;

              return (
                <Card key={sprint.id} className={cn(sprint.status === "active" && "border-primary/30 bg-primary/5")} data-testid={`sprint-card-${sprint.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{sprint.name}</CardTitle>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 capitalize", {
                            "border-blue-500 text-blue-500 bg-blue-500/10": sprint.status === "active",
                            "border-yellow-500 text-yellow-500 bg-yellow-500/10": sprint.status === "planning",
                            "border-green-500 text-green-500 bg-green-500/10": sprint.status === "completed",
                          })}>
                            {sprint.status}
                          </Badge>
                        </div>
                        {sprint.goal && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                            {sprint.goal}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sprint.status === "planning" && (
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => updateSprint(sprint.id, "active")}>
                            <Play className="w-3.5 h-3.5" />
                            Start Sprint
                          </Button>
                        )}
                        {sprint.status === "active" && (
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-green-500 text-green-600" onClick={() => updateSprint(sprint.id, "completed")}>
                            <CheckCircle className="w-3.5 h-3.5" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(sprint.startDate || sprint.endDate) && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        {sprint.startDate && <span>Start: {formatDate(sprint.startDate)}</span>}
                        {sprint.endDate && <span>End: {formatDate(sprint.endDate)}</span>}
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <StatChip label="Total" value={sIssues.length} />
                      <StatChip label="To Do" value={sIssues.filter(i => i.status === "todo").length} />
                      <StatChip label="In Progress" value={inProgress} color="text-blue-500" />
                      <StatChip label="Done" value={done} color="text-green-500" />
                    </div>

                    {sIssues.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Progress</span>
                          <span className="text-xs font-medium">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    )}

                    {/* Bug / Story points */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span>{sIssues.filter(i => i.type === "bug").length} bugs</span>
                      <span>{sIssues.filter(i => i.type === "story").length} stories</span>
                      <span>{sIssues.filter(i => i.type === "task").length} tasks</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Sprint Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md" data-testid="create-sprint-dialog">
          <DialogHeader><DialogTitle>New Sprint</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block">Sprint Name *</Label>
              <Input placeholder="Sprint 2" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} data-testid="input-sprint-name" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Sprint Goal</Label>
              <Textarea placeholder="What should be accomplished?" value={form.goal} onChange={e => setForm(p => ({ ...p, goal: e.target.value }))} className="resize-none min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createSprint(form)} disabled={!form.name} data-testid="button-save-sprint">
              Create Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/50 border border-border">
      <p className={cn("text-lg font-bold leading-none", color || "text-foreground")}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
