import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { Tables, UserRole } from "@/lib/database.types";

// Session lives in TanStack Query. The onAuthStateChange listener is set up
// exactly ONCE for the app's lifetime (guarded by moduleSubscribed below),
// not once per component — useAuthRole()/useCurrentProfile() are called from
// ~45 files, and each used to mount its own subscription, so a single auth
// event (including periodic TOKEN_REFRESHED) fanned out into dozens of
// redundant profile-query invalidations. That was the actual cause of the
// "infinite" repeated /profiles requests.
let moduleSubscribed = false;
let lastSeenUserId: string | undefined;

function ensureAuthListener(queryClient: ReturnType<typeof useQueryClient>) {
  if (moduleSubscribed) return;
  moduleSubscribed = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    queryClient.setQueryData(queryKeys.session, session);

    const userId = session?.user.id;
    // Only refetch the profile when the signed-in user actually changes
    // (sign-in/sign-out/switch) — NOT on every TOKEN_REFRESHED tick, which
    // fires periodically for the same user and previously re-triggered a
    // profile fetch (and, if that profile row didn't exist, an immediate
    // re-error) each time.
    if (userId !== lastSeenUserId) {
      lastSeenUserId = userId;
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    }
  });
}

export function useAuthSession() {
  const queryClient = useQueryClient();

  useEffect(() => {
    ensureAuthListener(queryClient);
  }, [queryClient]);

  return useQuery({
    queryKey: queryKeys.session,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      lastSeenUserId = data.session?.user.id;
      return data.session;
    },
    staleTime: Infinity,
  });
}

export function useCurrentProfile() {
  const { data: session } = useAuthSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: async () => {
      // maybeSingle(), not single(): a signed-in auth user with no matching
      // profiles row (e.g. created directly in the Supabase dashboard, or a
      // signup whose create_organization_and_admin RPC didn't complete) is a
      // real, expected state to handle — not a thrown error that retries.
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId as string).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    retry: false,
  });
}

interface AuthRoleResult {
  session: Session | null | undefined;
  profile: Tables<"profiles"> | null | undefined;
  primaryRole: UserRole | undefined;
  isLoading: boolean;
  profileMissing: boolean;
  hasRole: (role: UserRole) => boolean;
}

export function useAuthRole(): AuthRoleResult {
  const { data: session, isLoading: sessionLoading } = useAuthSession();
  const { data: profile, isLoading: profileLoading, isFetched: profileFetched } = useCurrentProfile();

  return {
    session,
    profile,
    primaryRole: profile?.primary_role,
    isLoading: sessionLoading || profileLoading,
    // true only once we've actually confirmed (fetch completed) there's no row
    profileMissing: !!session && profileFetched && profile === null,
    hasRole: (role) => profile?.primary_role === role,
  };
}
