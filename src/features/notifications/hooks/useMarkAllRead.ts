import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { Tables } from "@/lib/database.types";

// The `.eq('profile_id', ...)` below is a legitimate "only touch my own rows
// in this bulk update" filter, not a substitute for tenant isolation — RLS
// (notifications_update_own) already enforces profile_id = auth.uid() on
// every row regardless. Without it, `.is('read_at', null)` alone would still
// only ever match the caller's own rows because of RLS, but scoping it here
// keeps the intent of the query explicit.
export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();
  const profileId = profile?.id;
  const queryKey = queryKeys.notifications(profileId);

  return useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error("Not authenticated");
      const readAt = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: readAt })
        .eq("profile_id", profileId)
        .is("read_at", null);
      if (error) throw error;
      return readAt;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Tables<"notifications">[]>(queryKey);
      const readAt = new Date().toISOString();
      queryClient.setQueryData<Tables<"notifications">[]>(queryKey, (old) =>
        old?.map((notification) => (notification.read_at === null ? { ...notification, read_at: readAt } : notification)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
