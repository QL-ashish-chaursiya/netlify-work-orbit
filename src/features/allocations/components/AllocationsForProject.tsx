import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ALLOCATION_STATUS_TONE, REQUEST_STATUS_TONE } from "@/lib/status-badges";
import type { BadgeTone } from "@/lib/status-badges";
import type { Tables } from "@/lib/database.types";
import { toast } from "sonner";
import { useAllocationsByProject } from "@/features/allocations/hooks/useAllocationsByProject";
import { useAllocationRequests } from "@/features/allocations/hooks/useAllocationRequests";
import { useProfileOptions } from "@/features/allocations/hooks/useLookups";
import { AllocationRequestForm } from "@/features/allocations/components/AllocationRequestForm";
import { MarkForReleaseDialog } from "@/features/release-planning/components/MarkForReleaseDialog";
import { useConfirmRelease } from "@/features/release-planning/hooks/useConfirmRelease";

type AllocationRow = Tables<"allocations">;
type AllocationRequestRow = Tables<"allocation_requests">;

interface AllocationsForProjectProps {
  projectId: string;
}

// One row shape covering both real allocations and still-in-flight requests
// for this project, so the page shows a single table instead of two. An
// approved request already has a matching allocations row (created the
// moment it's approved — see useDecideAllocationRequest), so it's excluded
// here to avoid showing the same staffing fact twice.
interface UnifiedRow {
  id: string;
  resourceProfileId: string | null;
  requestedByProfileId: string | null;
  allocationPercent: number;
  status: string;
  startDate: string;
  endOrReleaseDate: string | null;
  allocation?: AllocationRow;
}

const COMBINED_STATUS_TONE: Record<string, BadgeTone> = { ...ALLOCATION_STATUS_TONE, ...REQUEST_STATUS_TONE };

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
  const { data: requests, isLoading: requestsLoading } = useAllocationRequests();
  const { data: profiles } = useProfileOptions();

  const projectRequests = useMemo(
    () => (requests ?? []).filter((request) => request.project_id === projectId),
    [projectId, requests],
  );

  const profileName = (id: string | null) => (id ? profiles?.find((p) => p.id === id)?.full_name ?? "—" : "Open role");

  const rows = useMemo<UnifiedRow[]>(() => {
    const allocationRows: UnifiedRow[] = (allocations ?? []).map((a) => ({
      id: a.id,
      resourceProfileId: a.profile_id,
      requestedByProfileId: a.created_by,
      allocationPercent: Number(a.allocation_percent),
      status: a.status,
      startDate: a.start_date,
      endOrReleaseDate: a.expected_completion_date ?? a.planned_release_date,
      allocation: a,
    }));
    const pendingRequestRows: UnifiedRow[] = projectRequests
      .filter((r) => r.status !== "approved")
      .map((r: AllocationRequestRow) => ({
        id: r.id,
        resourceProfileId: r.requested_profile_id,
        requestedByProfileId: r.requested_by,
        allocationPercent: Number(r.allocation_percent),
        status: r.status,
        startDate: r.start_date,
        endOrReleaseDate: r.end_date,
      }));
    return [...allocationRows, ...pendingRequestRows];
  }, [allocations, projectRequests]);

  const columns: ColumnDef<UnifiedRow>[] = [
    {
      id: "resource",
      header: "Resource",
      cell: ({ row }) => profileName(row.original.resourceProfileId),
    },
    {
      id: "requestedBy",
      header: "Requested by",
      cell: ({ row }) => profileName(row.original.requestedByProfileId),
    },
    {
      accessorKey: "allocationPercent",
      header: "%",
      cell: ({ row }) => `${row.original.allocationPercent}%`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} toneMap={COMBINED_STATUS_TONE} />,
    },
    {
      accessorKey: "startDate",
      header: "Start",
    },
    {
      id: "release",
      header: "Expected / planned / end",
      cell: ({ row }) => row.original.endOrReleaseDate ?? "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (row.original.allocation ? <AllocationRowActions allocation={row.original.allocation} /> : null),
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
        data={rows}
        isLoading={isLoading || requestsLoading}
        emptyMessage="No resources allocated or requested for this project yet."
      />
    </div>
  );
}
