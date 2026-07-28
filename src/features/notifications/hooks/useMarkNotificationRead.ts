import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { Tables } from "@/lib/database.types";

// RLS (notifications_update_own) already restricts this to the caller's own
// row via profile_id = auth.uid() — no client-side filter needed beyond `id`.
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();
  const profileId = profile?.id;
  const queryKey = queryKeys.notifications(profileId);

  return useMutation({
    mutationFn: async (id: string) => {
      const readAt = new Date().toISOString();
      const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", id);
      if (error) throw error;
      return { id, readAt };
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Tables<"notifications">[]>(queryKey);
      const readAt = new Date().toISOString();
      queryClient.setQueryData<Tables<"notifications">[]>(queryKey, (old) =>
        old?.map((notification) => (notification.id === id ? { ...notification, read_at: readAt } : notification)),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
