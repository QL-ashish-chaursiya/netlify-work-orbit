import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimePostgresInsertPayload } from "@supabase/realtime-js";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { Tables } from "@/lib/database.types";

// Subscribes to Postgres Changes INSERT events on `notifications`, scoped to
// the current user's own rows (RLS applies to realtime too, and we also
// filter server-side via `filter: profile_id=eq.<uuid>` to avoid noise).
// Every insert that reaches the client already passed through whatever
// server-side logic (edge functions, notification_rules) decided it should
// exist — the client's only job is to surface it as a toast and keep the
// bell's cached list/unread count live.
export function useNotificationRealtimeToast() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();
  const profileId = profile?.id;

  useEffect(() => {
    if (!profileId) return;

    const queryKey = queryKeys.notifications(profileId);
    const channel = supabase
      .channel(`notifications-toast-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profileId}`,
        },
        (payload: RealtimePostgresInsertPayload<Tables<"notifications">>) => {
          const notification = payload.new;

          toast(notification.title, {
            description: notification.body ?? undefined,
          });

          queryClient.setQueryData<Tables<"notifications">[]>(queryKey, (old) => {
            if (!old) return old;
            if (old.some((existing) => existing.id === notification.id)) return old;
            return [notification, ...old];
          });
          queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profileId, queryClient]);
}
