import { useMemo } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { useResolvedConflicts, useReopenConflict } from "@/features/allocations/hooks/useResolveConflict";
import { useRequestsByIds } from "@/features/allocations/hooks/useAllocationRequests";
import { useProfileOptions, useProjectOptions } from "@/features/allocations/hooks/useLookups";
import type { Tables } from "@/lib/database.types";

function RequestSummary({
  request,
  profileName,
  projectName,
}: {
  request: Tables<"allocation_requests"> | undefined;
  profileName: (id: string | null) => string;
  projectName: (id: string) => string;
}) {
  if (!request) return <p className="text-sm text-muted-foreground">Request no longer available</p>;
  return (
    <div className="text-sm">
      <p className="font-medium">{projectName(request.project_id)}</p>
      <p className="text-muted-foreground">
        {profileName(request.requested_profile_id)} · {request.allocation_percent}% · {request.start_date} →{" "}
        {request.end_date ?? "open-ended"}
      </p>
    </div>
  );
}

// The "Resolved" tab counterpart to ConflictBanner's unresolved list — every
// request_conflicts row with resolved_at set, each with a Reopen action.
// Reopening only clears the resolved flag (see useReopenConflict) — it's a
// records correction, not a re-block, so it doesn't touch either linked
// request's status.
export function ResolvedConflictsList() {
  const { hasRole } = useAuthRole();
  const canReopen = hasRole("admin") || hasRole("tech_lead");

  const { data: conflicts, isLoading } = useResolvedConflicts();
  const reopenConflict = useReopenConflict();
  const { data: profiles } = useProfileOptions();
  const { data: projects } = useProjectOptions();

  const requestIds = useMemo(
    () => Array.from(new Set((conflicts ?? []).flatMap((c) => [c.request_id_a, c.request_id_b]))),
    [conflicts],
  );
  const { data: requests } = useRequestsByIds(requestIds);

  const profileName = (id: string | null) => (id ? profiles?.find((p) => p.id === id)?.full_name ?? "—" : "Open role");
  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? "Unknown project";
  const requestById = (id: string) => requests?.find((r) => r.id === id);

  async function handleReopen(conflictId: string) {
    try {
      await reopenConflict.mutateAsync(conflictId);
      toast.success("Conflict reopened.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reopen the conflict");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!conflicts || conflicts.length === 0) {
    return <EmptyState message="No resolved conflicts yet." description="Conflicts you mark resolved will show up here." />;
  }

  return (
    <div className="space-y-3">
      {conflicts.map((c) => (
        <div key={c.id} className="space-y-3 rounded-md border p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Resolved {c.resolved_at ? new Date(c.resolved_at).toLocaleDateString() : ""}
            {c.resolved_by ? ` by ${profileName(c.resolved_by)}` : ""}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <RequestSummary request={requestById(c.request_id_a)} profileName={profileName} projectName={projectName} />
            <RequestSummary request={requestById(c.request_id_b)} profileName={profileName} projectName={projectName} />
          </div>
          {canReopen && (
            <Button size="sm" variant="outline" disabled={reopenConflict.isPending} onClick={() => handleReopen(c.id)}>
              Reopen
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
