import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks/useAuthMutations";

export function ProtectedRoute() {
  const { session, isLoading, profileMissing } = useAuthRole();
  const location = useLocation();
  const logout = useLogout();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // A valid auth session with no matching `profiles` row — e.g. the account
  // was created directly in the Supabase dashboard instead of via Signup /
  // Add Employee / Bulk Import, or the signup RPC didn't complete. Surface
  // this clearly instead of a blank screen.
  if (profileMissing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-xl font-semibold">No profile found for this account</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Your login is valid, but there's no matching employee profile in this organization. This usually means
          the account was created directly in Supabase rather than through Signup, Add Employee, or Bulk Import.
          Sign out and use one of those flows, or ask an Admin to add you.
        </p>
        <Button onClick={() => logout.mutate()}>Sign out</Button>
      </div>
    );
  }

  return <Outlet />;
}
