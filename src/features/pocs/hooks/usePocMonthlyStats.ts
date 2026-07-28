import { useMemo } from "react";
import { usePocs, type PocWithBusinessFunction } from "@/features/pocs/hooks/usePocs";

export interface PocMonthStat {
  /** "YYYY-MM" bucket key — also what POCList's monthFilter expects. */
  month: string;
  /** Human label for axis ticks / tooltips, e.g. "Jul 2026". */
  monthLabel: string;
  total: number;
  pending: number;
  closedWon: number;
  closedLost: number;
  /** closedWon / (closedWon + closedLost) as a 0–100 percentage, rounded to 1dp. Pending POCs aren't yet in the denominator. */
  conversionRate: number;
}

export interface PocTotals {
  total: number;
  pending: number;
  closedWon: number;
  closedLost: number;
  conversionRate: number;
}

const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

/**
 * Bucketing rule shared with POCList's drill-down filter: a POC belongs to
 * the month of its `start_date` when present (the more meaningful "when did
 * sales engagement begin" date per the BRD), falling back to `created_at`
 * for POCs logged without a start date.
 */
export function getPocBucketMonth(poc: Pick<PocWithBusinessFunction, "start_date" | "created_at">): string {
  return (poc.start_date ?? poc.created_at).slice(0, 7);
}

function conversionRateOf(closedWon: number, closedLost: number): number {
  const decided = closedWon + closedLost;
  return decided > 0 ? Math.round((closedWon / decided) * 1000) / 10 : 0;
}

// Monthly dashboard data (BRD §5 Phase 6): POCs per month + conversion rate,
// bucketed over the trailing 12 calendar months (this month inclusive).
export function usePocMonthlyStats() {
  const { data: pocs, isLoading } = usePocs();

  const monthlyStats = useMemo<PocMonthStat[]>(() => {
    const now = new Date();
    const buckets = new Map<string, PocMonthStat>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, {
        month: key,
        monthLabel: MONTH_LABEL_FORMAT.format(d),
        total: 0,
        pending: 0,
        closedWon: 0,
        closedLost: 0,
        conversionRate: 0,
      });
    }

    for (const poc of pocs ?? []) {
      const bucket = buckets.get(getPocBucketMonth(poc));
      if (!bucket) continue; // outside the trailing 12-month window
      bucket.total += 1;
      if (poc.outcome === "pending") bucket.pending += 1;
      else if (poc.outcome === "closed_won") bucket.closedWon += 1;
      else if (poc.outcome === "closed_lost") bucket.closedLost += 1;
    }

    for (const bucket of buckets.values()) {
      bucket.conversionRate = conversionRateOf(bucket.closedWon, bucket.closedLost);
    }

    return [...buckets.values()];
  }, [pocs]);

  const totals = useMemo<PocTotals>(() => {
    const all = pocs ?? [];
    const pending = all.filter((p) => p.outcome === "pending").length;
    const closedWon = all.filter((p) => p.outcome === "closed_won").length;
    const closedLost = all.filter((p) => p.outcome === "closed_lost").length;
    return { total: all.length, pending, closedWon, closedLost, conversionRate: conversionRateOf(closedWon, closedLost) };
  }, [pocs]);

  return { monthlyStats, totals, isLoading };
}
