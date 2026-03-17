import { useState } from "react";
import { useStore, useIssue, useProject, useComments, useActivity, useLabels, useSprints, useOrgMembers, useUsers } from "@/lib/storeContext";
import { useLocation } from "wouter";
import { ArrowLeft, Pencil, Trash2, Send, Link2, Calendar, User2, Tag, Layers, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { IssueTypeIcon, PriorityIcon, StatusIcon } from "@/components/IssueIcon";
import { STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, formatRelative, cn } from "@/lib/utils";
import type { Issue, Comment, Label, User, Project, Sprint, Activity } from "@shared/schema";
import type { IssueStatus, IssuePriority, IssueType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface Props { issueId: string; projectId: string; orgId: string; }

export default function IssueDetailPage({ issueId, projectId, orgId }: Props) {
  const { store, refresh } = useStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState("");

  const issue = useIssue(issueId);
  const project = useProject(projectId);
  const comments = useComments(issueId);
  const activity = useActivity(issueId);
  const labels = useLabels(projectId);
  const sprints = useSprints(projectId);
  const allUsers = useUsers();

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<Issue>) => {
      const res = await apiRequest("PATCH", `/api/issues/${issueId}`, patch);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/issues/${issueId}`] });
      qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/issues`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/issues/${issueId}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/issues`] });
      setLocation(`/org/${orgId}/project/${projectId}/issues`);
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await apiRequest("POST", `/api/issues/${issueId}/comments`, { body });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/issues/${issueId}/comments`] });
      setCommentText("");
    },
  });

  const deleteComment = (id: string) => { store.deleteComment(id); refresh(); };

  const initials = (name?: string) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  if (false || !project) {
    return <div className="flex-1 p-8 space-y-4">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;
  }
  if (!issue) return <div className="flex-1 p-8 text-muted-foreground">Issue not found.</div>;

  const issueLabels = labels.filter(l => issue.labelIds.includes(l.id));
  const activeSprint = sprints.find(s => s.id === issue.sprintId);
  const assignee = allUsers.find(u => u.id === issue.assigneeId);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => history.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs font-mono text-muted-foreground">{project.key}-{issue.number}</span>
        <IssueTypeIcon type={issue.type} className="w-4 h-4" />
        <div className="flex-1" />
        <Button
          variant="ghost" size="sm"
          className="h-8 text-xs text-destructive hover:bg-destructive/10"
          onClick={() => deleteIssue()}
          data-testid="button-delete-issue"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          Delete
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Title */}
          <h1 className="text-xl font-bold mb-4 leading-snug" style={{ fontFamily: "var(--font-display)" }}>{issue.title}</h1>

          {/* Status badges */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded-full font-medium status-${issue.status}`}>
              {STATUS_LABELS[issue.status]}
            </span>
            <Badge variant="outline" className="text-xs gap-1 capitalize">{issue.type}</Badge>
            <div className="flex items-center gap-1.5">
              <PriorityIcon priority={issue.priority} className="w-3.5 h-3.5" />
              <span className="text-xs text-muted-foreground">{PRIORITY_LABELS[issue.priority]}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setEditingDesc(!editingDesc); setDesc(issue.description || ""); }}>
                <Pencil className="w-3 h-3 mr-1" />
                {editingDesc ? "Cancel" : "Edit"}
              </Button>
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="min-h-[120px] text-sm resize-none"
                  placeholder="Add a description (markdown supported)…"
                />
                <Button size="sm" className="h-8 text-xs" onClick={() => {
                  updateIssue({ description: desc });
                  setEditingDesc(false);
                }}>
                  Save
                </Button>
              </div>
            ) : issue.description ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                <ReactMarkdown>{issue.description}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic">No description provided.</p>
            )}
          </div>

          <Separator className="mb-5" />

          {/* Comments + Activity */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Activity</h3>

            {/* Activity */}
            <div className="space-y-2 mb-4">
              {activity.map((a: any) => (
                <div key={a.id} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Avatar className="w-5 h-5 mt-0.5 shrink-0">
                    <AvatarImage src={a.user?.avatar} />
                    <AvatarFallback className="text-[8px]">{initials(a.user?.name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{a.user?.name}</span>
                  <span>{getActivityText(a)}</span>
                  <span className="ml-auto shrink-0">{formatRelative(a.createdAt)}</span>
                </div>
              ))}
            </div>

            {/* Comments */}
            {commentsLoading ? <Skeleton className="h-16" /> : comments.map((c: any) => (
              <div key={c.id} className="flex gap-3 mb-4 group" data-testid={`comment-${c.id}`}>
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={c.author?.avatar} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(c.author?.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{c.author?.name}</span>
                    {c.edited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                    <span className="text-xs text-muted-foreground ml-auto">{formatRelative(c.createdAt)}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => deleteComment(c.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-sm leading-relaxed bg-muted/40 rounded-lg px-3 py-2">
                    <ReactMarkdown className="prose prose-sm dark:prose-invert">{c.body}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {/* New comment */}
            <div className="flex gap-3 mt-4">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">Me</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Leave a comment… (markdown supported)"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                  data-testid="input-comment"
                />
                <Button
                  size="sm" className="h-8 gap-1.5 text-xs"
                  onClick={() => addComment(commentText)}
                  disabled={!commentText.trim() || false}
                  data-testid="button-submit-comment"
                >
                  <Send className="w-3 h-3" />
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-60 shrink-0 border-l border-border overflow-y-auto px-4 py-5 space-y-4">
          <DetailField label="Status" icon={<Layers className="w-3.5 h-3.5" />}>
            <Select value={issue.status} onValueChange={v => updateIssue({ status: v as IssueStatus })}>
              <SelectTrigger className="h-7 text-xs" data-testid="select-issue-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["todo","in_progress","in_review","done","cancelled"].map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s as IssueStatus]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DetailField>

          <DetailField label="Priority" icon={<Flag className="w-3.5 h-3.5" />}>
            <Select value={issue.priority} onValueChange={v => updateIssue({ priority: v as IssuePriority })}>
              <SelectTrigger className="h-7 text-xs" data-testid="select-issue-priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["urgent","high","medium","low","none"].map(p => (
                  <SelectItem key={p} value={p}>{PRIORITY_LABELS[p as IssuePriority]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DetailField>

          <DetailField label="Assignee" icon={<User2 className="w-3.5 h-3.5" />}>
            <Select value={issue.assigneeId || "__none"} onValueChange={v => updateIssue({ assigneeId: v === "__none" ? undefined : v })}>
              <SelectTrigger className="h-7 text-xs" data-testid="select-issue-assignee"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Unassigned</SelectItem>
                {members.map((m: any) => (
                  <SelectItem key={m.userId} value={m.userId}>{m.user?.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DetailField>

          <DetailField label="Sprint" icon={<Calendar className="w-3.5 h-3.5" />}>
            <Select value={issue.sprintId || "__backlog"} onValueChange={v => updateIssue({ sprintId: v === "__backlog" ? undefined : v })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Backlog" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__backlog">Backlog</SelectItem>
                {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </DetailField>

          <DetailField label="Labels" icon={<Tag className="w-3.5 h-3.5" />}>
            <div className="flex flex-wrap gap-1">
              {issueLabels.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
              {issueLabels.map(l => (
                <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: l.color + "25", color: l.color }}>
                  {l.name}
                </span>
              ))}
            </div>
          </DetailField>

          <Separator />

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created {formatRelative(issue.createdAt)}</p>
            <p>Updated {formatRelative(issue.updatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function getActivityText(a: any): string {
  switch (a.type) {
    case "created": return "created this issue";
    case "status_change": return `changed status from ${STATUS_LABELS[a.meta.from as IssueStatus] || a.meta.from} to ${STATUS_LABELS[a.meta.to as IssueStatus] || a.meta.to}`;
    case "assignee_change": return a.meta.to ? `assigned this to someone` : "unassigned this issue";
    case "priority_change": return `changed priority to ${PRIORITY_LABELS[a.meta.to as IssuePriority] || a.meta.to}`;
    case "comment": return "left a comment";
    default: return `updated this issue`;
  }
}
