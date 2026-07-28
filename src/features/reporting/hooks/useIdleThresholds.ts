import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { Tables } from "@/lib/database.types";

// One org-wide default row (business_function_id: null) plus zero or more
// per-business-function override rows.
export async function fetchIdleThresholds(): Promise<Tables<"idle_thresholds">[]> {
  const { data, error } = await supabase
    .from("idle_thresholds")
    .select("*")
    .order("business_function_id", { ascending: true, nullsFirst: true });
  if (error) throw error;
  return data ?? [];
}

export function useIdleThresholds() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: queryKeys.idleThresholds(orgId),
    queryFn: fetchIdleThresholds,
    enabled: !!orgId,
  });
}
