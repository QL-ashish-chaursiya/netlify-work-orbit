import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { useConflictsForRequest, useResolveConflict } from "@/features/allocations/hooks/useResolveConflict";
import { useRequestsByIds } from "@/features/allocations/hooks/useAllocationRequests";
import { useProfileOptions, useProjectOptions } from "@/features/allocations/hooks/useLookups";
import type { Tables } from "@/lib/database.types";

interface ConflictBannerProps {
  request: Tables<"allocation_requests">;
}

// Shown for a request with status = 'conflict_flagged'. Joins request_conflicts
// -> the "other side" request(s) client-side (see useAllocationRequests'
// useRequestsByIds) and gives RM/Admin a Resolve action per conflict.
export function ConflictBanner({ request }: ConflictBannerProps) {
  const { hasRole } = useAuthRole();
  const canResolve = hasRole("admin") || hasRole("resource_manager");

  const { data: conflicts, isLoading } = useConflictsForRequest(request.id);
  const otherIds = Array.from(
    new Set((conflicts ?? []).map((c) => (c.request_id_a === request.id ? c.request_id_b : c.request_id_a))),
  );
  const { data: otherRequests } = useRequestsByIds(otherIds);
  const { data: profiles } = useProfileOptions();
  const { data: projects } = useProjectOptions();
  const resolveConflict = useResolveConflict();

  if (request.status !== "conflict_flagged") return null;

  const unresolved = (conflicts ?? []).filter((c) => !c.resolved_at);

  async function handleResolve(conflictId: string) {
    try {
      await resolveConflict.mutateAsync(conflictId);
      toast.success("Conflict marked resolved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resolve the conflict");
    }
  }

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertTriangle className="h-4 w-4" />
        Conflict detected — overlapping demand on the same resource exceeds 100% allocation.
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading conflicting requests…</p>
      ) : unresolved.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No other pending request is linked — this likely conflicts with an already-active allocation instead.
        </p>
      ) : (
        <ul className="space-y-2">
          {unresolved.map((c) => {
            const otherId = c.request_id_a === request.id ? c.request_id_b : c.request_id_a;
            const other = otherRequests?.find((r) => r.id === otherId);
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded bg-background/60 p-2 text-sm">
                <div>
                  <p className="font-medium">{other ? projects?.find((p) => p.id === other.project_id)?.name ?? "Unknown project" : "Conflicting request"}</p>
                  {other && (
                    <p className="text-muted-foreground">
                      {other.allocation_percent}% · {other.start_date} → {other.end_date ?? "open-ended"} ·{" "}
                      {other.requested_profile_id
                        ? profiles?.find((p) => p.id === other.requested_profile_id)?.full_name ?? "—"
                        : "Open role"}
                    </p>
                  )}
                </div>
                {canResolve && (
                  <Button size="sm" variant="outline" disabled={resolveConflict.isPending} onClick={() => handleResolve(c.id)}>
                    Mark resolved
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
