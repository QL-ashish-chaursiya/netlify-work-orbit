import { useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { REQUEST_STATUS_TONE } from "@/lib/status-badges";
import type { Tables } from "@/lib/database.types";
import { useApprovalQueue } from "@/features/allocations/hooks/useApprovalQueue";
import { useDecideAllocationRequest, useRequestMoreInfo } from "@/features/allocations/hooks/useDecideAllocationRequest";
import { useProfileOptions, useProjectOptions } from "@/features/allocations/hooks/useLookups";

type AllocationRequestRow = Tables<"allocation_requests">;

interface PendingDecision {
  request: AllocationRequestRow;
  decision: "approved" | "rejected";
}

// Notes-carrying confirm dialog for approve/reject — the shared ConfirmDialog
// has no slot for an extra field, so this small local dialog is built on the
// same primitives instead of extending that shared component.
export function ApprovalQueueTable() {
  const { data: requests, isLoading } = useApprovalQueue();
  const { data: profiles } = useProfileOptions();
  const { data: projects } = useProjectOptions();
  const decide = useDecideAllocationRequest();
  const requestInfo = useRequestMoreInfo();

  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [infoTarget, setInfoTarget] = useState<AllocationRequestRow | null>(null);
  const [infoNote, setInfoNote] = useState("");

  const profileName = (id: string | null) => (id ? profiles?.find((p) => p.id === id)?.full_name ?? "—" : "Open role");
  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? "—";

  async function confirmDecision() {
    if (!pendingDecision) return;
    try {
      await decide.mutateAsync({
        request: pendingDecision.request,
        decision: pendingDecision.decision,
        decision_notes: decisionNotes || undefined,
      });
      toast.success(pendingDecision.decision === "approved" ? "Request approved." : "Request rejected.");
      setPendingDecision(null);
      setDecisionNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record the decision");
    }
  }

  async function submitInfoRequest() {
    if (!infoTarget) return;
    try {
      await requestInfo.mutateAsync({ requestId: infoTarget.id, note: infoNote });
      toast.success("Note added to the request.");
      setInfoTarget(null);
      setInfoNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the note");
    }
  }

  const columns: ColumnDef<AllocationRequestRow>[] = [
    {
      accessorKey: "requested_by",
      header: "Requester",
      cell: ({ row }) => profileName(row.original.requested_by),
    },
    {
      accessorKey: "requested_profile_id",
      header: "Target",
      cell: ({ row }) => profileName(row.original.requested_profile_id),
    },
    {
      accessorKey: "project_id",
      header: "Project",
      cell: ({ row }) => projectName(row.original.project_id),
    },
    {
      accessorKey: "allocation_percent",
      header: "%",
      cell: ({ row }) => `${row.original.allocation_percent}%`,
    },
    {
      id: "dates",
      header: "Dates",
      cell: ({ row }) => `${row.original.start_date} → ${row.original.end_date ?? "open-ended"}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} toneMap={REQUEST_STATUS_TONE} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPendingDecision({ request: row.original, decision: "approved" })}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPendingDecision({ request: row.original, decision: "rejected" })}
          >
            Reject
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setInfoTarget(row.original);
              setInfoNote(row.original.decision_notes ?? "");
            }}
          >
            Request info
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={requests ?? []}
        isLoading={isLoading}
        emptyMessage="No requests waiting on you right now."
      />

      <Dialog open={!!pendingDecision} onOpenChange={(open) => !open && setPendingDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingDecision?.decision === "approved" ? "Approve request" : "Reject request"}</DialogTitle>
            <DialogDescription>
              {pendingDecision?.decision === "approved"
                ? "This will create the allocation once confirmed."
                : "The requester will be notified this request was rejected."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Decision notes (optional)"
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDecision(null)} disabled={decide.isPending}>
              Cancel
            </Button>
            <Button
              variant={pendingDecision?.decision === "rejected" ? "destructive" : "default"}
              onClick={confirmDecision}
              disabled={decide.isPending}
            >
              {decide.isPending ? "Working…" : pendingDecision?.decision === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!infoTarget} onOpenChange={(open) => !open && setInfoTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request more info</DialogTitle>
            <DialogDescription>Leaves the request pending — just adds a note for the requester.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="What do you need clarified?" value={infoNote} onChange={(e) => setInfoNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoTarget(null)} disabled={requestInfo.isPending}>
              Cancel
            </Button>
            <Button onClick={submitInfoRequest} disabled={requestInfo.isPending}>
              {requestInfo.isPending ? "Saving…" : "Save note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
