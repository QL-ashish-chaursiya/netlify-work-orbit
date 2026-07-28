import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export interface ProjectOwnerWithProfile extends Tables<"project_owners"> {
  profile: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null;
}

// Local key (project_owners has no entry in the shared query-keys factory —
// it's not one of the keys this feature was told to reuse).
export const projectOwnersKey = (projectId: string) => ["project-owners", projectId] as const;

// Two plain queries merged client-side rather than a Supabase embedded
// select (`project_owners(*, profiles(...))`) — the hand-authored
// database.types.ts declares no `Relationships`, so embedded-resource
// selects can't be typed reliably against it.
export function useProjectOwners(projectId: string | undefined) {
  return useQuery({
    queryKey: projectOwnersKey(projectId ?? ""),
    queryFn: async (): Promise<ProjectOwnerWithProfile[]> => {
      const { data: owners, error } = await supabase
        .from("project_owners")
        .select("*")
        .eq("project_id", projectId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!owners.length) return [];

      const profileIds = [...new Set(owners.map((o) => o.profile_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", profileIds);
      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      return owners.map((o) => ({ ...o, profile: profileMap.get(o.profile_id) ?? null }));
    },
    enabled: !!projectId,
  });
}
