import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronDown, ChevronRight, Search, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { IssueTypeIcon, PriorityIcon, StatusIcon } from "@/components/IssueIcon";
import CreateIssueDialog from "@/components/CreateIssueDialog";
import { apiRequest } from "@/lib/queryClient";
import { STATUS_LABELS, cn } from "@/lib/utils";
import type { Issue, Project, Sprint, User } from "@shared/schema";
import { useLocation } from "wouter";

interface Props { projectId: string; orgId: string; }

export default function BacklogPage({ projectId, orgId }: Props) {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [sprintsExpanded, setSprintsExpanded] = useState<Record<string, boolean>>({ backlog: true });

  const { data: project } = useQuery<Project>({ queryKey: [`/api/projects/${projectId}`] });
  const { data: issues = [], isLoading } = useQuery<Issue[]>({ queryKey: [`/api/projects/${projectId}/issues`] });
  const { data: sprints = [] } = useQuery<Sprint[]>({ queryKey: [`/api/projects/${projectId}/sprints`] });
  const { data: members = [] } = useQuery<any[]>({ queryKey: [`/api/orgs/${orgId}/members`] });

  const startSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      const res = await apiRequest("PATCH", `/api/sprints/${sprintId}`, { status: "active" });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/sprints`] });
    },
  });

  const completeSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      const res = await apiRequest("PATCH", `/api/sprints/${sprintId}`, { status: "completed" });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/sprints`] });
    },
  });

  const filtered = issues.filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()));

  const sprintIssues = (sprintId: string) => filtered.filter(i => i.sprintId === sprintId);
  const backlogIssues = filtered.filter(i => !i.sprintId);

  const toggle = (key: string) => setSprintsExpanded(p => ({ ...p, [key]: !p[key] }));

  if (!project) return null;

  const sortedSprints = [...sprints].sort((a, b) => {
    const order = { active: 0, planning: 1, completed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <h2 className="text-base font-semibold flex-1" style={{ fontFamily: "var(--font-display)" }}>Backlog</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 w-48 text-xs"
            placeholder="Filter…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)} data-testid="button-create-backlog">
          <Plus className="w-3.5 h-3.5" />
          Create Issue
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Sprint sections */}
        {sortedSprints.map(sprint => {
          const sIssues = sprintIssues(sprint.id);
          const done = sIssues.filter(i => i.status === "done").length;
          const pct = sIssues.length > 0 ? Math.round((done / sIssues.length) * 100) : 0;
          const expanded = sprintsExpanded[sprint.id] !== false;

          return (
            <div key={sprint.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Sprint header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggle(sprint.id)}
              >
                {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <GitBranch className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{sprint.name}</span>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 capitalize", {
                  "border-blue-500 text-blue-500": sprint.status === "active",
                  "border-yellow-500 text-yellow-500": sprint.status === "planning",
                  "border-green-500 text-green-500": sprint.status === "completed",
                })}>
                  {sprint.status}
                </Badge>
                {sprint.goal && <span className="text-xs text-muted-foreground truncate">{sprint.goal}</span>}
                <div className="flex-1" />
                <span className="text-xs text-muted-foreground">{done}/{sIssues.length} done</span>
                {sIssues.length > 0 && <Progress value={pct} className="h-1 w-16" />}
                {sprint.status === "planning" && (
                  <Button
                    size="sm" variant="outline" className="h-6 text-xs px-2 ml-2"
                    onClick={e => { e.stopPropagation(); startSprintMutation.mutate(sprint.id); }}
                    data-testid={`button-start-sprint-${sprint.id}`}
                  >
                    Start Sprint
                  </Button>
                )}
                {sprint.status === "active" && (
                  <Button
                    size="sm" variant="outline" className="h-6 text-xs px-2 ml-2 border-green-500 text-green-600 hover:bg-green-50"
                    onClick={e => { e.stopPropagation(); completeSprintMutation.mutate(sprint.id); }}
                  >
                    Complete
                  </Button>
                )}
              </div>

              {/* Sprint issues */}
              {expanded && (
                <div className="border-t border-border divide-y divide-border">
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 mx-4 my-2" />)
                  ) : sIssues.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-muted-foreground text-center">No issues in this sprint</div>
                  ) : sIssues.map(issue => (
                    <IssueRow key={issue.id} issue={issue} project={project} orgId={orgId} members={members}
                      onClick={() => window.location.hash = `/org/${orgId}/project/${projectId}/issue/${issue.id}`}
                    />
                  ))}
                  <div className="px-4 py-2">
                    <button
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add issue to sprint
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Backlog */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggle("backlog")}
          >
            {sprintsExpanded.backlog !== false ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <span className="text-sm font-semibold">Backlog</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{backlogIssues.length}</Badge>
            <div className="flex-1" />
          </div>
          {sprintsExpanded.backlog !== false && (
            <div className="border-t border-border divide-y divide-border">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 mx-4 my-2" />)
              ) : backlogIssues.length === 0 ? (
                <div className="px-4 py-4 text-xs text-muted-foreground text-center">Backlog is empty</div>
              ) : backlogIssues.map(issue => (
                <IssueRow key={issue.id} issue={issue} project={project} orgId={orgId} members={members}
                  onClick={() => window.location.hash = `/org/${orgId}/project/${projectId}/issue/${issue.id}`}
                />
              ))}
              <div className="px-4 py-2">
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create issue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {createOpen && (
        <CreateIssueDialog
          open
          onClose={() => setCreateOpen(false)}
          projectId={projectId}
          orgId={orgId}
        />
      )}
    </div>
  );
}

function IssueRow({ issue, project, orgId, members, onClick }: {
  issue: Issue; project: Project; orgId: string; members: any[]; onClick: () => void;
}) {
  const assignee = members.find((m: any) => m.userId === issue.assigneeId)?.user;
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 hover:bg-muted/20 cursor-pointer transition-colors"
      onClick={onClick}
      data-testid={`issue-row-${issue.id}`}
    >
      <StatusIcon status={issue.status} className="w-3.5 h-3.5 shrink-0" />
      <IssueTypeIcon type={issue.type} className="w-3.5 h-3.5 shrink-0" />
      <span className="text-xs font-mono text-muted-foreground w-14 shrink-0">{project.key}-{issue.number}</span>
      <span className="flex-1 text-sm truncate">{issue.title}</span>
      <PriorityIcon priority={issue.priority} className="w-3.5 h-3.5 shrink-0" />
      {assignee && (
        <span className="text-xs text-muted-foreground truncate max-w-[80px]">{assignee.name}</span>
      )}
    </div>
  );
}
