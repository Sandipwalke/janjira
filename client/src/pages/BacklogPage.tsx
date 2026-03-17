import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, Search, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IssueTypeIcon, PriorityIcon, StatusIcon } from "@/components/IssueIcon";
import CreateIssueDialog from "@/components/CreateIssueDialog";
import { PRIORITY_LABELS, STATUS_LABELS, cn } from "@/lib/utils";
import type { Issue, Project, Sprint, User, IssuePriority, IssueStatus } from "@shared/schema";
import { useStore, useProject, useIssues, useSprints, useUsers } from "@/lib/storeContext";

interface Props { projectId: string; orgId: string; }

export default function BacklogPage({ projectId, orgId }: Props) {
  const { store, refresh } = useStore();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [sprintsExpanded, setSprintsExpanded] = useState<Record<string, boolean>>({ backlog: true });

  const project = useProject(projectId);
  const issues = useIssues(projectId);
  const sprints = useSprints(projectId);
  const allUsers = useUsers();

  const filtered = issues.filter(i => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterPriority !== "all" && i.priority !== filterPriority) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const sprintIssues = (sprintId: string) => filtered.filter(i => i.sprintId === sprintId);
  const backlogIssues = filtered.filter(i => !i.sprintId);
  const toggle = (key: string) => setSprintsExpanded(p => ({ ...p, [key]: !p[key] }));

  const startSprint = (sprintId: string) => { store.updateSprint(sprintId, { status: "active" }); refresh(); };
  const completeSprint = (sprintId: string) => { store.updateSprint(sprintId, { status: "completed" }); refresh(); };
  const updateIssueStatus = (issueId: string, status: IssueStatus) => { store.updateIssue(issueId, { status }); refresh(); };
  const moveIssueToSprint = (issueId: string, sprintId: string) => {
    store.updateIssue(issueId, { sprintId: sprintId === "backlog" ? undefined : sprintId });
    refresh();
  };

  if (!project) return null;

  const sortedSprints = [...sprints].sort((a, b) => {
    const order: Record<string, number> = { active: 0, planning: 1, completed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
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
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(["todo", "in_progress", "in_review", "done", "cancelled"] as IssueStatus[]).map(status => (
              <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {(["urgent", "high", "medium", "low", "none"] as IssuePriority[]).map(priority => (
              <SelectItem key={priority} value={priority}>{PRIORITY_LABELS[priority]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)} data-testid="button-create-backlog">
          <Plus className="w-3.5 h-3.5" />
          Create Issue
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedSprints.map(sprint => {
          const sIssues = sprintIssues(sprint.id);
          const done = sIssues.filter(i => i.status === "done").length;
          const pct = sIssues.length > 0 ? Math.round((done / sIssues.length) * 100) : 0;
          const expanded = sprintsExpanded[sprint.id] !== false;

          return (
            <div key={sprint.id} className="rounded-xl border border-border bg-card overflow-hidden">
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
                    onClick={e => { e.stopPropagation(); startSprint(sprint.id); }}
                  >
                    Start Sprint
                  </Button>
                )}
                {sprint.status === "active" && (
                  <Button
                    size="sm" variant="outline" className="h-6 text-xs px-2 ml-2 border-green-500 text-green-600 hover:bg-green-50"
                    onClick={e => { e.stopPropagation(); completeSprint(sprint.id); }}
                  >
                    Complete
                  </Button>
                )}
              </div>

              {expanded && (
                <div className="border-t border-border divide-y divide-border">
                  {sIssues.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-muted-foreground text-center">No issues in this sprint</div>
                  ) : sIssues.map(issue => (
                    <IssueRow key={issue.id} issue={issue} project={project} allUsers={allUsers}
                      sprints={sprints}
                      onStatusChange={(status) => updateIssueStatus(issue.id, status)}
                      onSprintChange={(sprintId) => moveIssueToSprint(issue.id, sprintId)}
                      onClick={() => { window.location.hash = `/org/${orgId}/project/${projectId}/issue/${issue.id}`; }}
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
              {backlogIssues.length === 0 ? (
                <div className="px-4 py-4 text-xs text-muted-foreground text-center">Backlog is empty</div>
              ) : backlogIssues.map(issue => (
                <IssueRow key={issue.id} issue={issue} project={project} allUsers={allUsers}
                  sprints={sprints}
                  onStatusChange={(status) => updateIssueStatus(issue.id, status)}
                  onSprintChange={(sprintId) => moveIssueToSprint(issue.id, sprintId)}
                  onClick={() => { window.location.hash = `/org/${orgId}/project/${projectId}/issue/${issue.id}`; }}
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

function IssueRow({ issue, project, allUsers, sprints, onStatusChange, onSprintChange, onClick }: {
  issue: Issue;
  project: Project;
  allUsers: User[];
  sprints: Sprint[];
  onStatusChange: (status: IssueStatus) => void;
  onSprintChange: (sprintId: string) => void;
  onClick: () => void;
}) {
  const assignee = allUsers.find(u => u.id === issue.assigneeId);
  const sprintValue = issue.sprintId ?? "backlog";

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
      <Select value={issue.status} onValueChange={(v) => onStatusChange(v as IssueStatus)}>
        <SelectTrigger
          className="h-7 w-32 text-xs"
          onClick={e => e.stopPropagation()}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(["todo", "in_progress", "in_review", "done", "cancelled"] as IssueStatus[]).map(status => (
            <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sprintValue} onValueChange={onSprintChange}>
        <SelectTrigger
          className="h-7 w-32 text-xs"
          onClick={e => e.stopPropagation()}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="backlog">Backlog</SelectItem>
          {sprints.map(sprint => (
            <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
