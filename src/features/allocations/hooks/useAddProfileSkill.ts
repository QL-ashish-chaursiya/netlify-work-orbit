import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface AddProfileSkillInput {
  profileId: string;
  skillId: string;
  experienceYears?: number | null;
}

// profile_skills_write_self RLS only allows profile_id = auth.uid(), so this
// only ever works for the caller adding to their OWN profile — the only
// place that's meant to be reachable is ResourceProfileDrawer's own-profile
// view. This is the fix for skills never showing up in Expertise Search:
// previously the only way to add a skill at all was the one-time first-login
// Profile Completion form, with no way back in afterward.
export function useAddProfileSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, skillId, experienceYears }: AddProfileSkillInput) => {
      const { error } = await supabase.from("profile_skills").upsert(
        [{ profile_id: profileId, skill_id: skillId, experience_years: experienceYears ?? null }],
        { onConflict: "profile_id,skill_id" },
      );
      if (error) throw error;
    },
    onSuccess: (_data, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: ["allocations", "profile-skills", profileId] });
      queryClient.invalidateQueries({ queryKey: ["expertise-search"] });
    },
  });
}
