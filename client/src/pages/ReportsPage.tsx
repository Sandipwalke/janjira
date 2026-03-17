import { useMemo } from "react";
import { useIssues, useLabels, useSprints, useProjectStats } from "@/lib/storeContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle2, Clock, BarChart2, PieChart as PieChartIcon, Activity } from "lucide-react";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/utils";
import type { IssueStatus, IssuePriority } from "@shared/schema";

interface Props { projectId: string; orgId: string; }

const STATUS_COLORS: Record<string, string> = {
  todo: "#6b7280",
  in_progress: "#3b82f6",
  in_review: "#f59e0b",
  done: "#22c55e",
  cancelled: "#ef4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#6b7280",
  none: "#9ca3af",
};

export default function ReportsPage({ projectId, orgId }: Props) {
  const issues = useIssues(projectId);
  const sprints = useSprints(projectId);
  const labels = useLabels(projectId);
  const stats = useProjectStats(projectId);

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status as IssueStatus] || status,
      value: count,
      color: STATUS_COLORS[status] || "#6b7280",
    }));
  }, [issues]);

  // Priority distribution
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach(i => { counts[i.priority] = (counts[i.priority] || 0) + 1; });
    return Object.entries(counts).map(([priority, count]) => ({
      name: PRIORITY_LABELS[priority as IssuePriority] || priority,
      value: count,
      color: PRIORITY_COLORS[priority] || "#6b7280",
    }));
  }, [issues]);

  // Type distribution
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      count,
    }));
  }, [issues]);

  // Velocity by sprint (issues completed per sprint)
  const velocityData = useMemo(() => {
    return sprints.map(sprint => {
      const sprintIssues = issues.filter(i => i.sprintId === sprint.id);
      const completed = sprintIssues.filter(i => i.status === "done").length;
      const total = sprintIssues.length;
      return {
        name: sprint.name,
        completed,
        total,
        remaining: total - completed,
      };
    });
  }, [sprints, issues]);

  // Burndown — simulate daily progress for current sprint
  const burndownData = useMemo(() => {
    const activeSprint = sprints.find(s => s.status === "active");
    if (!activeSprint) return [];
    const sprintIssues = issues.filter(i => i.sprintId === activeSprint.id);
    const total = sprintIssues.length;
    const days = 14;
    const completed = sprintIssues.filter(i => i.status === "done").length;
    const data = [];
    for (let d = 0; d <= days; d++) {
      const ideal = Math.round(total - (total / days) * d);
      // Actual: simulate completing ~completed issues spread across the sprint
      const progress = d / days;
      const actual = d < Math.round(days * 0.8)
        ? Math.max(0, total - Math.round(completed * (d / days) * 1.2))
        : Math.max(0, total - completed);
      data.push({ day: `Day ${d}`, ideal, actual: d === 0 ? total : actual });
    }
    return data;
  }, [sprints, issues]);

  // Label usage
  const labelData = useMemo(() => {
    return labels.map(label => ({
      name: label.name,
      count: issues.filter(i => i.labelIds.includes(label.id)).length,
      color: label.color,
    })).filter(l => l.count > 0).sort((a, b) => b.count - a.count);
  }, [labels, issues]);

  const completionRate = issues.length > 0
    ? Math.round((issues.filter(i => i.status === "done").length / issues.length) * 100)
    : 0;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <BarChart2 className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>Reports</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
            label="Completion Rate"
            value={`${completionRate}%`}
            sub={`${issues.filter(i => i.status === "done").length} of ${issues.length} done`}
            color="green"
          />
          <KpiCard
            icon={<Activity className="w-4 h-4 text-blue-500" />}
            label="In Progress"
            value={String(issues.filter(i => i.status === "in_progress").length)}
            sub="active issues"
            color="blue"
          />
          <KpiCard
            icon={<Clock className="w-4 h-4 text-amber-500" />}
            label="In Review"
            value={String(issues.filter(i => i.status === "in_review").length)}
            sub="awaiting review"
            color="amber"
          />
          <KpiCard
            icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
            label="Total Issues"
            value={String(issues.length)}
            sub={`${sprints.length} sprint${sprints.length !== 1 ? "s" : ""}`}
            color="purple"
          />
        </div>

        {/* Velocity + Burndown row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sprint Velocity</CardTitle>
              <CardDescription className="text-xs">Issues completed per sprint</CardDescription>
            </CardHeader>
            <CardContent>
              {velocityData.length === 0 ? (
                <EmptyChart message="No sprint data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={velocityData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="remaining" name="Remaining" fill="#6b7280" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Burndown Chart</CardTitle>
              <CardDescription className="text-xs">Active sprint progress vs ideal</CardDescription>
            </CardHeader>
            <CardContent>
              {burndownData.length === 0 ? (
                <EmptyChart message="No active sprint" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={burndownData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={3} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#6b7280" strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="actual" name="Actual" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Distribution row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status pie */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">By Status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length === 0 ? <EmptyChart message="No issues" /> : (
                <div className="flex flex-col items-center gap-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {statusData.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-xs text-muted-foreground">{s.name} ({s.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">By Priority</CardTitle>
            </CardHeader>
            <CardContent>
              {priorityData.length === 0 ? <EmptyChart message="No issues" /> : (
                <div className="space-y-2 pt-2">
                  {priorityData.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs w-16 text-muted-foreground shrink-0">{p.name}</span>
                      <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(p.value / issues.length) * 100}%`, background: p.color }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-6 text-right">{p.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Issue types */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">By Type</CardTitle>
            </CardHeader>
            <CardContent>
              {typeData.length === 0 ? <EmptyChart message="No issues" /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={55} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Labels usage */}
        {labelData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Label Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {labelData.map(l => (
                  <div key={l.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ borderColor: l.color + "60", background: l.color + "12" }}>
                    <span className="text-xs font-medium" style={{ color: l.color }}>{l.name}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{l.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const bg: Record<string, string> = { green: "bg-green-500/10", blue: "bg-blue-500/10", amber: "bg-amber-500/10", purple: "bg-purple-500/10" };
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${bg[color] || "bg-muted/30"}`}>
          {icon}
        </div>
        <p className="text-2xl font-bold leading-none mb-1">{value}</p>
        <p className="text-xs font-medium mb-0.5">{label}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">{message}</div>
  );
}
