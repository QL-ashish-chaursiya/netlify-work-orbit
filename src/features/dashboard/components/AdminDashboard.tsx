import { StatCard } from "@/features/dashboard/components/StatCard";
import { UtilizationTrendCard } from "@/features/dashboard/components/UtilizationTrendCard";
import { UpcomingReleasesCard } from "@/features/dashboard/components/UpcomingReleasesCard";
import { RecentActivityCard } from "@/features/dashboard/components/RecentActivityCard";
import { useUtilizationData } from "@/features/reporting/hooks/useUtilizationData";
import { useMonthlyUtilizationTrend } from "@/features/reporting/hooks/useMonthlyUtilizationTrend";
import { useBenchReport } from "@/features/reporting/hooks/useBenchReport";
import { useAllocationStats } from "@/features/dashboard/hooks/useAllocationStats";
import { usePocMonthlyStats } from "@/features/pocs/hooks/usePocMonthlyStats";

// Org-wide oversight dashboard — Admin only. This org has no Resource
// Manager role; Tech Lead gets its own, differently-scoped dashboard (see
// TechLeadDashboard) even though it now shares Admin's approvals/conflict
// powers elsewhere in the app.
export function AdminDashboard() {
  const { data: utilizationRows } = useUtilizationData();
  const { data: trend } = useMonthlyUtilizationTrend();
  const { data: benchRows } = useBenchReport();
  const { data: allocationStats } = useAllocationStats();
  const { totals: pocTotals } = usePocMonthlyStats();

  const headcount = utilizationRows?.length ?? 0;
  const orgUtilizationPercent = trend && trend.length > 0 ? trend[trend.length - 1]?.averageUtilizationPercent ?? 0 : 0;
  const benchCount = benchRows?.length ?? 0;
  const benchPercent = headcount > 0 ? Math.round((benchCount / headcount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Org Utilization" value={`${orgUtilizationPercent}%`} percent={orgUtilizationPercent} colorClass="stroke-brand-blue" />
        <StatCard label="Bench Strength" value={String(benchCount)} percent={benchPercent} colorClass="stroke-amber-500" />
        <StatCard
          label="Active Allocations"
          value={(allocationStats?.activeCount ?? 0).toLocaleString()}
          percent={allocationStats?.activeSharePercent ?? 0}
          colorClass="stroke-cyan-600"
        />
        <StatCard
          label="Pending Requests"
          value={String(allocationStats?.pendingRequestCount ?? 0)}
          percent={allocationStats?.pendingRequestSharePercent ?? 0}
          colorClass="stroke-red-500"
        />
        <StatCard label="POC Conversion" value={`${pocTotals.conversionRate}%`} percent={pocTotals.conversionRate} colorClass="stroke-purple-500" />
      </div>

      <UtilizationTrendCard />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UpcomingReleasesCard />
        </div>
        <RecentActivityCard />
      </div>
    </div>
  );
}
