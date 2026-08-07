// Small local lookups the Allocations module needs for dropdowns/name display
// (profiles, projects, skills, role requirements). Per the build brief we do
// NOT import from src/features/projects/** — these are intentionally
// duplicated, minimal-column queries scoped by this feature's own hooks.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

export function useProfileOptions() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["allocations", "profile-options", orgId],
    queryFn: async () => {
      // Admin is an administrative role, not a staffable resource — excluded
      // here at the source so every dropdown built off this hook (resource
      // picker in AllocationRequestForm, ReassignResourcePicker, etc.) never
      // offers Admin as something to allocate, system-wide, without each
      // caller having to remember to filter it out itself.
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, designation, primary_role, reporting_manager_id, status")
        .neq("primary_role", "admin")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useProjectOptions() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["allocations", "project-options", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name, code, status").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useSkillOptions() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["allocations", "skill-options", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("skills").select("id, name, category").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useRoleRequirementOptions(projectId: string | undefined) {
  return useQuery({
    queryKey: ["allocations", "role-requirement-options", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_role_requirements")
        .select("id, title, required_skills, status")
        .eq("project_id", projectId as string)
        .eq("status", "open")
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useProfileDetail(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ["allocations", "profile-detail", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, designation, primary_role, email")
        .eq("id", profileId as string)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useProfileSkills(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ["allocations", "profile-skills", profileId],
    queryFn: async () => {
      const { data: profileSkills, error: psError } = await supabase
        .from("profile_skills")
        .select("id, skill_id, experience_years, last_used_on")
        .eq("profile_id", profileId as string);
      if (psError) throw psError;

      const { data: skills, error: skillsError } = await supabase.from("skills").select("id, name, category");
      if (skillsError) throw skillsError;
      const skillMap = new Map((skills ?? []).map((s) => [s.id, s]));

      return (profileSkills ?? []).map((ps) => ({
        id: ps.id,
        skillId: ps.skill_id,
        name: skillMap.get(ps.skill_id)?.name ?? "Unknown skill",
        category: skillMap.get(ps.skill_id)?.category ?? null,
        experienceYears: ps.experience_years,
        lastUsedOn: ps.last_used_on,
      }));
    },
    enabled: !!profileId,
  });
}
