import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { Tables } from "@/lib/database.types";

export interface PocResourceWithProfile extends Tables<"poc_resources"> {
  profile: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null;
}

export interface PocDetail extends Tables<"pocs"> {
  resources: PocResourceWithProfile[];
}

// Single POC plus its engaged resources, profile names merged client-side
// (same reasoning as usePocs — no `Relationships` in database.types.ts to
// type an embedded `poc_resources(*, profiles(full_name))` select).
export function usePoc(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.poc(id ?? ""),
    queryFn: async (): Promise<PocDetail> => {
      const { data: poc, error } = await supabase.from("pocs").select("*").eq("id", id as string).single();
      if (error) throw error;

      const { data: resources, error: resourcesError } = await supabase
        .from("poc_resources")
        .select("*")
        .eq("poc_id", id as string)
        .order("created_at", { ascending: false });
      if (resourcesError) throw resourcesError;

      if (!resources.length) return { ...poc, resources: [] };

      const profileIds = [...new Set(resources.map((r) => r.profile_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", profileIds);
      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      return {
        ...poc,
        resources: resources.map((r) => ({ ...r, profile: profileMap.get(r.profile_id) ?? null })),
      };
    },
    enabled: !!id,
  });
}
