import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { Tables } from "@/lib/database.types";

export type OrgProfileOption = Pick<Tables<"profiles">, "id" | "full_name" | "email">;

// Backs the "add owner" profile-search picker on ProjectOwnersList.
// RLS (`profiles_select`) already scopes this to the caller's organization.
export function useOrgProfiles(search: string) {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["org-profiles", orgId, search] as const,
    queryFn: async (): Promise<OrgProfileOption[]> => {
      let query = supabase.from("profiles").select("id, full_name, email").order("full_name");
      if (search.trim()) {
        query = query.ilike("full_name", `%${search.trim()}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}
