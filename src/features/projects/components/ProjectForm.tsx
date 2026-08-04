import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProjectSchema, type CreateProjectInput } from "@/features/projects/types";
import { useCreateProject } from "@/features/projects/hooks/useCreateProject";
import { useOrgProfiles, type OrgProfileOption } from "@/features/projects/hooks/useOrgProfiles";

const NO_MANAGER = "none";

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (projectId: string) => void;
}

// New Project dialog. Projects always start in `draft` status (server-side
// default + set explicitly in useCreateProject) — no status field here.
export function ProjectForm({ open, onOpenChange, onCreated }: ProjectFormProps) {
  const { data: orgProfiles } = useOrgProfiles("");
  const createProject = useCreateProject();

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      code: "",
      client_name: "",
      description: "",
      project_manager_id: undefined,
      resource_manager_id: undefined,
      planned_start_date: "",
      planned_end_date: "",
    },
  });

  const projectManagerOptions = useMemo(
    () => (orgProfiles ?? []).filter((profile) => profile.status === "active" && profile.primary_role === "project_manager"),
    [orgProfiles],
  );
  const resourceManagerOptions = useMemo(
    () => (orgProfiles ?? []).filter((profile) => profile.status === "active" && profile.primary_role === "resource_manager"),
    [orgProfiles],
  );

  function formatPersonLabel(profile: OrgProfileOption) {
    return profile.designation?.trim() ? `${profile.full_name} (${profile.designation})` : `${profile.full_name} (${profile.email})`;
  }

  async function onSubmit(values: CreateProjectInput) {
    try {
      const { project, ownerWarning } = await createProject.mutateAsync(values);
      toast.success(`Project "${project.name}" created.`);
      if (ownerWarning) {
        toast.warning("Could not automatically set you as project owner — add yourself from the project page.");
      }
      form.reset();
      onOpenChange(false);
      onCreated?.(project.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create project");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Projects start in Draft status. You can add role requirements and owners after creating it.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Platform Revamp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="PRJ-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Short project summary, scope, or goals" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="project_manager_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project manager</FormLabel>
                    <Select value={field.value ?? NO_MANAGER} onValueChange={(value) => field.onChange(value === NO_MANAGER ? undefined : value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project manager" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_MANAGER}>No project manager</SelectItem>
                        {projectManagerOptions.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {formatPersonLabel(profile)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="resource_manager_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource manager</FormLabel>
                    <Select value={field.value ?? NO_MANAGER} onValueChange={(value) => field.onChange(value === NO_MANAGER ? undefined : value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a resource manager" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_MANAGER}>No resource manager</SelectItem>
                        {resourceManagerOptions.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {formatPersonLabel(profile)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="planned_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned start</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="planned_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned end</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createProject.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating…" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
