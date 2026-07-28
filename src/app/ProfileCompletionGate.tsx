import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

// BRD Phase 2: "Profile completion screen (skills, designation) shown once on
// first login for non-admins." Admins skip it — they complete org setup instead.
export function ProfileCompletionGate() {
  const { profile, isLoading } = useAuthRole();
  const location = useLocation();

  if (isLoading || !profile) return null;

  const needsCompletion = profile.primary_role !== "admin" && !profile.profile_completed_at;

  if (needsCompletion && location.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" replace />;
  }

  return <Outlet />;
}
