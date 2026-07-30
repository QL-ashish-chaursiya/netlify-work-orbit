import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface PmStats {
  activeTeamSize: number;
  pendingRequestCount: number;
  pendingRequestSharePercent: number;
  openRoleRequirementCount: number;
  openRoleRequirementSharePercent: number;
}

// PM dashboard: three counts scoped to their own projects that don't map
// onto any existing org-wide hook.
async function fetchPmStats(projectIds: string[]): Promise<PmStats> {
  if (projectIds.length === 0) {
    return {
      activeTeamSize: 0,
      pendingRequestCount: 0,
      pendingRequestSharePercent: 0,
      openRoleRequirementCount: 0,
      openRoleRequirementSharePercent: 0,
    };
  }

  const [{ data: allocations, error: allocError }, { data: requests, error: reqError }, { data: requirements, error: reqmtError }] =
    await Promise.all([
      supabase.from("allocations").select("status").in("project_id", projectIds),
      supabase.from("allocation_requests").select("status").in("project_id", projectIds),
      supabase.from("project_role_requirements").select("status").in("project_id", projectIds),
    ]);
  if (allocError) throw allocError;
  if (reqError) throw reqError;
  if (reqmtError) throw reqmtError;

  const activeTeamSize = (allocations ?? []).filter((a) => a.status === "active").length;
  const pendingRequestCount = (requests ?? []).filter((r) => r.status === "pending").length;
  const totalRequests = requests?.length ?? 0;
  const pendingRequestSharePercent = totalRequests > 0 ? Math.round((pendingRequestCount / totalRequests) * 100) : 0;
  const openRoleRequirementCount = (requirements ?? []).filter((r) => r.status === "open").length;
  const totalRoleRequirementCount = requirements?.length ?? 0;
  const openRoleRequirementSharePercent =
    totalRoleRequirementCount > 0 ? Math.round((openRoleRequirementCount / totalRoleRequirementCount) * 100) : 0;

  return {
    activeTeamSize,
    pendingRequestCount,
    pendingRequestSharePercent,
    openRoleRequirementCount,
    openRoleRequirementSharePercent,
  };
}

export function usePmStats(projectIds: string[]) {
  const scopeKey = [...projectIds].sort().join(",");

  return useQuery({
    queryKey: ["dashboard", "pm-stats", scopeKey],
    queryFn: () => fetchPmStats(projectIds),
    enabled: projectIds.length >= 0,
  });
}
