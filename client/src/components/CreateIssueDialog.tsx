import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { apiRequest } from "@/lib/queryClient";
import { insertIssueSchema } from "@shared/schema";
import type { Issue, Sprint, User, Label } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: sprints = [] } = useQuery<Sprint[]>({ queryKey: [`/api/projects/${projectId}/sprints`] });
  const { data: labels = [] } = useQuery<Label[]>({ queryKey: [`/api/projects/${projectId}/labels`] });
  const { data: members = [] } = useQuery<any[]>({ queryKey: [`/api/orgs/${orgId}/members`] });

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
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/issues`, data);
      return res.json();
    },
    onSuccess: (issue: Issue) => {
      qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/issues`] });
      toast({ title: "Issue created", description: issue.title });
      form.reset();
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg" data-testid="create-issue-dialog">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-4">
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
                      {members.map((m: any) => (
                        <SelectItem key={m.userId} value={m.userId}>{m.user?.name}</SelectItem>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-create-issue">
                {mutation.isPending ? "Creating…" : "Create Issue"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
