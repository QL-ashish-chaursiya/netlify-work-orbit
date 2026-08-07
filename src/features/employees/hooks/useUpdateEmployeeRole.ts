import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { UserRole } from "@/lib/database.types";

// Admin-only in practice (profiles_update_self_or_admin RLS: self or Admin).
// Changing someone's role away from 'admin' can still trip guard_last_admin
// indirectly if it were ever the last one — that guard only fires on
// deactivation today, not role change, so this stays a plain update.
export function useUpdateEmployeeRole() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();

  return useMutation({
    mutationFn: async ({ id, primary_role }: { id: string; primary_role: UserRole }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update({ primary_role })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(profile?.organization_id) });
    },
  });
}
