import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

// Conflicts linking a given request to whichever other request(s) it overlaps
// with (request_conflicts FKs point both ways — request_id_a / request_id_b).
export function useConflictsForRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: ["request-conflicts", "for-request", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_conflicts")
        .select("*")
        .or(`request_id_a.eq.${requestId},request_id_b.eq.${requestId}`);
      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
  });
}

// RM/Admin marks a request_conflicts row resolved.
export function useResolveConflict() {
  const { profile } = useAuthRole();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conflictId: string) => {
      if (!profile) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("request_conflicts")
        .update({ resolved_at: new Date().toISOString(), resolved_by: profile.id })
        .eq("id", conflictId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-conflicts"] });
      queryClient.invalidateQueries({ queryKey: ["allocation-requests"] });
    },
  });
}
