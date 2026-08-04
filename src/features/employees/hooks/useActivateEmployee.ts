import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { Tables } from "@/lib/database.types";

// Admin override: skips the normal "invitee sets their own password" flow
// (individual invite email, or bulk-import forgot-password activation) and
// flips the profile straight to active. Note this only changes profiles.status
// — it does not set a password on the underlying auth.users row, so someone
// activated this way still needs to use "Forgot password" once before they
// can actually log in. Useful for admins testing role/permission flows
// without waiting on email delivery.
export function useActivateEmployee() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;
  const employeesKey = queryKeys.employees(orgId);

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .update({ status: "active", deactivated_at: null })
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
          previous.map((emp) => (emp.id === id ? { ...emp, status: "active", deactivated_at: null } : emp)),
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
