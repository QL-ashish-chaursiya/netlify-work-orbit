import { useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { useMonthlyUtilizationTrend } from "@/features/reporting/hooks/useMonthlyUtilizationTrend";
import { useUtilizationByFunction } from "@/features/dashboard/hooks/useUtilizationByFunction";

const MUTED_BAR = "url(#trendMutedFill)";
const CURRENT_BAR = "url(#trendCurrentFill)";
// A 0% bar is still real data (someone genuinely idle that month) — it just
// has no height to render, which reads as "broken chart" rather than "zero".
// displayValue gives every bar a small visible stub while the label (driven
// by the untouched `value` field) still shows the true number, including 0%.
const MIN_VISUAL_PERCENT = 3;

export function UtilizationTrendCard() {
  const [view, setView] = useState<"org" | "function">("org");
  const { data: trend, isLoading: trendLoading } = useMonthlyUtilizationTrend();
  const { data: byFunction, isLoading: fnLoading } = useUtilizationByFunction();

  const orgData = (trend ?? []).slice(-8).map((p, i, arr) => ({
    label: p.label.split(" ")[0],
    value: p.averageUtilizationPercent,
    displayValue: Math.max(p.averageUtilizationPercent, MIN_VISUAL_PERCENT),
    current: i === arr.length - 1,
  }));
  const functionData = (byFunction ?? []).map((f, i) => ({
    label: f.name,
    value: f.averageUtilizationPercent,
    displayValue: Math.max(f.averageUtilizationPercent, MIN_VISUAL_PERCENT),
    current: i === 0,
  }));

  const data = view === "org" ? orgData : functionData;
  const isLoading = view === "org" ? trendLoading : fnLoading;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Utilization trend</CardTitle>
          <CardDescription>{view === "org" ? "Org-wide, trailing 8 months" : "Current month, by business function"}</CardDescription>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <Button
            size="sm"
            variant={view === "org" ? "default" : "ghost"}
            className="h-7 rounded-md px-3 text-xs"
            onClick={() => setView("org")}
          >
            Org
          </Button>
          <Button
            size="sm"
            variant={view === "function" ? "default" : "ghost"}
            className="h-7 rounded-md px-3 text-xs"
            onClick={() => setView("function")}
          >
            By function
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              message={view === "org" ? "No utilization data yet." : "No business functions with active allocations yet."}
              description={
                view === "org"
                  ? "Once allocations exist, monthly averages will show up here."
                  : "Assign a business function to a project to see it broken down here."
              }
              className="h-full justify-center"
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendMutedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dbe3ff" />
                    <stop offset="100%" stopColor="#c7d2fe" />
                  </linearGradient>
                  <linearGradient id="trendCurrentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--blue-bright)" />
                    <stop offset="100%" stopColor="var(--blue)" />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  interval={0}
                  angle={view === "function" ? -20 : 0}
                  textAnchor={view === "function" ? "end" : "middle"}
                  height={view === "function" ? 44 : 24}
                />
                <YAxis hide domain={[0, 100]} />
                <Bar dataKey="displayValue" fill={MUTED_BAR} radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false}>
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v: number) => `${v}%`}
                    style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }}
                  />
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.current ? CURRENT_BAR : MUTED_BAR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
