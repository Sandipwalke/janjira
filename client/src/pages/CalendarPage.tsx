import { useState, useMemo } from "react";
import { useIssues, useSprints } from "@/lib/storeContext";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IssueTypeIcon, PriorityIcon } from "@/components/IssueIcon";
import { STATUS_LABELS, cn } from "@/lib/utils";
import type { IssueStatus } from "@shared/schema";
import { useLocation } from "wouter";

interface Props { projectId: string; orgId: string; }

const STATUS_DOT: Record<string, string> = {
  todo: "bg-muted-foreground/50",
  in_progress: "bg-blue-500",
  in_review: "bg-amber-500",
  done: "bg-green-500",
  cancelled: "bg-red-400",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarPage({ projectId, orgId }: Props) {
  const issues = useIssues(projectId);
  const sprints = useSprints(projectId);
  const [, setLocation] = useLocation();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  // Map issues to days (use createdAt for display)
  const issuesByDay = useMemo(() => {
    const map: Record<string, typeof issues> = {};
    issues.forEach(issue => {
      const d = new Date(issue.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = String(d.getDate());
        if (!map[key]) map[key] = [];
        map[key].push(issue);
      }
    });
    return map;
  }, [issues, year, month]);

  // Map sprints to days
  const sprintsByDay = useMemo(() => {
    const map: Record<string, typeof sprints> = {};
    sprints.forEach(sprint => {
      if (!sprint.startDate || !sprint.endDate) return;
      const start = new Date(sprint.startDate);
      const end = new Date(sprint.endDate);
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        if (date >= start && date <= end) {
          const key = String(d);
          if (!map[key]) map[key] = [];
          if (!map[key].find(s => s.id === sprint.id)) map[key].push(sprint);
        }
      }
    });
    return map;
  }, [sprints, year, month, daysInMonth]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // Build grid: 6 weeks x 7 days
  const cells: { day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: daysInPrev - firstDay + 1 + i, isCurrentMonth: false, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
    cells.push({ day: d, isCurrentMonth: true, isToday });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - daysInMonth - firstDay + 1, isCurrentMonth: false, isToday: false });
  }

  const selectedDayIssues = selected ? (issuesByDay[selected] || []) : [];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold flex-1" style={{ fontFamily: "var(--font-display)" }}>Calendar</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium w-40 text-center">{MONTHS[month]} {year}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}>
          Today
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border shrink-0">
            {DAYS.map(d => (
              <div key={d} className="text-xs font-medium text-muted-foreground text-center py-2">{d}</div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${cells.length / 7}, 1fr)` }}>
            {Array.from({ length: cells.length / 7 }, (_, week) => (
              <div key={week} className="grid grid-cols-7 border-b border-border/30 last:border-b-0">
                {cells.slice(week * 7, week * 7 + 7).map((cell, i) => {
                  const key = String(cell.day);
                  const dayIssues = cell.isCurrentMonth ? (issuesByDay[key] || []) : [];
                  const daySprintBars = cell.isCurrentMonth ? (sprintsByDay[key] || []) : [];
                  const isSelected = cell.isCurrentMonth && selected === key;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "border-r border-border/30 last:border-r-0 p-1 min-h-[90px] cursor-pointer transition-colors relative",
                        !cell.isCurrentMonth && "bg-muted/5",
                        cell.isToday && "bg-primary/5",
                        isSelected && "bg-primary/10 ring-1 ring-inset ring-primary/30",
                        cell.isCurrentMonth && !isSelected && "hover:bg-muted/20"
                      )}
                      onClick={() => cell.isCurrentMonth && setSelected(isSelected ? null : key)}
                    >
                      <div className={cn(
                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                        cell.isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                        !cell.isCurrentMonth && "opacity-30"
                      )}>
                        {cell.day}
                      </div>

                      {/* Sprint bars */}
                      {daySprintBars.slice(0, 1).map(s => (
                        <div key={s.id} className="text-[9px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 mb-0.5 truncate">
                          {s.name}
                        </div>
                      ))}

                      {/* Issue dots */}
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {dayIssues.slice(0, 3).map(issue => (
                          <span
                            key={issue.id}
                            className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[issue.status] || "bg-muted")}
                            title={issue.title}
                          />
                        ))}
                        {dayIssues.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">+{dayIssues.length - 3}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Day detail panel */}
        {selected && (
          <div className="w-64 shrink-0 border-l border-border overflow-y-auto">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">{MONTHS[month]} {selected}, {year}</p>
              <p className="text-xs text-muted-foreground">{selectedDayIssues.length} issue{selectedDayIssues.length !== 1 ? "s" : ""}</p>
            </div>
            {selectedDayIssues.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">No issues this day</div>
            ) : (
              <div className="divide-y divide-border/40">
                {selectedDayIssues.map(issue => (
                  <div
                    key={issue.id}
                    className="px-4 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/org/${orgId}/project/${projectId}/issue/${issue.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IssueTypeIcon type={issue.type} className="w-3.5 h-3.5 shrink-0" />
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[issue.status])} />
                      <span className="text-xs text-muted-foreground truncate">{STATUS_LABELS[issue.status as IssueStatus]}</span>
                    </div>
                    <p className="text-sm leading-snug line-clamp-2">{issue.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
