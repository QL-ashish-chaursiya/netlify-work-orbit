import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { TablesInsert } from "@/lib/database.types";
import type { IdleThresholdInput } from "@/features/reporting/types";

// Upserts one idle_thresholds row (org-wide default when business_function_id
// is null, otherwise a per-business-function override).
//
// Note: idle_thresholds has `unique (organization_id, business_function_id)`,
// but Postgres unique constraints treat NULL as distinct from NULL — a plain
// `.upsert(..., { onConflict: 'organization_id,business_function_id' })`
// therefore cannot detect an existing *org-wide* row (business_function_id
// null) and would insert a duplicate default instead of updating it. We look
// up the existing row explicitly first and update/insert accordingly, which
// works correctly for both the null and non-null cases.
export function useSetIdleThreshold() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useMutation({
    mutationFn: async (input: IdleThresholdInput) => {
      if (!orgId) throw new Error("Not authenticated");
      const businessFunctionId = input.business_function_id ?? null;

      let existingQuery = supabase.from("idle_thresholds").select("id").eq("organization_id", orgId);
      existingQuery = businessFunctionId
        ? existingQuery.eq("business_function_id", businessFunctionId)
        : existingQuery.is("business_function_id", null);
      const { data: existing, error: existingError } = await existingQuery.maybeSingle();
      if (existingError) throw existingError;

      if (existing) {
        const { data, error } = await supabase
          .from("idle_thresholds")
          .update({ threshold_percent: input.threshold_percent })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const payload: TablesInsert<"idle_thresholds"> = {
        organization_id: orgId,
        business_function_id: businessFunctionId,
        threshold_percent: input.threshold_percent,
      };
      const { data, error } = await supabase.from("idle_thresholds").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.idleThresholds(orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.benchReport(orgId) });
    },
  });
}
