import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApprovalQueueTable } from "@/features/allocations/components/ApprovalQueueTable";
import { ConflictBanner } from "@/features/allocations/components/ConflictBanner";
import { ReassignResourcePicker } from "@/features/allocations/components/ReassignResourcePicker";
import { ResolvedConflictsList } from "@/features/allocations/components/ResolvedConflictsList";
import { AllocationRequestForm } from "@/features/allocations/components/AllocationRequestForm";
import { useAllocationRequests } from "@/features/allocations/hooks/useAllocationRequests";
import { useResolvedConflicts } from "@/features/allocations/hooks/useResolveConflict";
import { useProfileOptions, useProjectOptions } from "@/features/allocations/hooks/useLookups";

export function ApprovalsPage() {
  const { data: requests } = useAllocationRequests();
  const { data: profiles } = useProfileOptions();
  const { data: projects } = useProjectOptions();
  const { data: resolvedConflicts } = useResolvedConflicts();
  const conflictedRequests = (requests ?? []).filter((r) => r.status === "conflict_flagged");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Approval Queue</h1>
          <p className="text-sm text-muted-foreground">
            Requests routed to you, plus everything pending if you're an Admin or Tech Lead.
          </p>
        </div>
        <AllocationRequestForm />
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts{conflictedRequests.length > 0 ? ` (${conflictedRequests.length})` : ""}</TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved{resolvedConflicts && resolvedConflicts.length > 0 ? ` (${resolvedConflicts.length})` : ""}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="mt-4">
          <ApprovalQueueTable />
        </TabsContent>
        <TabsContent value="conflicts" className="mt-4 space-y-4">
          {conflictedRequests.length === 0 ? (
            <EmptyState message="No conflicts to arbitrate." description="Overlapping requests on the same resource will show up here." />
          ) : (
            conflictedRequests.map((request) => (
              <div key={request.id} className="space-y-2 rounded-md border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{projects?.find((p) => p.id === request.project_id)?.name ?? "Unknown project"}</span>
                  <span className="text-muted-foreground">
                    {request.requested_profile_id
                      ? profiles?.find((p) => p.id === request.requested_profile_id)?.full_name ?? "—"
                      : "Open role"}{" "}
                    · {request.allocation_percent}% · {request.start_date} → {request.end_date ?? "open-ended"}
                  </span>
                </div>
                <ConflictBanner request={request} />
                <ReassignResourcePicker request={request} />
              </div>
            ))
          )}
        </TabsContent>
        <TabsContent value="resolved" className="mt-4">
          <ResolvedConflictsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
