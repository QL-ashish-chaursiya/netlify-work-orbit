import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { AllocationStatus, Tables } from "@/lib/database.types";

// Statuses that represent a resource currently carrying work — same set used
// by useUtilizationData/ResourceProfileDrawer for "current" vs "past".
const CURRENT_STATUSES: AllocationStatus[] = ["active", "soft_reserved", "planned_for_release"];

export interface EmployeeAllocationRow {
  id: string;
  projectId: string;
  projectName: string;
  projectStatus: string;
  projectManagerName: string | null;
  techLeadName: string | null;
  allocationPercent: number;
  status: AllocationStatus;
  startDate: string;
  endDate: string | null;
}

export interface EmployeeDetail {
  profile: Tables<"profiles">;
  businessFunctionName: string | null;
  reportingManagerName: string | null;
  skills: { id: string; name: string; category: string | null; experienceYears: number | null }[];
  currentAllocations: EmployeeAllocationRow[];
  pastAllocations: EmployeeAllocationRow[];
}

// Everything the employee detail page needs in one shot — profile fields,
// business function / reporting manager names, skills, and every allocation
// this person has ever had, each enriched with the project's name/status and
// that project's PM and Tech Lead names (not just IDs). Batched the same way
// useBenchReportDetail does, since database.types.ts has no typed
// Relationships to lean on embeds.
async function fetchEmployeeDetail(profileId: string): Promise<EmployeeDetail> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();
  if (profileError) throw profileError;

  const [
    { data: businessFunction },
    { data: reportingManager },
    { data: profileSkills, error: skillsError },
    { data: allocations, error: allocationsError },
  ] = await Promise.all([
    profile.business_function_id
      ? supabase.from("business_functions").select("name").eq("id", profile.business_function_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.reporting_manager_id
      ? supabase.from("profiles").select("full_name").eq("id", profile.reporting_manager_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profile_skills").select("id, skill_id, experience_years").eq("profile_id", profileId),
    supabase
      .from("allocations")
      .select("id, project_id, allocation_percent, status, start_date, expected_completion_date")
      .eq("profile_id", profileId)
      .order("start_date", { ascending: false }),
  ]);
  if (skillsError) throw skillsError;
  if (allocationsError) throw allocationsError;

  const skillIds = [...new Set((profileSkills ?? []).map((ps) => ps.skill_id))];
  const { data: skillRows, error: skillLookupError } =
    skillIds.length > 0 ? await supabase.from("skills").select("id, name, category").in("id", skillIds) : { data: [], error: null };
  if (skillLookupError) throw skillLookupError;
  const skillById = new Map((skillRows ?? []).map((s) => [s.id, s]));

  const projectIds = [...new Set((allocations ?? []).map((a) => a.project_id))];
  const { data: projects, error: projectsError } =
    projectIds.length > 0
      ? await supabase.from("projects").select("id, name, status, project_manager_id, resource_manager_id").in("id", projectIds)
      : { data: [], error: null };
  if (projectsError) throw projectsError;

  const managerIds = [
    ...new Set((projects ?? []).flatMap((p) => [p.project_manager_id, p.resource_manager_id]).filter((id): id is string => !!id)),
  ];
  const { data: managers, error: managersError } =
    managerIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", managerIds) : { data: [], error: null };
  if (managersError) throw managersError;
  const managerNameById = new Map((managers ?? []).map((m) => [m.id, m.full_name]));
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  const allAllocations: EmployeeAllocationRow[] = (allocations ?? []).map((a) => {
    const project = projectById.get(a.project_id);
    return {
      id: a.id,
      projectId: a.project_id,
      projectName: project?.name ?? "Unknown project",
      projectStatus: project?.status ?? "unknown",
      projectManagerName: project?.project_manager_id ? managerNameById.get(project.project_manager_id) ?? null : null,
      techLeadName: project?.resource_manager_id ? managerNameById.get(project.resource_manager_id) ?? null : null,
      allocationPercent: Number(a.allocation_percent),
      status: a.status,
      startDate: a.start_date,
      endDate: a.expected_completion_date,
    };
  });

  return {
    profile,
    businessFunctionName: businessFunction?.name ?? null,
    reportingManagerName: reportingManager?.full_name ?? null,
    skills: (profileSkills ?? []).map((ps) => ({
      id: ps.id,
      name: skillById.get(ps.skill_id)?.name ?? "Unknown skill",
      category: skillById.get(ps.skill_id)?.category ?? null,
      experienceYears: ps.experience_years,
    })),
    currentAllocations: allAllocations.filter((a) => CURRENT_STATUSES.includes(a.status)),
    pastAllocations: allAllocations.filter((a) => !CURRENT_STATUSES.includes(a.status)),
  };
}

export function useEmployeeDetail(profileId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.employee(profileId ?? ""),
    queryFn: () => fetchEmployeeDetail(profileId as string),
    enabled: !!profileId,
  });
}
