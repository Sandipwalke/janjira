import { useProject, useIssues, useSprints } from "@/lib/storeContext";
import { Zap, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, STATUS_LABELS } from "@/lib/utils";
import { IssueTypeIcon } from "@/components/IssueIcon";
import type { Issue, Sprint, Project } from "@shared/schema";
import { useLocation } from "wouter";

interface Props { projectId: string; orgId: string; }

export default function RoadmapPage({ projectId, orgId }: Props) {
  const [, setLocation] = useLocation();
  const project = useProject(projectId);
  const issues = useIssues(projectId);
  const sprints = useSprints(projectId);

  const epics = issues.filter(i => i.type === "epic");
  const stories = issues.filter(i => i.type === "story");
  const tasks = issues.filter(i => i.type === "task" || i.type === "bug");

  const doneRatio = (list: Issue[]) => {
    if (!list.length) return 0;
    return Math.round((list.filter(i => i.status === "done").length / list.length) * 100);
  };

  if (!project) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <h2 className="text-base font-semibold flex-1" style={{ fontFamily: "var(--font-display)" }}>Roadmap</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded-sm bg-blue-500/30 inline-block" />To Do
          <span className="w-3 h-3 rounded-sm bg-yellow-500/30 inline-block ml-2" />In Progress
          <span className="w-3 h-3 rounded-sm bg-green-500/30 inline-block ml-2" />Done
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard label="Epics" count={epics.length} done={epics.filter(i=>i.status==="done").length} color="#8B5CF6" />
          <SummaryCard label="Stories" count={stories.length} done={stories.filter(i=>i.status==="done").length} color="#10B981" />
          <SummaryCard label="Tasks & Bugs" count={tasks.length} done={tasks.filter(i=>i.status==="done").length} color="#3B82F6" />
        </div>

        {/* Sprints Timeline */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Sprint Overview</h3>
          <div className="space-y-2">
            {sprints.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sprints yet.</p>
            ) : sprints.map(sprint => {
              const sprintIssues = issues.filter(i => i.sprintId === sprint.id);
              const pct = sprintIssues.length > 0
                ? Math.round((sprintIssues.filter(i => i.status === "done").length / sprintIssues.length) * 100)
                : 0;
              return (
                <div key={sprint.id} className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors">
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-medium truncate">{sprint.name}</p>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 mt-0.5 capitalize", {
                      "text-blue-500 border-blue-500": sprint.status === "active",
                      "text-yellow-500 border-yellow-500": sprint.status === "planning",
                      "text-green-500 border-green-500": sprint.status === "completed",
                    })}>
                      {sprint.status}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{sprintIssues.length} issues</span>
                      <span className="text-xs font-medium">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  <div className="flex gap-1.5 text-xs text-muted-foreground shrink-0">
                    <span className="text-blue-500">{sprintIssues.filter(i=>i.status==="in_progress").length} active</span>
                    <span>·</span>
                    <span className="text-green-500">{sprintIssues.filter(i=>i.status==="done").length} done</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Epics */}
        {epics.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              Epics
            </h3>
            <div className="space-y-2">
              {epics.map(epic => {
                const epicChildren = issues.filter(i => i.parentId === epic.id || i.type !== "epic");
                const childDone = issues.filter(i => i.status === "done" && i.type !== "epic").length;
                const pct = doneRatio([epic]);
                return (
                  <div
                    key={epic.id}
                    className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setLocation(`/org/${orgId}/project/${projectId}/issue/${epic.id}`)}
                    data-testid={`epic-row-${epic.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <IssueTypeIcon type="epic" className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{epic.title}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium status-${epic.status}`}>
                            {STATUS_LABELS[epic.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-xs font-mono text-muted-foreground">{project.key}-{epic.number}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All issues grouped by status */}
        <div>
          <h3 className="text-sm font-semibold mb-3">All Issues by Status</h3>
          <div className="grid grid-cols-2 gap-3">
            {["todo","in_progress","in_review","done","cancelled"].map(status => {
              const statusIssues = issues.filter(i => i.status === status);
              return (
                <div key={status} className={cn("p-3 rounded-xl border", {
                  "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30": status === "todo",
                  "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20": status === "in_progress",
                  "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20": status === "in_review",
                  "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20": status === "done",
                  "border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/10": status === "cancelled",
                })}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold">{STATUS_LABELS[status as any]}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{statusIssues.length}</Badge>
                  </div>
                  {statusIssues.slice(0, 5).map(i => (
                    <p key={i.id} className="text-xs text-muted-foreground truncate py-0.5">{i.title}</p>
                  ))}
                  {statusIssues.length > 5 && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1">+{statusIssues.length - 5} more</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, count, done, color }: { label: string; count: number; done: number; color: string }) {
  const pct = count > 0 ? Math.round((done / count) * 100) : 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold leading-none mb-1">{count}</p>
      <p className="text-xs text-muted-foreground mb-2">{done} completed</p>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}
