import { Bug, BookOpen, Zap, Layers, CheckSquare, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IssueType, IssuePriority, IssueStatus } from "@shared/schema";

const TYPE_COLORS: Record<IssueType, string> = {
  task: "text-blue-500",
  bug: "text-red-500",
  story: "text-green-500",
  epic: "text-purple-500",
  subtask: "text-blue-400",
};

export function IssueTypeIcon({ type, className }: { type: IssueType; className?: string }) {
  const cls = cn("shrink-0", TYPE_COLORS[type], className);
  if (type === "bug") return <Bug className={cls} />;
  if (type === "story") return <BookOpen className={cls} />;
  if (type === "epic") return <Zap className={cls} />;
  if (type === "subtask") return <ChevronRight className={cls} />;
  return <CheckSquare className={cls} />;
}

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  urgent: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-gray-400",
  none: "text-gray-300",
};

const PRIORITY_BARS: Record<IssuePriority, number> = {
  urgent: 4, high: 3, medium: 2, low: 1, none: 0,
};

export function PriorityIcon({ priority, className }: { priority: IssuePriority; className?: string }) {
  const filled = PRIORITY_BARS[priority];
  const color = PRIORITY_COLORS[priority];
  return (
    <span className={cn("inline-flex items-end gap-[1.5px] h-4 shrink-0", color, className)}>
      {[1, 2, 3, 4].map(i => (
        <span
          key={i}
          className="w-[3px] rounded-[1px] transition-all"
          style={{
            height: `${i * 3 + 3}px`,
            background: i <= filled ? "currentColor" : "currentColor",
            opacity: i <= filled ? 1 : 0.2,
          }}
        />
      ))}
    </span>
  );
}

const STATUS_COLORS: Record<IssueStatus, string> = {
  todo: "border-gray-400 text-gray-400",
  in_progress: "border-blue-500 text-blue-500",
  in_review: "border-purple-500 text-purple-500",
  done: "border-green-500 bg-green-500 text-white",
  cancelled: "border-gray-300 text-gray-300",
};

export function StatusIcon({ status, className }: { status: IssueStatus; className?: string }) {
  const cls = STATUS_COLORS[status];
  if (status === "done") {
    return (
      <span className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", cls, className)}>
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", cls, className)}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      </span>
    );
  }
  if (status === "in_review") {
    return (
      <span className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", cls, className)}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", cls, className)}>
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1 1L6 6M6 1L1 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </span>
    );
  }
  return <span className={cn("w-4 h-4 rounded-full border-2 shrink-0", cls, className)} />;
}
