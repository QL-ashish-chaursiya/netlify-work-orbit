import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// "resource_manager" is the RPC parameter value (and the projects.resource_manager_id
// column it reads) — left unrenamed since this org's Tech Lead now fills that
// slot; see notify_release_stakeholder in migration 0014 for the label swap.
export type ReleaseNotifyTarget = "resource_manager" | "project_manager";

// Calls the notify_release_stakeholder() Postgres function (migration 0010,
// relabeled in 0014) — a manual "nudge" separate from the scheduled
// release-reminder cron. SECURITY DEFINER on the DB side since
// `notifications` has no client-facing INSERT policy; the function does its
// own org-membership check before writing anything.
export function useNotifyReleaseStakeholder() {
  return useMutation({
    mutationFn: async ({ allocationId, target }: { allocationId: string; target: ReleaseNotifyTarget }) => {
      const { error } = await supabase.rpc("notify_release_stakeholder", {
        p_allocation_id: allocationId,
        p_target: target,
      });
      if (error) throw error;
    },
  });
}
