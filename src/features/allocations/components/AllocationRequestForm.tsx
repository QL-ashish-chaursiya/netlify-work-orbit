import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allocationRequestSchema, REQUEST_TYPE_LABELS, type AllocationRequestInput } from "@/features/allocations/types";
import { useCreateAllocationRequest } from "@/features/allocations/hooks/useCreateAllocationRequest";
import { useProfileOptions, useProjectOptions } from "@/features/allocations/hooks/useLookups";

// Sentinel for the shadcn/Radix Select — Radix reserves an empty string to
// mean "clear the selection", so "leave unset" needs a real string value that
// we translate back to `undefined` on submit.
const OPEN_ROLE_SENTINEL = "__open__";
const NO_RESOURCE_MANAGER_SENTINEL = "__none__";

interface AllocationRequestFormProps {
  trigger?: React.ReactNode;
  defaultProjectId?: string;
  defaultProfileId?: string;
}

export function AllocationRequestForm({ trigger, defaultProjectId, defaultProfileId }: AllocationRequestFormProps) {
  const [open, setOpen] = useState(false);
  const createRequest = useCreateAllocationRequest();
  const { data: projects } = useProjectOptions();
  const { data: profiles } = useProfileOptions();

  const form = useForm<AllocationRequestInput>({
    resolver: zodResolver(allocationRequestSchema),
    defaultValues: {
      project_id: defaultProjectId ?? "",
      requested_profile_id: defaultProfileId,
      resource_manager_id: undefined,
      request_type: "hard_allocation",
      allocation_percent: 100,
      start_date: "",
      end_date: "",
      justification: "",
    },
  });

  const resourceManagerOptions = (profiles ?? []).filter(
    (p) => p.status === "active" && p.primary_role === "resource_manager",
  );

  async function onSubmit(values: AllocationRequestInput) {
    try {
      const result = await createRequest.mutateAsync(values);
      if (result.status === "conflict_flagged") {
        toast.warning("Request saved, but flagged as a conflict — an RM will need to arbitrate overlapping demand.");
      } else {
        toast.success("Allocation request submitted for approval.");
      }
      form.reset({
        project_id: defaultProjectId ?? "",
        requested_profile_id: defaultProfileId,
        resource_manager_id: undefined,
        request_type: "hard_allocation",
        allocation_percent: 100,
        start_date: "",
        end_date: "",
        justification: "",
      });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit the request");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            New request
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise an allocation request</DialogTitle>
          <DialogDescription>Request a hard allocation or soft reservation for a project.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(projects ?? []).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                          {project.code ? ` (${project.code})` : ""}
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
              name="request_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hard_allocation">{REQUEST_TYPE_LABELS.hard_allocation}</SelectItem>
                      <SelectItem value="soft_reservation">{REQUEST_TYPE_LABELS.soft_reservation}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requested_profile_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource</FormLabel>
                  <Select
                    value={field.value ?? OPEN_ROLE_SENTINEL}
                    onValueChange={(value) => field.onChange(value === OPEN_ROLE_SENTINEL ? undefined : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={OPEN_ROLE_SENTINEL}>Open — anyone matching required skill</SelectItem>
                      {(profiles ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name}
                          {p.designation ? ` — ${p.designation}` : ""}
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
                  <Select
                    value={field.value ?? NO_RESOURCE_MANAGER_SENTINEL}
                    onValueChange={(value) => field.onChange(value === NO_RESOURCE_MANAGER_SENTINEL ? undefined : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a resource manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_RESOURCE_MANAGER_SENTINEL}>No resource manager</SelectItem>
                      {resourceManagerOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name}
                          {p.designation ? ` — ${p.designation}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="allocation_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allocation %</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div />
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date (optional)</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justification (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Why is this allocation needed?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={createRequest.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending ? "Submitting…" : "Submit request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
