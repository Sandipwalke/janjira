import { useMemo, useState } from "react";
import { useIssues, useSprints, useLabels } from "@/lib/storeContext";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IssueTypeIcon, PriorityIcon } from "@/components/IssueIcon";
import { STATUS_LABELS, cn } from "@/lib/utils";
import type { IssueStatus } from "@shared/schema";
import { useLocation } from "wouter";

interface Props { projectId: string; orgId: string; }

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-muted-foreground/30 text-muted-foreground",
  in_progress: "bg-blue-500/80 text-white",
  in_review: "bg-amber-500/80 text-white",
  done: "bg-green-500/80 text-white",
  cancelled: "bg-red-500/80 text-white",
};

export default function TimelinePage({ projectId, orgId }: Props) {
  const issues = useIssues(projectId);
  const sprints = useSprints(projectId);
  const [, setLocation] = useLocation();

  // Current view: months
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [groupBy, setGroupBy] = useState<"sprint" | "status" | "none">("sprint");

  // Show 3 months
  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 3; i++) {
      const m = (viewMonth + i) % 12;
      const y = viewYear + Math.floor((viewMonth + i) / 12);
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      result.push({ month: m, year: y, days: daysInMonth, label: new Date(y, m, 1).toLocaleString("default", { month: "short", year: "numeric" }) });
    }
    return result;
  }, [viewMonth, viewYear]);

  const totalDays = months.reduce((a, m) => a + m.days, 0);

  // Assign positions to sprints
  const sprintBars = useMemo(() => {
    const startRef = new Date(months[0].year, months[0].month, 1);
    const endRef = new Date(months[months.length - 1].year, months[months.length - 1].month + 1, 0);

    return sprints.map(sprint => {
      const start = sprint.startDate ? new Date(sprint.startDate) : new Date(startRef);
      const end = sprint.endDate ? new Date(sprint.endDate) : new Date(start.getTime() + 14 * 86400000);
      const left = Math.max(0, (start.getTime() - startRef.getTime()) / (86400000 * totalDays) * 100);
      const right = Math.min(100, (end.getTime() - startRef.getTime()) / (86400000 * totalDays) * 100);
      const width = Math.max(2, right - left);
      return { ...sprint, left, width, start, end };
    });
  }, [sprints, months, totalDays]);

  // Group issues
  const groups = useMemo(() => {
    if (groupBy === "sprint") {
      const grouped: { label: string; issues: typeof issues; color?: string }[] = [];
      sprints.forEach(s => {
        const grpIssues = issues.filter(i => i.sprintId === s.id);
        if (grpIssues.length > 0) grouped.push({ label: s.name, issues: grpIssues, color: "#3b82f6" });
      });
      const backlog = issues.filter(i => !i.sprintId);
      if (backlog.length > 0) grouped.push({ label: "Backlog", issues: backlog, color: "#6b7280" });
      return grouped;
    }
    if (groupBy === "status") {
      return (["todo","in_progress","in_review","done","cancelled"] as IssueStatus[]).map(s => ({
        label: STATUS_LABELS[s],
        issues: issues.filter(i => i.status === s),
        color: undefined,
      })).filter(g => g.issues.length > 0);
    }
    return [{ label: "All Issues", issues, color: undefined }];
  }, [issues, sprints, groupBy]);

  const prevMonths = () => {
    const nm = viewMonth - 3;
    if (nm < 0) { setViewYear(y => y - 1); setViewMonth((nm + 12) % 12); }
    else setViewMonth(nm);
  };
  const nextMonths = () => {
    const nm = viewMonth + 3;
    if (nm >= 12) { setViewYear(y => y + 1); setViewMonth(nm - 12); }
    else setViewMonth(nm);
  };

  const startRef = new Date(months[0].year, months[0].month, 1);

  const getIssueBar = (issue: typeof issues[0]) => {
    // Use createdAt as start, updatedAt as pseudo-end for visual width
    const start = new Date(issue.createdAt);
    const end = new Date(issue.updatedAt);
    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const left = (start.getTime() - startRef.getTime()) / (86400000 * totalDays) * 100;
    const width = Math.max(1.5, (daysDiff / totalDays) * 100);
    return { left: Math.max(0, Math.min(98, left)), width: Math.min(width, 100 - Math.max(0, left)) };
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0 flex-wrap">
        <Calendar className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold flex-1" style={{ fontFamily: "var(--font-display)" }}>Timeline</h2>
        <Select value={groupBy} onValueChange={v => setGroupBy(v as any)}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sprint">By Sprint</SelectItem>
            <SelectItem value="status">By Status</SelectItem>
            <SelectItem value="none">No Grouping</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonths}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-xs font-medium w-36 text-center">{months[0].label} – {months[2].label}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonths}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left label column */}
        <div className="w-48 shrink-0 border-r border-border overflow-y-auto" />

        {/* Main timeline */}
        <div className="flex-1 overflow-auto">
          {/* Month headers */}
          <div className="flex border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10" style={{ minWidth: 600 }}>
            <div className="w-48 shrink-0 border-r border-border" />
            {months.map((m, i) => (
              <div
                key={i}
                className="border-r border-border last:border-r-0 text-xs font-medium text-muted-foreground py-2 px-3"
                style={{ width: `${(m.days / totalDays) * 100}%`, minWidth: 80 }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Sprint track */}
          <div className="flex border-b border-border/50 bg-muted/10" style={{ minWidth: 600 }}>
            <div className="w-48 shrink-0 border-r border-border px-3 py-2 text-xs text-muted-foreground font-medium">Sprints</div>
            <div className="flex-1 relative py-2 h-8">
              {sprintBars.map((s, i) => (
                <div
                  key={s.id}
                  className="absolute h-5 rounded flex items-center px-2 text-[10px] font-medium text-white overflow-hidden whitespace-nowrap"
                  style={{ left: `${s.left}%`, width: `${s.width}%`, background: "#3b82f6", top: "50%", transform: "translateY(-50%)" }}
                  title={s.name}
                >
                  {s.name}
                </div>
              ))}
            </div>
          </div>

          {/* Today line + issue rows */}
          {groups.map((group, gi) => (
            <div key={gi} style={{ minWidth: 600 }}>
              {/* Group header */}
              <div className="flex border-b border-border/40 bg-muted/5">
                <div className="w-48 shrink-0 border-r border-border px-3 py-1.5 flex items-center gap-2">
                  {group.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color }} />}
                  <span className="text-xs font-semibold text-muted-foreground">{group.label}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-auto">{group.issues.length}</Badge>
                </div>
                <div className="flex-1 relative">
                  <TodayLine totalDays={totalDays} startRef={startRef} />
                </div>
              </div>
              {/* Issue rows */}
              {group.issues.map(issue => {
                const bar = getIssueBar(issue);
                return (
                  <div
                    key={issue.id}
                    className="flex border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/org/${orgId}/project/${projectId}/issue/${issue.id}`)}
                    style={{ minWidth: 600 }}
                  >
                    <div className="w-48 shrink-0 border-r border-border px-3 py-1.5 flex items-center gap-2">
                      <IssueTypeIcon type={issue.type} className="w-3 h-3 shrink-0" />
                      <span className="text-xs truncate">{issue.title}</span>
                    </div>
                    <div className="flex-1 relative py-1.5 h-8">
                      <TodayLine totalDays={totalDays} startRef={startRef} />
                      {bar.left < 100 && (
                        <div
                          className={cn("absolute h-5 rounded flex items-center px-1.5 text-[10px] font-medium overflow-hidden whitespace-nowrap", STATUS_COLORS[issue.status] || "bg-muted")}
                          style={{ left: `${bar.left}%`, width: `${bar.width}%`, maxWidth: "90%", top: "50%", transform: "translateY(-50%)" }}
                          title={issue.title}
                        >
                          <span className="truncate">{issue.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {issues.length === 0 && (
            <div className="flex items-center justify-center py-24 text-sm text-muted-foreground" style={{ minWidth: 600 }}>
              No issues to display on the timeline
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TodayLine({ totalDays, startRef }: { totalDays: number; startRef: Date }) {
  const today = new Date();
  const left = (today.getTime() - startRef.getTime()) / (86400000 * totalDays) * 100;
  if (left < 0 || left > 100) return null;
  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-red-500/60 z-10 pointer-events-none"
      style={{ left: `${left}%` }}
    />
  );
}
