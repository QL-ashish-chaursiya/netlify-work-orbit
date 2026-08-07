import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfileOptions } from "@/features/allocations/hooks/useLookups";
import { useAllocationsByProject } from "@/features/allocations/hooks/useAllocationsByProject";
import { useReassignRequestResource } from "@/features/allocations/hooks/useReassignRequestResource";
import type { Tables } from "@/lib/database.types";

const OCCUPIED_STATUSES = new Set(["active", "soft_reserved", "planned_for_release"]);

interface ReassignResourcePickerProps {
  request: Tables<"allocation_requests">;
}

// Sits alongside ConflictBanner on a conflict-flagged request — instead of
// (or in addition to) resolving the specific overlapping pair, this lets an
// approver pick a completely different, unoccupied resource for the request
// and send it back to the normal queue.
export function ReassignResourcePicker({ request }: ReassignResourcePickerProps) {
  const { data: profiles } = useProfileOptions();
  const { data: projectAllocations } = useAllocationsByProject(request.project_id);
  const reassign = useReassignRequestResource();
  const [newProfileId, setNewProfileId] = useState("");

  const availableProfiles = useMemo(() => {
    const occupiedIds = new Set(
      (projectAllocations ?? []).filter((a) => OCCUPIED_STATUSES.has(a.status)).map((a) => a.profile_id),
    );
    return (profiles ?? []).filter((p) => !occupiedIds.has(p.id) && p.id !== request.requested_profile_id);
  }, [profiles, projectAllocations, request.requested_profile_id]);

  async function handleReassign() {
    if (!newProfileId) return;
    try {
      await reassign.mutateAsync({ requestId: request.id, newProfileId });
      toast.success("Request reassigned to a different resource and returned to the queue.");
      setNewProfileId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reassign the resource");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2">
      <Select value={newProfileId} onValueChange={setNewProfileId}>
        <SelectTrigger className="h-8 w-56 text-sm">
          <SelectValue placeholder="Allocate an alternative resource…" />
        </SelectTrigger>
        <SelectContent>
          {availableProfiles.length ? (
            availableProfiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
                {p.designation ? ` — ${p.designation}` : ""}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No unoccupied alternative available.</div>
          )}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={!newProfileId || reassign.isPending} onClick={handleReassign}>
        {reassign.isPending ? "Reassigning…" : "Reassign"}
      </Button>
    </div>
  );
}
