import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMonthlyUtilizationTrend } from "@/features/reporting/hooks/useMonthlyUtilizationTrend";
import { useUtilizationData } from "@/features/reporting/hooks/useUtilizationData";
import { useBenchReport } from "@/features/reporting/hooks/useBenchReport";
import { useOverAllocatedResources } from "@/features/reporting/hooks/useOverAllocatedResources";

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      )}
    </Card>
  );
}

export function ExecutiveDashboard() {
  const { data: trend, isLoading: trendLoading } = useMonthlyUtilizationTrend();
  const { data: utilizationRows } = useUtilizationData();
  const { data: benchRows } = useBenchReport();
  const { data: overAllocatedRows } = useOverAllocatedResources();

  const headcount = utilizationRows?.length ?? 0;
  const benchCount = benchRows?.length ?? 0;
  const benchStrengthPercent = headcount > 0 ? Math.round((benchCount / headcount) * 1000) / 10 : 0;
  // Same "active resources / total resources" formula as the main Dashboard's
  // "Org Utilization" tile — kept identical on purpose so the two don't show
  // conflicting headline numbers for what reads as the same metric. The
  // monthly trend chart below is intentionally a *different* metric (average
  // allocation load, which can exceed the headcount-fraction figure when
  // fewer people carry more/stacked allocation %), so it's labeled separately.
  const activeResourceCount = (utilizationRows ?? []).filter((r) => r.utilizationPercent > 0).length;
  const orgUtilizationPercent = headcount > 0 ? Math.round((activeResourceCount / headcount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Org Utilization"
          value={`${orgUtilizationPercent}%`}
          hint={`${activeResourceCount} of ${headcount} resources currently carrying work`}
        />
        <StatTile
          label="Bench Strength"
          value={`${benchCount} / ${headcount}`}
          hint={`${benchStrengthPercent}% of headcount is below their idle threshold`}
        />
        <StatTile
          label="Over-Allocated"
          value={String(overAllocatedRows?.length ?? 0)}
          hint="Resources committed above 100% capacity"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Allocation Load Trend</CardTitle>
          <CardDescription>
            Average allocation % per resource over the last 12 months — a different measure from the "Org
            Utilization" figure above, which is the share of resources carrying any work at all.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            {!trendLoading && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="utilizationTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ className: "stroke-border" }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Avg. utilization"]}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="averageUtilizationPercent"
                    name="Avg. utilization"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#utilizationTrendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
