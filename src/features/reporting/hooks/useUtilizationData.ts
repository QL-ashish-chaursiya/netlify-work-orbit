import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { AllocationStatus } from "@/lib/database.types";
import type { UtilizationRow } from "@/features/reporting/types";

// Statuses that represent a resource currently carrying work — same set
// AllocationRequestForm/ReassignResourcePicker treat as "occupied" when
// deciding who's available to staff. `soft_reserved` (half allocation) and
// `planned_for_release` (still working until the release date) both count
// just as much as `active` — only `released`/`cancelled` free someone up.
const CURRENT_UTILIZATION_STATUSES: AllocationStatus[] = ["active", "soft_reserved", "planned_for_release"];

// Core utilization computation, shared by useBenchReport / useOverAllocatedResources
// so every consumer resolves utilization the same way.
//
// Methodology: we start from every `active`-account-status, non-Admin profile
// in the org (not just profiles that happen to have an allocation row) and
// left-join in the sum of their currently-occupying-status allocations
// (see CURRENT_UTILIZATION_STATUSES above), defaulting to 0%. Starting from
// allocations alone would silently drop fully-idle resources — exactly the
// people a bench report exists to surface — so this widens the BRD's literal
// "group allocations by profile_id" instruction to include the zero case.
// Admin is excluded, not just team_member included: every other role (Tech
// Lead, PM, Sales Lead, Team Member) is a real resource that can be
// allocated and should count toward org utilization; only Admin never
// carries work and would just drag the average down.
export async function fetchUtilizationRows(): Promise<UtilizationRow[]> {
  const [{ data: profiles, error: profilesError }, { data: allocations, error: allocationsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, business_function_id")
        .eq("status", "active")
        .neq("primary_role", "admin"),
      supabase.from("allocations").select("profile_id, allocation_percent").in("status", CURRENT_UTILIZATION_STATUSES),
    ]);

  if (profilesError) throw profilesError;
  if (allocationsError) throw allocationsError;

  const sumsByProfile = new Map<string, number>();
  for (const allocation of allocations ?? []) {
    sumsByProfile.set(
      allocation.profile_id,
      (sumsByProfile.get(allocation.profile_id) ?? 0) + Number(allocation.allocation_percent),
    );
  }

  return (profiles ?? []).map((profile) => {
    const utilizationPercent = Math.round((sumsByProfile.get(profile.id) ?? 0) * 100) / 100;
    return {
      profileId: profile.id,
      fullName: profile.full_name,
      businessFunctionId: profile.business_function_id,
      utilizationPercent,
      isOverAllocated: utilizationPercent > 100,
    };
  });
}

export function useUtilizationData() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: queryKeys.utilization(orgId),
    queryFn: fetchUtilizationRows,
    enabled: !!orgId,
  });
}
