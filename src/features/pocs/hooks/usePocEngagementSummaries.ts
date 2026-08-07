import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface PocEngagementSummary {
  resources: { profileId: string; fullName: string }[];
  skillNames: string[];
}

// Backs the POC log listing's "Resources Engaged" and "Skills / Tech"
// columns: batches poc_resources -> profiles -> profile_skills -> skills for
// every visible POC in one round trip each, rather than N+1 queries per row.
// "Skills / Tech" has no dedicated field on pocs — it's the real skill set
// of whoever is actually engaged, same data source ExpertiseSearch/Bench
// Report already use, not a fabricated tag list.
export function usePocEngagementSummaries(pocIds: string[]) {
  const sortedIds = [...pocIds].sort();
  const idsKey = sortedIds.join(",");

  return useQuery({
    queryKey: ["pocs", "engagement-summaries", idsKey] as const,
    queryFn: async (): Promise<Map<string, PocEngagementSummary>> => {
      if (sortedIds.length === 0) return new Map();

      const { data: pocResources, error: prError } = await supabase
        .from("poc_resources")
        .select("poc_id, profile_id, created_at")
        .in("poc_id", sortedIds)
        .order("created_at", { ascending: false });
      if (prError) throw prError;
      if (!pocResources || pocResources.length === 0) return new Map();

      const profileIds = [...new Set(pocResources.map((r) => r.profile_id))];

      const [{ data: profiles, error: profilesError }, { data: profileSkills, error: psError }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", profileIds),
        supabase.from("profile_skills").select("profile_id, skill_id").in("profile_id", profileIds),
      ]);
      if (profilesError) throw profilesError;
      if (psError) throw psError;

      const skillIds = [...new Set((profileSkills ?? []).map((ps) => ps.skill_id))];
      const { data: skills, error: skillsError } =
        skillIds.length > 0 ? await supabase.from("skills").select("id, name").in("id", skillIds) : { data: [], error: null };
      if (skillsError) throw skillsError;
      const skillNameById = new Map((skills ?? []).map((s) => [s.id, s.name]));

      const skillIdsByProfile = new Map<string, string[]>();
      for (const ps of profileSkills ?? []) {
        const list = skillIdsByProfile.get(ps.profile_id) ?? [];
        list.push(ps.skill_id);
        skillIdsByProfile.set(ps.profile_id, list);
      }

      const profileNameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      const result = new Map<string, PocEngagementSummary>();
      for (const r of pocResources) {
        const entry = result.get(r.poc_id) ?? { resources: [], skillNames: [] };
        entry.resources.push({ profileId: r.profile_id, fullName: profileNameById.get(r.profile_id) ?? "Unknown" });
        for (const skillId of skillIdsByProfile.get(r.profile_id) ?? []) {
          const name = skillNameById.get(skillId);
          if (name && !entry.skillNames.includes(name) && entry.skillNames.length < 2) {
            entry.skillNames.push(name);
          }
        }
        result.set(r.poc_id, entry);
      }
      return result;
    },
    enabled: sortedIds.length > 0,
  });
}
