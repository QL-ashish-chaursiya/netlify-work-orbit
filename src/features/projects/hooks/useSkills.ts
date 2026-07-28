import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { Tables } from "@/lib/database.types";

// Local, org-scoped read of the `skills` table for the role-requirement skill
// picker. Written here rather than imported from the Allocations feature
// (which also reads skills for Expertise Search) to keep the two features
// decoupled — this hook only reads, never writes.
export function useSkills() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: queryKeys.skills(orgId),
    queryFn: async (): Promise<Tables<"skills">[]> => {
      const { data, error } = await supabase.from("skills").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}
