import { useState } from "react";
import { CalendarIcon, Hash } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertIssueSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useStore, useSprints, useLabels, useOrgMembers, useUsers } from "@/lib/storeContext";
import { useAuth } from "@/lib/auth";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  orgId: string;
  defaultStatus?: string;
  defaultSprintId?: string;
}

const schema = insertIssueSchema.extend({
  title: z.string().min(1, "Title is required"),
});

export default function CreateIssueDialog({ open, onClose, projectId, orgId, defaultStatus, defaultSprintId }: Props) {
  const { store, refresh } = useStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const sprints = useSprints(projectId);
  const labels = useLabels(projectId);
  const allUsers = useUsers();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      type: "task" as const,
      status: (defaultStatus || "todo") as any,
      priority: "medium" as const,
      assigneeId: undefined,
      sprintId: defaultSprintId || undefined,
      labelIds: [] as string[],
      storyPoints: undefined,
      dueDate: undefined,
    },
  });

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (data: any) => {
    setSubmitting(true);
    const issue = store.createIssue({
      ...data,
      projectId,
      orgId,
      reporterId: user?.id || "user-sandip",
    });
    refresh();
    toast({ title: "Issue created", description: issue.title });
    form.reset();
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg" data-testid="create-issue-dialog">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Issue title…" className="text-base" data-testid="input-issue-title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea placeholder="Description (optional)…" className="min-h-[80px] resize-none" {...field} />
                </FormControl>
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["task","bug","story","epic","subtask"].map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["urgent","high","medium","low","none"].map(p => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[["todo","To Do"],["in_progress","In Progress"],["in_review","In Review"],["done","Done"],["cancelled","Cancelled"]].map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="assigneeId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Assignee</FormLabel>
                  <Select value={field.value || "__none"} onValueChange={v => field.onChange(v === "__none" ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Unassigned</SelectItem>
                      {allUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            {sprints.length > 0 && (
              <FormField control={form.control} name="sprintId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Sprint</FormLabel>
                  <Select value={field.value || "__backlog"} onValueChange={v => field.onChange(v === "__backlog" ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="Backlog" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__backlog">Backlog</SelectItem>
                      {sprints.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="storyPoints" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Story points</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Hash className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Optional"
                        className="pl-7"
                        value={field.value ?? ""}
                        onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Due date</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <CalendarIcon className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input type="date" className="pl-7" value={field.value || ""} onChange={e => field.onChange(e.target.value || undefined)} />
                    </div>
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <p className="text-[11px] text-muted-foreground">Description supports markdown formatting like Jira.</p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={submitting} data-testid="button-create-issue">
                {submitting ? "Creating…" : "Create Issue"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
