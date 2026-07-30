import { Skeleton } from "@/components/ui/skeleton";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { humanizeEnum } from "@/lib/status-badges";
import { AdminDashboard } from "@/features/dashboard/components/AdminDashboard";
import { ProjectManagerDashboard } from "@/features/dashboard/components/ProjectManagerDashboard";
import { SalesLeadDashboard } from "@/features/dashboard/components/SalesLeadDashboard";
import { TechLeadDashboard } from "@/features/dashboard/components/TechLeadDashboard";
import { TeamMemberDashboard } from "@/features/dashboard/components/TeamMemberDashboard";

// Role-based dashboard landing (BRD Phase 1). Admin and Resource Manager
// share the org-wide oversight view (identical concerns: utilization,
// bench, approvals, releases); every other role gets a dashboard scoped to
// what's actually theirs to act on.
export function DashboardPage() {
  const { profile, primaryRole, isLoading } = useAuthRole();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        {primaryRole && <p className="text-muted-foreground">Signed in as {humanizeEnum(primaryRole)}</p>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : primaryRole === "admin" || primaryRole === "resource_manager" ? (
        <AdminDashboard />
      ) : primaryRole === "project_manager" ? (
        <ProjectManagerDashboard />
      ) : primaryRole === "sales_lead" ? (
        <SalesLeadDashboard />
      ) : primaryRole === "tech_lead" ? (
        <TechLeadDashboard />
      ) : (
        <TeamMemberDashboard />
      )}
    </div>
  );
}
