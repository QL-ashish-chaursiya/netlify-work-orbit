import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { TablesInsert } from "@/lib/database.types";
import type { AllocationRequestInput } from "@/features/allocations/types";

// Nulls (open-ended dates) are treated as far-future for overlap purposes.
const FAR_FUTURE = "9999-12-31";

function rangesOverlap(startA: string, endA: string | null, startB: string, endB: string | null): boolean {
  const eA = endA ?? FAR_FUTURE;
  const eB = endB ?? FAR_FUTURE;
  return startA <= eB && startB <= eA;
}

export function useCreateAllocationRequest() {
  const { profile } = useAuthRole();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AllocationRequestInput) => {
      if (!profile) throw new Error("Not authenticated");

      const requestedProfileId = input.requested_profile_id ?? null;
      const routedTo = input.resource_manager_id ?? null;
      const endDate = input.end_date ?? null;

      // Routing: prefer an explicitly selected resource manager. If none is
      // chosen, route to the requested resource's reporting manager when we
      // have a concrete target; otherwise leave routed_to null so any
      // Admin/RM can pick it up.
      let finalRoutedTo: string | null = routedTo;
      if (!finalRoutedTo && requestedProfileId) {
        const { data: targetProfile, error: targetError } = await supabase
          .from("profiles")
          .select("reporting_manager_id")
          .eq("id", requestedProfileId)
          .single();
        if (targetError) throw targetError;
        finalRoutedTo = targetProfile?.reporting_manager_id ?? null;
      }

      // Conflict detection: overlapping-date allocations/requests on the same
      // resource whose combined percent would exceed 100.
      let conflictingRequestIds: string[] = [];
      let hasAllocationConflict = false;

      if (requestedProfileId) {
        const [allocationsResult, requestsResult] = await Promise.all([
          supabase
            .from("allocations")
            .select("id, allocation_percent, start_date, expected_completion_date, status")
            .eq("profile_id", requestedProfileId)
            .in("status", ["active", "soft_reserved"]),
          supabase
            .from("allocation_requests")
            .select("id, allocation_percent, start_date, end_date, status")
            .eq("requested_profile_id", requestedProfileId)
            .eq("status", "pending"),
        ]);
        if (allocationsResult.error) throw allocationsResult.error;
        if (requestsResult.error) throw requestsResult.error;

        const overlappingAllocations = (allocationsResult.data ?? []).filter((a) =>
          rangesOverlap(input.start_date, endDate, a.start_date, a.expected_completion_date),
        );
        const overlappingRequests = (requestsResult.data ?? []).filter((r) =>
          rangesOverlap(input.start_date, endDate, r.start_date, r.end_date),
        );

        const overlapPercentSum =
          overlappingAllocations.reduce((sum, a) => sum + Number(a.allocation_percent), 0) +
          overlappingRequests.reduce((sum, r) => sum + Number(r.allocation_percent), 0) +
          input.allocation_percent;

        if (overlapPercentSum > 100) {
          hasAllocationConflict = overlappingAllocations.length > 0;
          conflictingRequestIds = overlappingRequests.map((r) => r.id);
        }
      }

      const isConflict = hasAllocationConflict || conflictingRequestIds.length > 0;

      const insertPayload: TablesInsert<"allocation_requests"> = {
        organization_id: profile.organization_id,
        project_id: input.project_id,
        requested_profile_id: requestedProfileId,
        requested_by: profile.id,
        request_type: input.request_type,
        allocation_percent: input.allocation_percent,
        start_date: input.start_date,
        end_date: endDate,
        justification: input.justification || null,
        status: isConflict ? "conflict_flagged" : "pending",
        routed_to: finalRoutedTo,
      };

      const { data: newRequest, error: insertError } = await supabase
        .from("allocation_requests")
        .insert(insertPayload)
        .select()
        .single();
      if (insertError) throw insertError;

      if (conflictingRequestIds.length > 0) {
        const conflictRows: TablesInsert<"request_conflicts">[] = conflictingRequestIds.map((otherId) => ({
          request_id_a: newRequest.id,
          request_id_b: otherId,
        }));
        // NOTE: request_conflicts has an org-scoped SELECT policy and an
        // Admin/RM-only UPDATE (resolve) policy in 0002_supplementary_rls_and_guards.sql,
        // but no INSERT policy was added for it — with RLS enabled and no
        // matching policy, this insert is denied by default. We don't own
        // supabase/migrations/**, so we can't add the missing policy; we
        // swallow the failure here rather than let a missing linking row
        // block the (successfully flagged) request from being created. See
        // final report for detail — this needs a migration fix upstream.
        const { error: conflictError } = await supabase.from("request_conflicts").insert(conflictRows);
        if (conflictError) {
          console.warn("Could not persist request_conflicts row (likely missing INSERT policy):", conflictError);
        }
      }

      return newRequest;
    },
    onSuccess: () => {
      // Invalidates queryKeys.allocationRequests(orgId) and every
      // queryKeys.approvalQueue(routedTo) variant, since both key families
      // share the "allocation-requests" root and TanStack Query invalidates
      // by array-prefix match.
      queryClient.invalidateQueries({ queryKey: ["allocation-requests"] });
    },
  });
}
