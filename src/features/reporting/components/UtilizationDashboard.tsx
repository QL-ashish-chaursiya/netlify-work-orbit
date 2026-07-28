import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TONE_CLASSES } from "@/lib/status-badges";
import { useUtilizationData } from "@/features/reporting/hooks/useUtilizationData";
import { useIdleThresholds } from "@/features/reporting/hooks/useIdleThresholds";
import { resolveThreshold } from "@/features/reporting/hooks/useBenchReport";
import { useBusinessFunctions } from "@/features/org/hooks/useBusinessFunctions";
import type { UtilizationRow } from "@/features/reporting/types";

// Utilization tone: red when over-committed, amber when below the resource's
// applicable bench threshold, green otherwise. Defined locally per the
// reporting module's own convention rather than in the shared status-badges
// file, since this is a computed metric rather than a fixed enum.
function getUtilizationTone(utilizationPercent: number, thresholdPercent: number) {
  if (utilizationPercent > 100) return { label: "Over-allocated", tone: "red" as const };
  if (utilizationPercent < thresholdPercent) return { label: "Below threshold", tone: "amber" as const };
  return { label: "Healthy", tone: "green" as const };
}

const METER_TONE_BAR: Record<"red" | "amber" | "green", string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
};

function UtilizationMeter({ percent, tone }: { percent: number; tone: "red" | "amber" | "green" }) {
  const width = Math.min(percent, 120) / 120 * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", METER_TONE_BAR[tone])}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums">{percent}%</span>
    </div>
  );
}

const DISTRIBUTION_BANDS = [
  { key: "0–25%", min: 0, max: 25 },
  { key: "25–50%", min: 25, max: 50 },
  { key: "50–70%", min: 50, max: 70 },
  { key: "70–100%", min: 70, max: 100 },
  { key: "100%+", min: 100, max: Infinity },
];

export function UtilizationDashboard() {
  const { data: rows, isLoading } = useUtilizationData();
  const { data: thresholds } = useIdleThresholds();
  const { data: businessFunctions } = useBusinessFunctions();

  const businessFunctionNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const bf of businessFunctions ?? []) map.set(bf.id, bf.name);
    return map;
  }, [businessFunctions]);

  const distribution = useMemo(() => {
    const counts = DISTRIBUTION_BANDS.map((band) => ({ band: band.key, count: 0 }));
    for (const row of rows ?? []) {
      const idx = DISTRIBUTION_BANDS.findIndex((band) => row.utilizationPercent >= band.min && row.utilizationPercent < band.max);
      const bucket = idx >= 0 ? counts[idx] : undefined;
      if (bucket) bucket.count += 1;
    }
    return counts;
  }, [rows]);

  const columns = useMemo<ColumnDef<UtilizationRow>[]>(
    () => [
      { accessorKey: "fullName", header: "Resource" },
      {
        id: "businessFunction",
        header: "Business Function",
        cell: ({ row }) => {
          const id = row.original.businessFunctionId;
          return id ? businessFunctionNames.get(id) ?? "—" : "—";
        },
      },
      {
        accessorKey: "utilizationPercent",
        header: "Utilization",
        cell: ({ row }) => {
          const threshold = resolveThreshold(row.original.businessFunctionId, thresholds ?? []);
          const { tone } = getUtilizationTone(row.original.utilizationPercent, threshold);
          return <UtilizationMeter percent={row.original.utilizationPercent} tone={tone} />;
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const threshold = resolveThreshold(row.original.businessFunctionId, thresholds ?? []);
          const { label, tone } = getUtilizationTone(row.original.utilizationPercent, threshold);
          return (
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE_CLASSES[tone])}>
              {label}
            </span>
          );
        },
      },
    ],
    [businessFunctionNames, thresholds],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Utilization Distribution</CardTitle>
          <CardDescription>Count of resources by current utilization band, across the org.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="band" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ className: "stroke-border" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" name="Resources" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={rows ?? []}
        isLoading={isLoading}
        searchKey="fullName"
        searchPlaceholder="Search resources..."
        emptyMessage="No active resources found."
      />
    </div>
  );
}
