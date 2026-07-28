import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import type { AllocationWithNames } from "@/features/release-planning/types";

// Shared by useAllocationsPlannedForRelease and useActiveAllocationsForCalendar:
// batches profile/project name lookups for a set of allocations and merges
// them in client-side, rather than a Supabase embedded select
// (`profiles(full_name)`). Two reasons that would break here: `allocations`
// has two FKs to `profiles` (profile_id, created_by), which makes a
// table-name embed ambiguous at the PostgREST layer; and the hand-authored
// database.types.ts declares no `Relationships`, so it can't be typed
// reliably either way. Mirrors the pattern already used in
// src/features/projects/hooks/useProjectOwners.ts.
export async function attachAllocationNames(allocations: Tables<"allocations">[]): Promise<AllocationWithNames[]> {
  if (allocations.length === 0) return [];

  const profileIds = [...new Set(allocations.map((a) => a.profile_id))];
  const projectIds = [...new Set(allocations.map((a) => a.project_id))];

  const [{ data: profiles, error: profilesError }, { data: projects, error: projectsError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", profileIds),
    supabase.from("projects").select("id, name").in("id", projectIds),
  ]);
  if (profilesError) throw profilesError;
  if (projectsError) throw projectsError;

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return allocations.map((allocation) => ({
    ...allocation,
    profile: profileMap.get(allocation.profile_id) ?? null,
    project: projectMap.get(allocation.project_id) ?? null,
  }));
}
