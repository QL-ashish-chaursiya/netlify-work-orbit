import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

// Conflicts linking a given request to whichever other request(s) it overlaps
// with (request_conflicts FKs point both ways — request_id_a / request_id_b).
export function useConflictsForRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: ["request-conflicts", "for-request", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_conflicts")
        .select("*")
        .or(`request_id_a.eq.${requestId},request_id_b.eq.${requestId}`);
      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
  });
}

// Every resolved conflict pairing in the org — backs the Approval Queue's
// "Resolved" tab. RLS (request_conflicts_select) already scopes this via a
// join back to allocation_requests, so no client-side org filter needed.
export function useResolvedConflicts() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["request-conflicts", "resolved", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_conflicts")
        .select("*")
        .not("resolved_at", "is", null)
        .order("resolved_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

// RM/Admin marks a request_conflicts row resolved via resolve_request_conflict()
// (migration 0012) — beyond stamping resolved_at/resolved_by, that function
// also flips either linked request back to `pending` (rejoining the normal
// Queue tab) once it has no other unresolved conflicts left.
export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conflictId: string) => {
      const { error } = await supabase.rpc("resolve_request_conflict", { p_conflict_id: conflictId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-conflicts"] });
      // Broad "allocation-requests" prefix also covers queryKeys.approvalQueue
      // (["allocation-requests", "queue", routedTo]), so a resolved request
      // that just rejoined the Queue tab shows up there immediately too.
      queryClient.invalidateQueries({ queryKey: ["allocation-requests"] });
    },
  });
}

// Reopen is a records correction, not a re-block (see reopen_request_conflict
// in migration 0012) — it clears the resolved flag on this conflict pairing
// for visibility, but does not pull either linked request back out of
// wherever it's already progressed to.
export function useReopenConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conflictId: string) => {
      const { error } = await supabase.rpc("reopen_request_conflict", { p_conflict_id: conflictId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-conflicts"] });
    },
  });
}
