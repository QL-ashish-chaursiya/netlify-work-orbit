import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

// Shared across org-setup, projects, and pocs — business_functions is a
// cross-feature lookup table, owned here rather than duplicated per feature.
export function useBusinessFunctions() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: queryKeys.businessFunctions(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_functions")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateBusinessFunctions() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();

  return useMutation({
    mutationFn: async (names: string[]) => {
      if (!profile) throw new Error("Not authenticated");
      const rows = names
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ organization_id: profile.organization_id, name }));
      const { data, error } = await supabase.from("business_functions").insert(rows).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.businessFunctions(profile?.organization_id) });
    },
  });
}
