import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { UtilizationRow } from "@/features/reporting/types";

// Core utilization computation, shared by useBenchReport / useOverAllocatedResources
// so every consumer resolves utilization the same way.
//
// Methodology: we start from every `active`-account-status profile in the org
// (not just profiles that happen to have an allocation row) and left-join in the
// sum of their `active`-status allocations, defaulting to 0%. Starting from
// allocations alone would silently drop fully-idle resources — exactly the
// people a bench report exists to surface — so this widens the BRD's literal
// "group allocations by profile_id" instruction to include the zero case.
export async function fetchUtilizationRows(): Promise<UtilizationRow[]> {
  const [{ data: profiles, error: profilesError }, { data: allocations, error: allocationsError }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, business_function_id").eq("status", "active"),
      supabase.from("allocations").select("profile_id, allocation_percent").eq("status", "active"),
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
