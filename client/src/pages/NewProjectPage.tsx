import { useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/lib/storeContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { insertProjectSchema } from "@shared/schema";
import { PROJECT_COLORS, cn } from "@/lib/utils";
import type { Project } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface Props { orgId: string; }

export default function NewProjectPage({ orgId }: Props) {
  const [, setLocation] = useLocation();
  const { store, refresh } = useStore();
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);

  const form = useForm({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: { name: "", key: "", description: "", color: PROJECT_COLORS[0] },
  });

  const [creating, setCreating] = useState(false);
  const createProject = (data: any) => {
    setCreating(true);
    const proj = store.createProject({ ...data, color: selectedColor, orgId });
    store.addOrgMember(orgId, user?.id || "user-sandip", "owner");
    refresh();
    toast({ title: "Project created", description: proj.name });
    setLocation(`/org/${orgId}/project/${proj.id}/board`);
    setCreating(false);
  };

  // Auto-generate key from name
  const onNameChange = (name: string) => {
    form.setValue("name", name);
    const key = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
    if (key) form.setValue("key", key);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => history.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>New Project</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex items-start justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create a new project</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                {/* Preview */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <span
                    className="w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center text-white transition-colors"
                    style={{ background: selectedColor }}
                  >
                    {form.watch("key")?.slice(0, 3) || "?"}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{form.watch("name") || "Project Name"}</p>
                    <p className="text-xs text-muted-foreground">{form.watch("key") || "KEY"}-1, {form.watch("key") || "KEY"}-2…</p>
                  </div>
                </div>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Project Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Janjira Platform"
                        data-testid="input-project-name"
                        {...field}
                        onChange={e => onNameChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="key" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Project Key *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="JAN"
                        maxLength={8}
                        data-testid="input-project-key"
                        {...field}
                        onChange={e => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">Used as issue prefix: KEY-1, KEY-2…</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What is this project about?" className="resize-none" {...field} />
                    </FormControl>
                  </FormItem>
                )} />

                <div>
                  <p className="text-xs font-medium mb-2">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {PROJECT_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={cn("w-7 h-7 rounded-lg transition-transform hover:scale-110", selectedColor === color && "ring-2 ring-offset-2 ring-foreground")}
                        style={{ background: color }}
                        onClick={() => setSelectedColor(color)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => history.back()}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={creating} data-testid="button-save-project">
                    {creating ? "Creating…" : "Create Project"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
