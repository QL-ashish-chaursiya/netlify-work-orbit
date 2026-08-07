import { useEffect, useMemo } from "react";
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
import { useUpdateProject } from "@/features/projects/hooks/useUpdateProject";
import { useOrgProfiles, type OrgProfileOption } from "@/features/projects/hooks/useOrgProfiles";
import type { Tables } from "@/lib/database.types";

const NO_MANAGER = "none";

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (projectId: string) => void;
  // When set, the form edits this project in place instead of creating a
  // new one — same fields, same validation, different mutation/copy.
  project?: Tables<"projects">;
}

function toDefaultValues(project?: Tables<"projects">): CreateProjectInput {
  return {
    name: project?.name ?? "",
    code: project?.code ?? "",
    client_name: project?.client_name ?? "",
    description: project?.description ?? "",
    project_manager_id: project?.project_manager_id ?? undefined,
    resource_manager_id: project?.resource_manager_id ?? undefined,
    planned_start_date: project?.planned_start_date ?? "",
    planned_end_date: project?.planned_end_date ?? "",
  };
}

// Doubles as both "New project" and "Edit project" — pass `project` to edit.
// Projects always start in `draft` status on create (server-side default +
// set explicitly in useCreateProject); status isn't editable here at all,
// that's ProjectStatusStepper's job.
export function ProjectForm({ open, onOpenChange, onCreated, project }: ProjectFormProps) {
  const { data: orgProfiles } = useOrgProfiles("");
  const createProject = useCreateProject();
  const updateProject = useUpdateProject(project?.id ?? "");
  const isEditing = !!project;

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: toDefaultValues(project),
  });

  // Re-sync the form whenever the dialog opens for a (possibly different)
  // project — RHF's defaultValues are only read on first mount otherwise.
  useEffect(() => {
    if (open) form.reset(toDefaultValues(project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id]);

  const projectManagerOptions = useMemo(
    () => (orgProfiles ?? []).filter((profile) => profile.status === "active" && profile.primary_role === "project_manager"),
    [orgProfiles],
  );
  // "Resource manager" field/column repurposed as the project's Tech Lead —
  // see AllocationRequestForm for the same swap on the request-routing side.
  const techLeadOptions = useMemo(
    () => (orgProfiles ?? []).filter((profile) => profile.status === "active" && profile.primary_role === "tech_lead"),
    [orgProfiles],
  );

  function formatPersonLabel(profile: OrgProfileOption) {
    return profile.designation?.trim() ? `${profile.full_name} (${profile.designation})` : `${profile.full_name} (${profile.email})`;
  }

  async function onSubmit(values: CreateProjectInput) {
    try {
      if (isEditing) {
        await updateProject.mutateAsync(values);
        toast.success("Project updated.");
        onOpenChange(false);
        return;
      }
      const { project: created, ownerWarning } = await createProject.mutateAsync(values);
      toast.success(`Project "${created.name}" created.`);
      if (ownerWarning) {
        toast.warning("Could not automatically set you as project owner — add yourself from the project page.");
      }
      form.reset();
      onOpenChange(false);
      onCreated?.(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : isEditing ? "Could not update project" : "Could not create project");
    }
  }

  const isPending = isEditing ? updateProject.isPending : createProject.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset(toDefaultValues(project));
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this project's details. Status is managed separately from the stepper on the project page."
              : "Projects start in Draft status. You can add role requirements and owners after creating it."}
          </DialogDescription>
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
                    <FormLabel>Tech Lead</FormLabel>
                    <Select value={field.value ?? NO_MANAGER} onValueChange={(value) => field.onChange(value === NO_MANAGER ? undefined : value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a Tech Lead" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_MANAGER}>No Tech Lead</SelectItem>
                        {techLeadOptions.map((profile) => (
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEditing ? "Save changes" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
