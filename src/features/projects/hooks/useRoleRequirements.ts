import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { Tables } from "@/lib/database.types";

export function useRoleRequirements(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.roleRequirements(projectId ?? ""),
    queryFn: async (): Promise<Tables<"project_role_requirements">[]> => {
      const { data, error } = await supabase
        .from("project_role_requirements")
        .select("*")
        .eq("project_id", projectId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}
