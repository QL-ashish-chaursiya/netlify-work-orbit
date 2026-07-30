import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { UpcomingReleasesCard } from "@/features/dashboard/components/UpcomingReleasesCard";
import { RecentActivityCard } from "@/features/dashboard/components/RecentActivityCard";
import { useMyProjects, countByStatus } from "@/features/dashboard/hooks/useMyProjects";
import { usePmStats } from "@/features/dashboard/hooks/usePmStats";
import { useUpcomingReleases } from "@/features/dashboard/hooks/useUpcomingReleases";
import { PROJECT_STATUS_TONE } from "@/lib/status-badges";

export function ProjectManagerDashboard() {
  const { data: projects } = useMyProjects();
  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: stats } = usePmStats(projectIds);
  const { data: upcomingReleases } = useUpcomingReleases(14, projectIds);

  const statusCounts = countByStatus(projects ?? []);
  const nonTerminalCount = statusCounts.draft + statusCounts.staffing + statusCounts.in_progress + statusCounts.releasing;
  const inProgressSharePercent = nonTerminalCount > 0 ? Math.round((statusCounts.in_progress / nonTerminalCount) * 100) : 0;

  const activeTeamSize = stats?.activeTeamSize ?? 0;
  const openReqs = stats?.openRoleRequirementCount ?? 0;
  const staffedSharePercent = activeTeamSize + openReqs > 0 ? Math.round((activeTeamSize / (activeTeamSize + openReqs)) * 100) : 0;
  const releaseSharePercent = activeTeamSize > 0 ? Math.round(((upcomingReleases?.length ?? 0) / activeTeamSize) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="My Projects" value={String(nonTerminalCount)} percent={inProgressSharePercent} colorClass="stroke-brand-blue" />
        <StatCard label="Team Size" value={String(activeTeamSize)} percent={staffedSharePercent} colorClass="stroke-cyan-600" />
        <StatCard
          label="Pending Requests"
          value={String(stats?.pendingRequestCount ?? 0)}
          percent={stats?.pendingRequestSharePercent ?? 0}
          colorClass="stroke-red-500"
        />
        <StatCard label="Upcoming Releases" value={String(upcomingReleases?.length ?? 0)} percent={releaseSharePercent} colorClass="stroke-amber-500" />
        <StatCard
          label="Open Requirements"
          value={String(openReqs)}
          percent={stats?.openRoleRequirementSharePercent ?? 0}
          colorClass="stroke-purple-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">My projects by stage</CardTitle>
            <CardDescription>Where each of your projects currently sits</CardDescription>
          </CardHeader>
          <CardContent>
            {!projects || projects.length === 0 ? (
              <EmptyState message="You don't own any projects yet." className="py-8" />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(Object.entries(statusCounts) as [string, number][])
                  .filter(([, count]) => count > 0)
                  .map(([status, count]) => (
                    <div key={status} className="rounded-lg border p-3">
                      <p className="text-2xl font-semibold tabular-nums">{count}</p>
                      <div className="mt-1">
                        <StatusBadge value={status} toneMap={PROJECT_STATUS_TONE} />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
        <RecentActivityCard projectIds={projectIds} includePocs={false} />
      </div>

      <UpcomingReleasesCard projectIds={projectIds} />
    </div>
  );
}
