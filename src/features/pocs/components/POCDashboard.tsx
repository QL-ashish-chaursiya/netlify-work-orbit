import { ArrowDown, ArrowUp } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePocMonthlyStats, type PocMonthStat } from "@/features/pocs/hooks/usePocMonthlyStats";

// Same fixed-order categorical triad as the outcome status badges
// (amber/green/red), re-picked at the 600-weight for chart surfaces.
const PENDING_COLOR = "#d97706";
const CLOSED_WON_COLOR = "#059669";
const CLOSED_LOST_COLOR = "#e11d48";
const TREND_MUTED = "#c7d2fe";
const TREND_ACTIVE = "#4f46e5";

interface POCDashboardProps {
  selectedMonth: string | null;
  onSelectMonth: (month: string | null) => void;
  currentMonthKey: string;
}

function OutcomeTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  const entry = active ? payload?.[0] : undefined;
  if (!entry) return null;
  return (
    <div className="rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-md">
      {entry.name}: {entry.value}
    </div>
  );
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: PocMonthStat }[] }) {
  const stat = active ? payload?.[0]?.payload : undefined;
  if (!stat) return null;
  return (
    <div className="rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{stat.monthLabel}</p>
      <p>Conversion rate: {stat.conversionRate}%</p>
      <p className="text-muted-foreground">
        {stat.closedWon} won / {stat.closedWon + stat.closedLost} decided
      </p>
    </div>
  );
}

// Compact 3-card summary (BRD §5 Phase 6): current-month volume + delta,
// this-selection's outcome split as a donut, and a trailing-6-month
// conversion-rate sparkline that doubles as the month picker driving
// POCList's drill-down (click a bar to select/deselect that month).
export function POCDashboard({ selectedMonth, onSelectMonth, currentMonthKey }: POCDashboardProps) {
  const { monthlyStats, totals, isLoading } = usePocMonthlyStats();

  const currentIndex = monthlyStats.findIndex((m) => m.month === currentMonthKey);
  const previousMonth = currentIndex > 0 ? monthlyStats[currentIndex - 1] : undefined;
  const currentMonth = monthlyStats[currentIndex];
  const delta = currentMonth && previousMonth ? currentMonth.total - previousMonth.total : 0;

  const trendMonths = monthlyStats.slice(Math.max(0, currentIndex - 5), currentIndex + 1);

  const outcomeScope = selectedMonth ? monthlyStats.find((m) => m.month === selectedMonth) : undefined;
  const outcomeStats = outcomeScope ?? totals;
  const outcomeData = [
    { name: "Closed-Won", value: outcomeStats.closedWon, color: CLOSED_WON_COLOR },
    { name: "Closed-Lost", value: outcomeStats.closedLost, color: CLOSED_LOST_COLOR },
    { name: "Pending", value: outcomeStats.pending, color: PENDING_COLOR },
  ];
  const outcomeTotal = outcomeData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">POCs this month</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{isLoading ? "—" : currentMonth?.total ?? 0}</p>
          {!isLoading && previousMonth && (
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-sm font-medium",
                delta >= 0 ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {delta >= 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
              {Math.abs(delta)} vs {previousMonth.monthLabel.split(" ")[0]}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Outcome split{selectedMonth && outcomeScope ? ` — ${outcomeScope.monthLabel}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : outcomeTotal === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No POCs in this period.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-28 w-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={32} outerRadius={54} strokeWidth={2}>
                      {outcomeData.map((d) => (
                        <Cell key={d.name} fill={d.color} stroke="var(--background)" />
                      ))}
                    </Pie>
                    <Tooltip content={<OutcomeTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-sm">
                {outcomeData.map((d) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Conversion trend</CardTitle>
          <span className="text-xs text-muted-foreground">Trailing 6 months</span>
        </CardHeader>
        <CardContent>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendMonths}
                barCategoryGap="28%"
                onClick={(state: { activeLabel?: string } | null) => {
                  if (!state?.activeLabel) return;
                  onSelectMonth(state.activeLabel === selectedMonth ? null : state.activeLabel);
                }}
              >
                <Tooltip content={<TrendTooltip />} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="conversionRate" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} isAnimationActive={false}>
                  {trendMonths.map((m) => (
                    <Cell key={m.month} fill={(selectedMonth ?? currentMonthKey) === m.month ? TREND_ACTIVE : TREND_MUTED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 grid grid-cols-6 gap-1 text-center text-[11px] text-muted-foreground">
            {trendMonths.map((m) => (
              <span key={m.month}>{m.monthLabel.split(" ")[0]}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
