import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { useBenchReport } from "@/features/reporting/hooks/useBenchReport";
import type { BenchDetailRow, BenchRow } from "@/features/reporting/types";

// Enriches the existing bench rows (profileId/utilization/threshold — shared
// with the sidebar badge and dashboards, left untouched) with the extra
// context a resource manager needs to act: designation, top skills, and
// "how long has this person been trending down" derived from their most
// recent allocation with a completion/release date in the past. All of this
// comes from real rows — batched the same way attachAllocationNames.ts does,
// since database.types.ts has no typed Relationships to lean on embeds.
async function fetchBenchDetail(bench: BenchRow[]): Promise<BenchDetailRow[]> {
  if (bench.length === 0) return [];
  const profileIds = bench.map((r) => r.profileId);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: profiles, error: profilesError },
    { data: profileSkills, error: skillsError },
    { data: allocations, error: allocationsError },
  ] = await Promise.all([
    supabase.from("profiles").select("id, designation").in("id", profileIds),
    supabase
      .from("profile_skills")
      .select("profile_id, skill_id, experience_years")
      .in("profile_id", profileIds),
    supabase
      .from("allocations")
      .select("profile_id, project_id, status, expected_completion_date, planned_release_date, created_at")
      .in("profile_id", profileIds),
  ]);
  if (profilesError) throw profilesError;
  if (skillsError) throw skillsError;
  if (allocationsError) throw allocationsError;

  const skillIds = [...new Set((profileSkills ?? []).map((ps) => ps.skill_id))];
  const { data: skills, error: skillsLookupError } =
    skillIds.length > 0
      ? await supabase.from("skills").select("id, name").in("id", skillIds)
      : { data: [], error: null };
  if (skillsLookupError) throw skillsLookupError;
  const skillNameById = new Map((skills ?? []).map((s) => [s.id, s.name]));

  const projectIds = [...new Set((allocations ?? []).map((a) => a.project_id))];
  const { data: projects, error: projectsError } =
    projectIds.length > 0
      ? await supabase.from("projects").select("id, name").in("id", projectIds)
      : { data: [], error: null };
  if (projectsError) throw projectsError;
  const projectNameById = new Map((projects ?? []).map((p) => [p.id, p.name]));

  const designationByProfile = new Map((profiles ?? []).map((p) => [p.id, p.designation]));

  const skillsByProfile = new Map<string, { skill_id: string; experience_years: number | null }[]>();
  for (const ps of profileSkills ?? []) {
    const list = skillsByProfile.get(ps.profile_id) ?? [];
    list.push({ skill_id: ps.skill_id, experience_years: ps.experience_years });
    skillsByProfile.set(ps.profile_id, list);
  }

  // Per profile: the most recent allocation whose completion/release date has
  // already passed becomes "idle since" + "last project". If none exists
  // (never allocated, or currently open-ended), fall back to the most
  // recently created allocation for "last project" only.
  const idleCandidateByProfile = new Map<string, { date: string; project_id: string }>();
  const latestAnyByProfile = new Map<string, { project_id: string; created_at: string }>();
  for (const a of allocations ?? []) {
    const pastDate = a.expected_completion_date ?? a.planned_release_date;
    if (pastDate && pastDate <= today) {
      const existing = idleCandidateByProfile.get(a.profile_id);
      if (!existing || pastDate > existing.date) {
        idleCandidateByProfile.set(a.profile_id, { date: pastDate, project_id: a.project_id });
      }
    }
    const latest = latestAnyByProfile.get(a.profile_id);
    if (!latest || a.created_at > latest.created_at) {
      latestAnyByProfile.set(a.profile_id, { project_id: a.project_id, created_at: a.created_at });
    }
  }

  return bench.map((row) => {
    const skillRows = (skillsByProfile.get(row.profileId) ?? [])
      .sort((a, b) => (b.experience_years ?? 0) - (a.experience_years ?? 0))
      .slice(0, 2)
      .map((s) => ({ id: s.skill_id, name: skillNameById.get(s.skill_id) ?? "Unknown skill" }));

    const idleCandidate = idleCandidateByProfile.get(row.profileId);
    const fallback = latestAnyByProfile.get(row.profileId);

    return {
      ...row,
      designation: designationByProfile.get(row.profileId) ?? null,
      skills: skillRows,
      lastProjectName: idleCandidate
        ? (projectNameById.get(idleCandidate.project_id) ?? null)
        : fallback
          ? (projectNameById.get(fallback.project_id) ?? null)
          : null,
      idleSinceDate: idleCandidate?.date ?? null,
      durationDays: idleCandidate ? differenceInCalendarDays(new Date(), parseISO(idleCandidate.date)) : null,
    };
  });
}

export function useBenchReportDetail(filters: { businessFunctionId?: string | null } = {}) {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;
  const businessFunctionId = filters.businessFunctionId ?? null;
  const { data: bench, isLoading: benchLoading } = useBenchReport({ businessFunctionId });

  return useQuery({
    queryKey: [...queryKeys.benchReport(orgId), businessFunctionId, "detail"],
    queryFn: () => fetchBenchDetail(bench ?? []),
    enabled: !!orgId && !benchLoading && !!bench,
  });
}
