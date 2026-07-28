import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

// A profile's additional roles beyond primary_role (schema SECTION 3: user_roles
// "supports a user holding more than one role"). Drives the RoleSwitcher.
export function useUserRoles() {
  const { profile } = useAuthRole();

  return useQuery({
    queryKey: ["user-roles", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*").eq("profile_id", profile!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });
}
