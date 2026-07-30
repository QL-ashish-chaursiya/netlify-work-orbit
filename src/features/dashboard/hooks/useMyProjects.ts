import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { ProjectStatus, Tables } from "@/lib/database.types";

// Projects the current user owns (project_owners), for the PM dashboard's
// scoped stats/activity/releases. Two-step lookup (owner rows, then
// projects by id) for the same reason as attachAllocationNames — no
// reliable embedded-select typing here.
async function fetchMyProjects(profileId: string): Promise<Tables<"projects">[]> {
  const { data: ownerRows, error: ownerError } = await supabase
    .from("project_owners")
    .select("project_id")
    .eq("profile_id", profileId);
  if (ownerError) throw ownerError;

  const projectIds = (ownerRows ?? []).map((r) => r.project_id);
  if (projectIds.length === 0) return [];

  const { data: projects, error: projError } = await supabase
    .from("projects")
    .select("*")
    .in("id", projectIds)
    .order("created_at", { ascending: false });
  if (projError) throw projError;
  return projects ?? [];
}

export function useMyProjects() {
  const { profile } = useAuthRole();

  return useQuery({
    queryKey: ["dashboard", "my-projects", profile?.id],
    queryFn: () => fetchMyProjects(profile!.id),
    enabled: !!profile?.id,
  });
}

export function countByStatus(projects: Tables<"projects">[]): Record<ProjectStatus, number> {
  const counts: Record<ProjectStatus, number> = {
    draft: 0, staffing: 0, in_progress: 0, releasing: 0, closed: 0, cancelled: 0,
  };
  for (const p of projects) counts[p.status] += 1;
  return counts;
}
