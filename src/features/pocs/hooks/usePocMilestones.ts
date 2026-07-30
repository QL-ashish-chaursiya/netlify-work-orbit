import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import type { PocMilestoneDraft } from "@/features/pocs/types";

export const pocMilestonesKey = (pocId: string) => ["pocs", "milestones", pocId] as const;

export function usePocMilestones(pocId: string | undefined) {
  return useQuery({
    queryKey: pocMilestonesKey(pocId ?? ""),
    queryFn: async (): Promise<Tables<"poc_milestones">[]> => {
      const { data, error } = await supabase
        .from("poc_milestones")
        .select("*")
        .eq("poc_id", pocId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!pocId,
  });
}

// Milestones are staged client-side on the "Log New POC" page (no poc_id
// exists until the POC itself is created) and bulk-inserted right after, in
// the same submit action — see LogPocPage.
export function useCreatePocMilestones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pocId, milestones }: { pocId: string; milestones: PocMilestoneDraft[] }) => {
      if (milestones.length === 0) return [];
      const { data, error } = await supabase
        .from("poc_milestones")
        .insert(milestones.map((m) => ({ ...m, poc_id: pocId })))
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { pocId }) => {
      queryClient.invalidateQueries({ queryKey: pocMilestonesKey(pocId) });
    },
  });
}
