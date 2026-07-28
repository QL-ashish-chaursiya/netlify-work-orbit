import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { resolveEdgeFunctionError } from "@/features/employees/hooks/edgeFunctionError";

// Re-sends the Supabase Admin API invite email for a profile stuck in
// `invited` status (Path B only — pending_activation/bulk_import rows never
// had an email in the first place and activate via Forgot Password instead).
export function useResendInvite() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
        "resend-invite",
        { body: { profile_id: profileId } },
      );
      const message = await resolveEdgeFunctionError(error, data);
      if (message) throw new Error(message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(profile?.organization_id) });
    },
  });
}
