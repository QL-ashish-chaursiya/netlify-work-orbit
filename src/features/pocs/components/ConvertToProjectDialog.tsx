import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { convertToProjectSchema, type ConvertToProjectInput } from "@/features/pocs/types";
import { useConvertPocToProject } from "@/features/pocs/hooks/useConvertPocToProject";
import type { Tables } from "@/lib/database.types";

interface ConvertToProjectDialogProps {
  poc: Tables<"pocs">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Closed-Won -> Project dialog (BRD §5 Phase 6). Prefills the new project's
// name from the POC's client name; the resulting project links back via
// source_poc_id and the POC gets converted_project_id set.
export function ConvertToProjectDialog({ poc, open, onOpenChange }: ConvertToProjectDialogProps) {
  const convertToProject = useConvertPocToProject();
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  const form = useForm<ConvertToProjectInput>({
    resolver: zodResolver(convertToProjectSchema),
    values: { name: poc.client_name, code: "", planned_start_date: "", planned_end_date: "" },
  });

  async function onSubmit(values: ConvertToProjectInput) {
    try {
      const { projectId } = await convertToProject.mutateAsync({ poc, input: values });
      toast.success("Project created from POC.");
      setCreatedProjectId(projectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not convert POC to project");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
      setCreatedProjectId(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {createdProjectId ? (
          <>
            <DialogHeader>
              <DialogTitle>Project created</DialogTitle>
              <DialogDescription>
                "{poc.client_name}" was converted into a new project, linked back to this POC.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button asChild>
                <Link to={`/projects/${createdProjectId}`}>View project</Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Convert to Project</DialogTitle>
              <DialogDescription>
                Creates a new Draft project pre-filled with this POC's client, linked back via source POC.
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="planned_start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Planned start</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={convertToProject.isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={convertToProject.isPending}>
                    {convertToProject.isPending ? "Converting…" : "Convert to Project"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
