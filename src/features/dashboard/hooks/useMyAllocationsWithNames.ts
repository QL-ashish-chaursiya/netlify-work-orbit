import { useQuery } from "@tanstack/react-query";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { supabase } from "@/lib/supabase";
import { attachAllocationNames } from "@/features/release-planning/hooks/attachAllocationNames";
import type { AllocationWithNames } from "@/features/release-planning/types";

// Team Member dashboard: the signed-in user's own allocations, with project
// names attached — reuses attachAllocationNames rather than a fresh join.
export function useMyAllocationsWithNames() {
  const { profile } = useAuthRole();

  return useQuery({
    queryKey: ["dashboard", "my-allocations", profile?.id],
    queryFn: async (): Promise<AllocationWithNames[]> => {
      const { data, error } = await supabase
        .from("allocations")
        .select("*")
        .eq("profile_id", profile!.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return attachAllocationNames(data);
    },
    enabled: !!profile?.id,
  });
}
