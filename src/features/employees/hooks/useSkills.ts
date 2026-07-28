import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole, useCurrentProfile } from "@/features/auth/hooks/useAuthSession";

// Org-scoped skills taxonomy lookup, needed by the first-login Profile
// Completion form's skill picker. Kept local to this feature (not touching
// other features' folders) even though skills is a shared table.
export function useSkills() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: queryKeys.skills(orgId),
    queryFn: async () => {
      const { data, error } = await supabase.from("skills").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export interface ProfileSkillEntry {
  skill_id: string;
  experience_years?: number | null;
  last_used_on?: string | null;
}

// BRD §5 Phase 2: first-login profile completion for non-admins — sets
// designation + skills, then stamps profile_completed_at so the app shell
// stops redirecting here. Two writes, both allowed by RLS's self-update
// policies (profiles_update_self_or_admin, profile_skills_write_self).
export function useCompleteProfile() {
  const queryClient = useQueryClient();
  const { data: currentProfile } = useCurrentProfile();

  return useMutation({
    mutationFn: async (input: { designation?: string; skills: ProfileSkillEntry[] }) => {
      if (!currentProfile) throw new Error("Not authenticated");

      if (input.skills.length > 0) {
        const rows = input.skills.map((s) => ({
          profile_id: currentProfile.id,
          skill_id: s.skill_id,
          experience_years: s.experience_years ?? null,
          last_used_on: s.last_used_on ?? null,
        }));
        const { error: skillsError } = await supabase
          .from("profile_skills")
          .upsert(rows, { onConflict: "profile_id,skill_id" });
        if (skillsError) throw skillsError;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          designation: input.designation ?? null,
          profile_completed_at: new Date().toISOString(),
        })
        .eq("id", currentProfile.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(currentProfile?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(currentProfile?.organization_id) });
    },
  });
}
