import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, ArrowUpDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IssueTypeIcon, PriorityIcon, StatusIcon } from "@/components/IssueIcon";
import CreateIssueDialog from "@/components/CreateIssueDialog";
import { apiRequest } from "@/lib/queryClient";
import { STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS } from "@/lib/utils";
import type { Issue, Project, Label } from "@shared/schema";
import type { IssueStatus, IssuePriority, IssueType } from "@shared/schema";
import { useLocation } from "wouter";
import { formatRelative } from "@/lib/utils";

interface Props { projectId: string; orgId: string; }

export default function IssuesPage({ projectId, orgId }: Props) {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: project } = useQuery<Project>({ queryKey: [`/api/projects/${projectId}`] });
  const { data: issues = [], isLoading } = useQuery<Issue[]>({ queryKey: [`/api/projects/${projectId}/issues`] });
  const { data: labels = [] } = useQuery<Label[]>({ queryKey: [`/api/projects/${projectId}/labels`] });
  const { data: members = [] } = useQuery<any[]>({ queryKey: [`/api/orgs/${orgId}/members`] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/issues/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/issues`] }),
  });

  const filtered = issues.filter(i => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterPriority !== "all" && i.priority !== filterPriority) return false;
    if (filterType !== "all" && i.type !== filterType) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!project) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0 flex-wrap">
        <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>Issues</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 w-48 text-xs" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["todo","in_progress","in_review","done","cancelled"].map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s as IssueStatus]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {["urgent","high","medium","low","none"].map(p => (
              <SelectItem key={p} value={p}>{PRIORITY_LABELS[p as IssuePriority]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["task","bug","story","epic","subtask"].map(t => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t as IssueType]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{filtered.length} issues</span>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)} data-testid="button-create-issue-list">
          <Plus className="w-3.5 h-3.5" />
          Create
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-2 text-xs font-medium text-muted-foreground border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
          <span className="w-4" />
          <span className="w-4" />
          <span className="w-16 shrink-0">ID</span>
          <span className="flex-1">Title</span>
          <span className="w-24 shrink-0">Status</span>
          <span className="w-20 shrink-0">Priority</span>
          <span className="w-24 shrink-0">Assignee</span>
          <span className="w-24 shrink-0">Updated</span>
          <span className="w-8" />
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-sm">No issues match your filters</p>
            <Button variant="link" onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setFilterType("all"); setSearch(""); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(issue => {
              const assignee = members.find((m: any) => m.userId === issue.assigneeId)?.user;
              const issueLabels = labels.filter(l => issue.labelIds.includes(l.id));
              return (
                <div
                  key={issue.id}
                  className="flex items-center gap-3 px-6 py-2.5 hover:bg-muted/20 cursor-pointer transition-colors group"
                  onClick={() => setLocation(`/org/${orgId}/project/${projectId}/issue/${issue.id}`)}
                  data-testid={`issue-row-${issue.id}`}
                >
                  <StatusIcon status={issue.status} className="w-3.5 h-3.5 shrink-0" />
                  <IssueTypeIcon type={issue.type} className="w-3.5 h-3.5 shrink-0" />
                  <span className="w-16 shrink-0 text-xs font-mono text-muted-foreground">{project.key}-{issue.number}</span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-sm truncate">{issue.title}</span>
                    {issueLabels.slice(0, 2).map(l => (
                      <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded-full hidden sm:inline"
                        style={{ background: l.color + "22", color: l.color }}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                  <div className="w-24 shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium status-${issue.status}`}>
                      {STATUS_LABELS[issue.status]}
                    </span>
                  </div>
                  <div className="w-20 shrink-0 flex items-center gap-1">
                    <PriorityIcon priority={issue.priority} className="w-3 h-3" />
                    <span className="text-xs text-muted-foreground">{PRIORITY_LABELS[issue.priority]}</span>
                  </div>
                  <span className="w-24 shrink-0 text-xs text-muted-foreground truncate">
                    {assignee?.name || "—"}
                  </span>
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">{formatRelative(issue.updatedAt)}</span>
                  <button
                    className="w-8 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={e => { e.stopPropagation(); deleteMutation.mutate(issue.id); }}
                    data-testid={`button-delete-issue-${issue.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {createOpen && (
        <CreateIssueDialog open onClose={() => setCreateOpen(false)} projectId={projectId} orgId={orgId} />
      )}
    </div>
  );
}
