import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ALLOCATION_STATUS_TONE } from "@/lib/status-badges";
import type { Tables } from "@/lib/database.types";
import { toast } from "sonner";
import { useAllocationsByProject } from "@/features/allocations/hooks/useAllocationsByProject";
import { useProfileOptions } from "@/features/allocations/hooks/useLookups";
import { AllocationRequestForm } from "@/features/allocations/components/AllocationRequestForm";
import { MarkForReleaseDialog } from "@/features/release-planning/components/MarkForReleaseDialog";
import { useConfirmRelease } from "@/features/release-planning/hooks/useConfirmRelease";

type AllocationRow = Tables<"allocations">;

interface AllocationsForProjectProps {
  projectId: string;
}

// This is also the only place in the app that lets a PM move an allocation
// off `active` status — that's a prerequisite for closing the project, since
// guard_project_close (DB trigger) and ProjectStatusStepper both block
// closing while any allocation here is still `active`.
function AllocationRowActions({ allocation }: { allocation: AllocationRow }) {
  const [confirmReleaseOpen, setConfirmReleaseOpen] = useState(false);
  const confirmRelease = useConfirmRelease();

  async function handleReleaseNow() {
    try {
      await confirmRelease.mutateAsync({ allocationId: allocation.id });
      toast.success("Allocation released.");
      setConfirmReleaseOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not release this allocation");
    }
  }

  if (allocation.status === "active") {
    return (
      <div className="flex justify-end gap-2">
        <MarkForReleaseDialog
          allocationId={allocation.id}
          trigger={
            <Button size="sm" variant="outline">
              Mark for release
            </Button>
          }
        />
        <Button size="sm" variant="outline" onClick={() => setConfirmReleaseOpen(true)}>
          Release now
        </Button>
        <ConfirmDialog
          open={confirmReleaseOpen}
          onOpenChange={setConfirmReleaseOpen}
          title="Release this allocation now?"
          description="This immediately frees the resource from the project (status → released), skipping a scheduled date."
          confirmLabel="Release now"
          isPending={confirmRelease.isPending}
          onConfirm={handleReleaseNow}
        />
      </div>
    );
  }

  if (allocation.status === "planned_for_release") {
    return (
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={handleReleaseNow} disabled={confirmRelease.isPending}>
          {confirmRelease.isPending ? "Releasing…" : "Confirm release"}
        </Button>
      </div>
    );
  }

  return null;
}

// Meant to slot directly into the Projects module's ProjectDetailPage
// placeholder — self-contained, single `projectId` prop, no cross-feature
// imports besides release-planning's already-standalone dialog/hook.
export function AllocationsForProject({ projectId }: AllocationsForProjectProps) {
  const { data: allocations, isLoading } = useAllocationsByProject(projectId);
  const { data: profiles } = useProfileOptions();

  const profileName = (id: string) => profiles?.find((p) => p.id === id)?.full_name ?? "—";

  const columns: ColumnDef<AllocationRow>[] = [
    {
      accessorKey: "profile_id",
      header: "Resource",
      cell: ({ row }) => profileName(row.original.profile_id),
    },
    {
      accessorKey: "allocation_percent",
      header: "%",
      cell: ({ row }) => `${row.original.allocation_percent}%`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} toneMap={ALLOCATION_STATUS_TONE} />,
    },
    {
      accessorKey: "start_date",
      header: "Start",
    },
    {
      id: "release",
      header: "Expected / planned release",
      cell: ({ row }) => row.original.expected_completion_date ?? row.original.planned_release_date ?? "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <AllocationRowActions allocation={row.original} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Allocations</h3>
        <AllocationRequestForm
          defaultProjectId={projectId}
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Raise allocation request
            </Button>
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={allocations ?? []}
        isLoading={isLoading}
        emptyMessage="No resources allocated to this project yet."
      />
    </div>
  );
}
