import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, MessageCircle, Paperclip } from "lucide-react";
import { cn, formatRelative, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { IssueTypeIcon, PriorityIcon, StatusIcon } from "./IssueIcon";
import type { Issue, Label, User, Project } from "@shared/schema";

interface Props {
  issue: Issue;
  project: Project;
  compact?: boolean;
  orgId: string;
  isDragging?: boolean;
  onClick?: () => void;
}

export default function IssueCard({ issue, project, compact, orgId, isDragging, onClick }: Props) {
  const { data: labels = [] } = useQuery<Label[]>({ queryKey: [`/api/projects/${issue.projectId}/labels`] });
  const { data: assignee } = useQuery<User>({
    queryKey: [`/api/users/${issue.assigneeId}`],
    enabled: !!issue.assigneeId,
  });

  const issueLabelObjects = labels.filter(l => issue.labelIds.includes(l.id));
  const initials = (name?: string) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  const content = (
    <div
      className={cn(
        "issue-card bg-card border border-card-border rounded-lg px-3 py-2.5 cursor-pointer select-none",
        isDragging && "opacity-50 rotate-1 shadow-lg",
        compact && "py-2"
      )}
      onClick={onClick}
      data-testid={`issue-card-${issue.id}`}
    >
      {/* Top row */}
      <div className="flex items-start gap-2">
        <IssueTypeIcon type={issue.type} className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <p className={cn("flex-1 text-sm font-medium text-foreground leading-snug", compact && "text-xs")}>{issue.title}</p>
      </div>

      {/* Labels */}
      {issueLabelObjects.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {issueLabelObjects.slice(0, 3).map(l => (
            <span
              key={l.id}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: l.color + "25", color: l.color }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
          {project.key}-{issue.number}
        </span>
        <PriorityIcon priority={issue.priority} className="w-3.5 h-3.5 shrink-0" />
        <div className="flex-1" />
        {issue.dueDate && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {formatRelative(issue.dueDate)}
          </span>
        )}
        {assignee && (
          <Avatar className="w-5 h-5 shrink-0">
            <AvatarImage src={assignee.avatar} />
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(assignee.name)}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );

  return content;
}
