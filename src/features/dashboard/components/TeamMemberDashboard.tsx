import { differenceInCalendarDays, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ALLOCATION_STATUS_TONE } from "@/lib/status-badges";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { useMyAllocationsWithNames } from "@/features/dashboard/hooks/useMyAllocationsWithNames";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { useProfileSkills } from "@/features/allocations/hooks/useLookups";

export function TeamMemberDashboard() {
  const { profile } = useAuthRole();
  const { data: allocations } = useMyAllocationsWithNames();
  const { data: skills } = useProfileSkills(profile?.id);

  const rows = allocations ?? [];
  const active = rows.filter((a) => a.status === "active");
  const released = rows.filter((a) => a.status === "released");
  const utilizationPercent = active.reduce((sum, a) => sum + Number(a.allocation_percent), 0);
  const activeProjectsPercent = active.length + released.length > 0 ? Math.round((active.length / (active.length + released.length)) * 100) : active.length > 0 ? 100 : 0;

  const nextRelease = rows
    .filter((a) => a.status === "planned_for_release" && a.planned_release_date)
    .sort((a, b) => (a.planned_release_date! < b.planned_release_date! ? -1 : 1))[0];
  const daysToRelease = nextRelease?.planned_release_date
    ? differenceInCalendarDays(new Date(nextRelease.planned_release_date), new Date())
    : null;
  const releaseUrgencyPercent = daysToRelease != null ? Math.round(Math.max(0, 100 - (Math.min(daysToRelease, 30) / 30) * 100)) : 0;

  const currentAllocations = rows.filter((a) => a.status === "active" || a.status === "planned_for_release");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="My Utilization" value={`${utilizationPercent}%`} percent={utilizationPercent} colorClass="stroke-brand-blue" />
        <StatCard label="Active Projects" value={String(active.length)} percent={activeProjectsPercent} colorClass="stroke-cyan-600" />
        <StatCard
          label="Next Release"
          value={daysToRelease != null ? `${daysToRelease}d` : "None"}
          percent={releaseUrgencyPercent}
          colorClass="stroke-amber-500"
        />
        <StatCard label="Skills Recorded" value={String(skills?.length ?? 0)} percent={100} colorClass="stroke-purple-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My allocations</CardTitle>
          <CardDescription>Current and upcoming assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {currentAllocations.length === 0 ? (
            <EmptyState message="No current allocations." description="You'll show up here once you're assigned to a project." className="py-8" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAllocations.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.project?.name ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{a.allocation_percent}%</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{format(new Date(a.start_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <StatusBadge value={a.status} toneMap={ALLOCATION_STATUS_TONE} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
