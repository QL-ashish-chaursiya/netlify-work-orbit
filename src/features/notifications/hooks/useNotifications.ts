import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

// RLS (notifications_select_own) already scopes this to the caller's own
// rows via profile_id = auth.uid() — no client-side org filter needed, and
// no extra profile_id filter needed either since RLS enforces it server-side.
export function useNotifications() {
  const { profile } = useAuthRole();
  const profileId = profile?.id;

  return useQuery({
    queryKey: queryKeys.notifications(profileId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}
