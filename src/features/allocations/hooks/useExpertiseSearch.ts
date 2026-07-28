import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { ExpertiseSearchFilters, ExpertiseSearchResult } from "@/features/allocations/types";

// Resource directory search: profiles x profile_skills x skills, with
// utilization computed client-side from each profile's active allocations.
// Embedded (foreign-table) selects are avoided throughout this feature since
// database.types.ts is hand-authored with empty `Relationships: []` per
// table, which breaks supabase-js's typed-join inference — joins are done in
// JS instead.
export function useExpertiseSearch(filters: ExpertiseSearchFilters) {
  return useQuery({
    queryKey: queryKeys.expertiseSearch(filters),
    queryFn: async (): Promise<ExpertiseSearchResult[]> => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, designation, primary_role, status")
        .eq("status", "active")
        .order("full_name");
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      const profileIds = profiles.map((p) => p.id);

      let skillsFilterQuery = supabase
        .from("profile_skills")
        .select("profile_id, skill_id, experience_years, last_used_on")
        .in("profile_id", profileIds);
      if (filters.skillId) {
        skillsFilterQuery = skillsFilterQuery.eq("skill_id", filters.skillId);
      }
      if (filters.minExperience != null) {
        skillsFilterQuery = skillsFilterQuery.gte("experience_years", filters.minExperience);
      }
      const { data: profileSkills, error: psError } = await skillsFilterQuery;
      if (psError) throw psError;

      const { data: skills, error: skillsError } = await supabase.from("skills").select("id, name, category");
      if (skillsError) throw skillsError;
      const skillMap = new Map((skills ?? []).map((s) => [s.id, s]));

      const { data: allocations, error: allocationsError } = await supabase
        .from("allocations")
        .select("profile_id, allocation_percent, status")
        .in("profile_id", profileIds)
        .eq("status", "active");
      if (allocationsError) throw allocationsError;

      const utilizationByProfile = new Map<string, number>();
      for (const allocation of allocations ?? []) {
        utilizationByProfile.set(
          allocation.profile_id,
          (utilizationByProfile.get(allocation.profile_id) ?? 0) + Number(allocation.allocation_percent),
        );
      }

      const skillsByProfile = new Map<string, ExpertiseSearchResult["skills"]>();
      for (const ps of profileSkills ?? []) {
        const skill = skillMap.get(ps.skill_id);
        const list = skillsByProfile.get(ps.profile_id) ?? [];
        list.push({
          id: `${ps.profile_id}:${ps.skill_id}`,
          skillId: ps.skill_id,
          name: skill?.name ?? "Unknown skill",
          category: skill?.category ?? null,
          experienceYears: ps.experience_years,
          lastUsedOn: ps.last_used_on,
        });
        skillsByProfile.set(ps.profile_id, list);
      }

      // When a skill filter is active, only profiles that actually matched
      // that profile_skills query should appear in results.
      const matchingProfileIds = filters.skillId ? new Set((profileSkills ?? []).map((ps) => ps.profile_id)) : null;

      return profiles
        .filter((p) => !matchingProfileIds || matchingProfileIds.has(p.id))
        .map((p) => {
          const utilizationPercent = utilizationByProfile.get(p.id) ?? 0;
          return {
            id: p.id,
            full_name: p.full_name,
            designation: p.designation,
            primary_role: p.primary_role,
            skills: skillsByProfile.get(p.id) ?? [],
            utilizationPercent,
            isOverAllocated: utilizationPercent > 100,
          };
        })
        .filter((p) => filters.maxUtilization == null || p.utilizationPercent <= filters.maxUtilization);
    },
  });
}
