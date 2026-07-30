import { useState } from "react";
import { format } from "date-fns";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { RecentActivityCard } from "@/features/dashboard/components/RecentActivityCard";
import { POCDashboard } from "@/features/pocs/components/POCDashboard";
import { usePocMonthlyStats } from "@/features/pocs/hooks/usePocMonthlyStats";

const CURRENT_MONTH_KEY = format(new Date(), "yyyy-MM");

// Reuses the existing POCDashboard component wholesale for the chart section
// (stat tiles + donut/trend charts + drill-down) rather than re-extracting
// its chart logic — it's already the richest, most relevant view this role has.
export function SalesLeadDashboard() {
  const { totals } = usePocMonthlyStats();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(CURRENT_MONTH_KEY);

  const decidedShare = totals.total > 0 ? Math.round(((totals.closedWon + totals.closedLost) / totals.total) * 100) : 0;
  const wonShare = totals.total > 0 ? Math.round((totals.closedWon / totals.total) * 100) : 0;
  const lostShare = totals.total > 0 ? Math.round((totals.closedLost / totals.total) * 100) : 0;
  const openShare = totals.total > 0 ? Math.round((totals.pending / totals.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Open POCs" value={String(totals.pending)} percent={openShare} colorClass="stroke-amber-500" />
        <StatCard label="Closed Won" value={String(totals.closedWon)} percent={wonShare} colorClass="stroke-emerald-600" />
        <StatCard label="Closed Lost" value={String(totals.closedLost)} percent={lostShare} colorClass="stroke-red-500" />
        <StatCard label="Conversion Rate" value={`${totals.conversionRate}%`} percent={totals.conversionRate} colorClass="stroke-purple-500" />
        <StatCard label="Decided" value={`${decidedShare}%`} percent={decidedShare} colorClass="stroke-brand-blue" />
      </div>

      <POCDashboard selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} currentMonthKey={CURRENT_MONTH_KEY} />

      <RecentActivityCard projectIds={[]} includePocs />
    </div>
  );
}
