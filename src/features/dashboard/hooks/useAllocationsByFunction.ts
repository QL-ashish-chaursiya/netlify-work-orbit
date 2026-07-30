import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

export interface FunctionAllocationCount {
  businessFunctionId: string;
  name: string;
  count: number;
}

// Active allocations grouped by the business function of the project they're
// on. Joined client-side (allocations -> projects -> business_functions),
// same reasoning as attachAllocationNames: no reliable embedded-select
// typing against the hand-authored database.types.ts.
async function fetchAllocationsByFunction(): Promise<FunctionAllocationCount[]> {
  const { data: allocations, error: allocError } = await supabase
    .from("allocations")
    .select("project_id")
    .eq("status", "active");
  if (allocError) throw allocError;

  const projectIds = [...new Set((allocations ?? []).map((a) => a.project_id))];
  if (projectIds.length === 0) return [];

  const { data: projects, error: projError } = await supabase
    .from("projects")
    .select("id, business_function_id")
    .in("id", projectIds);
  if (projError) throw projError;

  const functionIds = [...new Set((projects ?? []).map((p) => p.business_function_id).filter((id): id is string => !!id))];
  const { data: functions, error: fnError } =
    functionIds.length > 0
      ? await supabase.from("business_functions").select("id, name").in("id", functionIds)
      : { data: [], error: null };
  if (fnError) throw fnError;

  const functionByProject = new Map((projects ?? []).map((p) => [p.id, p.business_function_id]));
  const nameById = new Map((functions ?? []).map((f) => [f.id, f.name]));

  const counts = new Map<string, number>();
  for (const allocation of allocations ?? []) {
    const fnId = functionByProject.get(allocation.project_id);
    if (!fnId) continue;
    counts.set(fnId, (counts.get(fnId) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([businessFunctionId, count]) => ({ businessFunctionId, name: nameById.get(businessFunctionId) ?? "Unassigned", count }))
    .sort((a, b) => b.count - a.count);
}

export function useAllocationsByFunction() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["dashboard", "allocations-by-function", orgId],
    queryFn: fetchAllocationsByFunction,
    enabled: !!orgId,
  });
}
