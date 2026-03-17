import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, CheckCircle2, Clock, AlertCircle, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@shared/schema";
import { useOrg, useProjects, useProjectStats } from "@/lib/storeContext";

interface Props { orgId: string; }

export default function DashboardPage({ orgId }: Props) {
  const org = useOrg(orgId);
  const projects = useProjects(orgId);

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              {org?.name || "Dashboard"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Overview of all projects</p>
          </div>
          <Link href={`/org/${orgId}/new-project`}>
            <Button size="sm" className="gap-1.5" data-testid="button-new-project">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground text-sm mb-6">Create your first project to get started</p>
            <Link href={`/org/${orgId}/new-project`}>
              <Button>Create Project</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} orgId={orgId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, orgId }: { project: Project; orgId: string }) {
  const stats = useProjectStats(project.id);
  const total = stats.total || 0;
  const done = stats.done || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const sprintPct = stats.sprintTotal > 0 ? Math.round((stats.sprintDone / stats.sprintTotal) * 100) : 0;

  const statusData = [
    { name: "To Do", value: stats.todo || 0, color: "#6B7280" },
    { name: "In Progress", value: stats.inProgress || 0, color: "#3B82F6" },
    { name: "In Review", value: stats.inReview || 0, color: "#8B5CF6" },
    { name: "Done", value: stats.done || 0, color: "#10B981" },
  ].filter(d => d.value > 0);

  return (
    <Card className="overflow-hidden" data-testid={`project-card-${project.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center text-white shrink-0"
              style={{ background: project.color }}
            >
              {project.key.slice(0, 2)}
            </span>
            <div>
              <CardTitle className="text-base">{project.name}</CardTitle>
              {project.description && <p className="text-xs text-muted-foreground mt-0.5">{project.description}</p>}
            </div>
          </div>
          <Link href={`/org/${orgId}/project/${project.id}/board`}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Open <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} label="Done" value={done} />
          <StatBox icon={<Clock className="w-4 h-4 text-blue-500" />} label="In Progress" value={stats.inProgress} />
          <StatBox icon={<AlertCircle className="w-4 h-4 text-red-500" />} label="In Review" value={stats.inReview} />
          <StatBox icon={<TrendingUp className="w-4 h-4 text-purple-500" />} label="Total Issues" value={total} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Overall Progress</span>
            <span className="text-xs font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {stats.activeSprint && stats.sprintTotal > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Active Sprint</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{stats.activeSprint.name}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{stats.sprintDone}/{stats.sprintTotal} done</span>
            </div>
            <Progress value={sprintPct} className="h-1" />
          </div>
        )}

        {statusData.length > 0 && (
          <div className="mt-3 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} barSize={20}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/50 border border-border">
      {icon}
      <div>
        <p className="text-base font-semibold leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}
