import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
  closestCorners
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Filter, SlidersHorizontal, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import IssueCard from "@/components/IssueCard";
import CreateIssueDialog from "@/components/CreateIssueDialog";
import { apiRequest } from "@/lib/queryClient";
import { STATUS_LABELS, STATUS_ORDER, cn } from "@/lib/utils";
import { StatusIcon } from "@/components/IssueIcon";
import type { Issue, Project, Sprint } from "@shared/schema";
import type { IssueStatus } from "@shared/schema";
import { useLocation } from "wouter";

interface Props { projectId: string; orgId: string; }

const COL_COLORS: Record<IssueStatus, string> = {
  todo: "bg-gray-400/10 border-gray-400/20",
  in_progress: "bg-blue-500/10 border-blue-500/20",
  in_review: "bg-purple-500/10 border-purple-500/20",
  done: "bg-green-500/10 border-green-500/20",
  cancelled: "bg-gray-300/10 border-gray-300/20",
};

function SortableIssueCard({ issue, project, orgId, onOpen }: { issue: Issue; project: Project; orgId: string; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IssueCard issue={issue} project={project} orgId={orgId} isDragging={isDragging} onClick={() => onOpen(issue.id)} />
    </div>
  );
}

export default function BoardPage({ projectId, orgId }: Props) {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [createStatus, setCreateStatus] = useState<IssueStatus | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const { data: project } = useQuery<Project>({ queryKey: [`/api/projects/${projectId}`] });
  const { data: issues = [], isLoading } = useQuery<Issue[]>({ queryKey: [`/api/projects/${projectId}/issues`] });
  const { data: sprints = [] } = useQuery<Sprint[]>({ queryKey: [`/api/projects/${projectId}/sprints`] });
  const activeSprint = sprints.find(s => s.status === "active");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, order }: { id: string; status?: IssueStatus; order?: number }) => {
      const res = await apiRequest("PATCH", `/api/issues/${id}`, { status, order });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/issues`] }),
  });

  const bulkOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; order: number; status?: IssueStatus }[]) => {
      await apiRequest("POST", "/api/issues/bulk-order", { updates });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/issues`] }),
  });

  const filtered = issues.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase())
  );

  // Only show sprint issues on board, plus backlog as separate column
  const boardIssues = activeSprint
    ? filtered.filter(i => i.sprintId === activeSprint.id)
    : filtered;

  const byStatus = (status: IssueStatus) =>
    boardIssues.filter(i => i.status === status).sort((a, b) => a.order - b.order);

  const activeIssue = activeId ? issues.find(i => i.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragOver = (e: DragOverEvent) => setOverId(e.over?.id as string || null);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    setOverId(null);
    if (!over || !active) return;

    const draggedIssue = issues.find(i => i.id === active.id);
    if (!draggedIssue) return;

    // Determine target status — over could be a column or an issue
    const overIssue = issues.find(i => i.id === over.id);
    const targetStatus = overIssue ? overIssue.status : (over.id as IssueStatus);

    if (STATUS_ORDER.includes(targetStatus as IssueStatus)) {
      if (draggedIssue.status !== targetStatus) {
        updateMutation.mutate({ id: draggedIssue.id, status: targetStatus as IssueStatus });
      }
    }
  };

  if (!project) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <div className="flex-1 flex items-center gap-2">
          <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>Board</h2>
          {activeSprint && (
            <Badge variant="outline" className="text-xs gap-1">
              {activeSprint.name}
              <ChevronDown className="w-3 h-3" />
            </Badge>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 w-48 text-xs"
            placeholder="Filter issues…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-board-search"
          />
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setCreateStatus("todo")}
          data-testid="button-create-issue"
        >
          <Plus className="w-3.5 h-3.5" />
          Create
        </Button>
      </div>

      {/* Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 p-4 overflow-x-auto flex-1 items-start">
          {STATUS_ORDER.map(status => {
            const colIssues = byStatus(status);
            return (
              <div
                key={status}
                className={cn(
                  "flex flex-col w-72 shrink-0 rounded-xl border p-3",
                  COL_COLORS[status],
                  overId === status && "ring-2 ring-primary ring-inset"
                )}
                data-testid={`column-${status}`}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <StatusIcon status={status} />
                  <span className="text-sm font-medium text-foreground">{STATUS_LABELS[status]}</span>
                  <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                    {colIssues.length}
                  </span>
                  <Button
                    variant="ghost" size="icon"
                    className="w-6 h-6 opacity-60 hover:opacity-100"
                    onClick={() => setCreateStatus(status)}
                    data-testid={`button-add-issue-${status}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Cards */}
                <SortableContext items={colIssues.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2 min-h-[60px]">
                    {isLoading ? (
                      Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
                    ) : colIssues.length === 0 ? (
                      <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/50 rounded-lg border border-dashed border-current/20">
                        No issues
                      </div>
                    ) : colIssues.map(issue => (
                      <SortableIssueCard
                        key={issue.id}
                        issue={issue}
                        project={project}
                        orgId={orgId}
                        onOpen={(id) => setLocation(`/org/${orgId}/project/${projectId}/issue/${id}`)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeIssue && project && (
            <IssueCard issue={activeIssue} project={project} orgId={orgId} isDragging />
          )}
        </DragOverlay>
      </DndContext>

      {createStatus && (
        <CreateIssueDialog
          open
          onClose={() => setCreateStatus(null)}
          projectId={projectId}
          orgId={orgId}
          defaultStatus={createStatus}
          defaultSprintId={activeSprint?.id}
        />
      )}
    </div>
  );
}
