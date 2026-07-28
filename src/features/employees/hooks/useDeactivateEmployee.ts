import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { Tables } from "@/lib/database.types";

// Can hit the guard_last_admin trigger (0002_supplementary_rls_and_guards.sql)
// if this is the org's last active Admin — that raises a Postgres exception
// whose message is already human-readable, so we let it bubble unmodified
// for the caller to toast via error.message.
export function useDeactivateEmployee() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;
  const employeesKey = queryKeys.employees(orgId);

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .update({ status: "deactivated", deactivated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: employeesKey });
      const previous = queryClient.getQueryData<Tables<"profiles">[]>(employeesKey);
      if (previous) {
        queryClient.setQueryData<Tables<"profiles">[]>(
          employeesKey,
          previous.map((emp) =>
            emp.id === id ? { ...emp, status: "deactivated", deactivated_at: new Date().toISOString() } : emp,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(employeesKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: employeesKey });
    },
  });
}
