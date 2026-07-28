import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { resolveEdgeFunctionError } from "@/features/employees/hooks/edgeFunctionError";
import type { AddEmployeeInput } from "@/features/employees/types";
import type { Tables } from "@/lib/database.types";

// Path B (BRD §4): individual invite via the invite-employee edge function,
// which uses the Admin API's inviteUserByEmail and sends the set-password email.
export function useAddEmployee() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();

  return useMutation({
    mutationFn: async (input: AddEmployeeInput) => {
      const { data, error } = await supabase.functions.invoke<{ profile?: Tables<"profiles">; error?: string }>(
        "invite-employee",
        { body: input },
      );
      const message = await resolveEdgeFunctionError(error, data);
      if (message) throw new Error(message);
      return data?.profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(profile?.organization_id) });
    },
  });
}
