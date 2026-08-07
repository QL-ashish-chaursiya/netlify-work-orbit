import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { useAllocationsPlannedForRelease } from "@/features/release-planning/hooks/useAllocationsPlannedForRelease";
import { useConfirmRelease } from "@/features/release-planning/hooks/useConfirmRelease";
import { useExtendAllocation } from "@/features/release-planning/hooks/useExtendAllocation";
import { useNotifyReleaseStakeholder } from "@/features/release-planning/hooks/useNotifyReleaseStakeholder";
import {
  extendAllocationSchema,
  type AllocationWithNames,
  type ExtendAllocationInput,
} from "@/features/release-planning/types";

function daysRemaining(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DaysRemainingCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  const days = daysRemaining(date);
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`;
  const tone =
    days <= 0
      ? "text-red-600 dark:text-red-400"
      : days <= 3
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
  return <span className={cn("font-medium", tone)}>{label}</span>;
}

function RowActions({ allocation }: { allocation: AllocationWithNames }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const confirmRelease = useConfirmRelease();
  const extendAllocation = useExtendAllocation();
  const notifyStakeholder = useNotifyReleaseStakeholder();

  const form = useForm<ExtendAllocationInput>({
    resolver: zodResolver(extendAllocationSchema),
    defaultValues: { new_expected_completion_date: allocation.expected_completion_date ?? "" },
  });

  async function onConfirmRelease() {
    try {
      await confirmRelease.mutateAsync({ allocationId: allocation.id });
      toast.success("Allocation released.");
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not confirm release");
    }
  }

  async function onExtend(values: ExtendAllocationInput) {
    try {
      await extendAllocation.mutateAsync({ allocationId: allocation.id, ...values });
      toast.success("Allocation extended and pulled back into active work.");
      setExtendOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not extend allocation");
    }
  }

  async function onNotify(target: "resource_manager" | "project_manager") {
    try {
      await notifyStakeholder.mutateAsync({ allocationId: allocation.id, target });
      toast.success(`Notified the ${target === "resource_manager" ? "Tech Lead" : "Project Manager"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send notification");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => setConfirmOpen(true)}>
        Confirm release
      </Button>
      <Button size="sm" variant="outline" onClick={() => setExtendOpen(true)}>
        Extend
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={notifyStakeholder.isPending}
        onClick={() => onNotify("resource_manager")}
      >
        Notify Tech Lead
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={notifyStakeholder.isPending}
        onClick={() => onNotify("project_manager")}
      >
        Notify PM
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm release"
        description={`Mark ${allocation.profile?.full_name ?? "this resource"} as released from ${
          allocation.project?.name ?? "this project"
        }? This sets today as the actual release date.`}
        confirmLabel="Confirm release"
        isPending={confirmRelease.isPending}
        onConfirm={onConfirmRelease}
      />

      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend allocation</DialogTitle>
            <DialogDescription>
              Pull this allocation back into active work with a new expected completion date.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onExtend)} className="space-y-4">
              <FormField
                control={form.control}
                name="new_expected_completion_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New expected completion date</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setExtendOpen(false)}
                  disabled={extendAllocation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={extendAllocation.isPending}>
                  {extendAllocation.isPending ? "Saving…" : "Extend"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ReleasePlanningList() {
  const { data, isLoading } = useAllocationsPlannedForRelease();

  const columns = useMemo<ColumnDef<AllocationWithNames>[]>(
    () => [
      {
        id: "resource",
        header: "Resource",
        cell: ({ row }) => row.original.profile?.full_name ?? "—",
      },
      {
        id: "project",
        header: "Project",
        cell: ({ row }) => row.original.project?.name ?? "—",
      },
      {
        id: "planned_release_date",
        header: "Planned release date",
        cell: ({ row }) =>
          row.original.planned_release_date ? format(new Date(row.original.planned_release_date), "MMM d, yyyy") : "—",
      },
      {
        id: "days_remaining",
        header: "Days remaining",
        cell: ({ row }) => <DaysRemainingCell date={row.original.planned_release_date} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => <RowActions allocation={row.original} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      isLoading={isLoading}
      emptyMessage="No allocations are currently planned for release."
    />
  );
}
