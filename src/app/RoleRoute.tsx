import { Navigate, Outlet } from "react-router-dom";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { UserRole } from "@/lib/database.types";

interface RoleRouteProps {
  allow: UserRole[];
}

// Defense-in-depth only — RLS is the real enforcement layer (BRD §6). This
// just avoids rendering a screen a role has no actions for.
export function RoleRoute({ allow }: RoleRouteProps) {
  const { primaryRole, isLoading } = useAuthRole();

  if (isLoading) return null;
  if (!primaryRole || !allow.includes(primaryRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
