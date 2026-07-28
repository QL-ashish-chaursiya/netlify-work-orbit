import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePocMonthlyStats, type PocMonthStat } from "@/features/pocs/hooks/usePocMonthlyStats";

// Status-mapped, fixed-order categorical colors — same semantics as
// POC_OUTCOME_TONE's amber/green/red (pending / closed-won / closed-lost),
// re-picked at the 600-weight so the triad passes the CVD/lightness checks
// on both light and dark chart surfaces (validated with
// dataviz's validate_palette.js).
const PENDING_COLOR = "#d97706";
const CLOSED_WON_COLOR = "#059669";
const CLOSED_LOST_COLOR = "#ef4444";
const CONVERSION_LINE_COLOR = "var(--primary)";

interface POCDashboardProps {
  selectedMonth: string | null;
  onSelectMonth: (month: string | null) => void;
}

function VolumeTooltip({ active, payload }: { active?: boolean; payload?: { payload: PocMonthStat }[] }) {
  const stat = active ? payload?.[0]?.payload : undefined;
  if (!stat) return null;
  return (
    <div className="rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{stat.monthLabel}</p>
      <p style={{ color: PENDING_COLOR }}>Pending: {stat.pending}</p>
      <p style={{ color: CLOSED_WON_COLOR }}>Closed Won: {stat.closedWon}</p>
      <p style={{ color: CLOSED_LOST_COLOR }}>Closed Lost: {stat.closedLost}</p>
      <p className="mt-1 border-t pt-1 text-muted-foreground">Total: {stat.total}</p>
    </div>
  );
}

function ConversionTooltip({ active, payload }: { active?: boolean; payload?: { payload: PocMonthStat }[] }) {
  const stat = active ? payload?.[0]?.payload : undefined;
  if (!stat) return null;
  return (
    <div className="rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{stat.monthLabel}</p>
      <p>Conversion rate: {stat.conversionRate}%</p>
      <p className="text-muted-foreground">
        {stat.closedWon} won / {stat.closedWon + stat.closedLost} decided
      </p>
    </div>
  );
}

// Monthly POC dashboard (BRD §5 Phase 6): volume-by-outcome bar chart +
// conversion-rate trend, each on its own single-scale axis (never combined
// into one dual-axis chart), plus click-to-drill-down wired up to
// POCList via the selectedMonth/onSelectMonth props POCsPage owns.
export function POCDashboard({ selectedMonth, onSelectMonth }: POCDashboardProps) {
  const { monthlyStats, totals, isLoading } = usePocMonthlyStats();

  function handleChartClick(state: { activeLabel?: string } | null) {
    if (!state?.activeLabel) return;
    onSelectMonth(state.activeLabel === selectedMonth ? null : state.activeLabel);
  }

  function monthLabelTick(month: string): string {
    return monthlyStats.find((m) => m.month === month)?.monthLabel ?? month;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total POCs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{isLoading ? "—" : totals.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Closed Won</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold" style={{ color: CLOSED_WON_COLOR }}>
            {isLoading ? "—" : totals.closedWon}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Closed Lost</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold" style={{ color: CLOSED_LOST_COLOR }}>
            {isLoading ? "—" : totals.closedLost}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion rate</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{isLoading ? "—" : `${totals.conversionRate}%`}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">POCs per month</CardTitle>
            <p className="text-sm text-muted-foreground">Click a month to filter the list below.</p>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats} onClick={handleChartClick} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthLabelTick}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    width={28}
                  />
                  <Tooltip content={<VolumeTooltip />} cursor={{ fill: "var(--muted)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="pending"
                    name="Pending"
                    stackId="pocs"
                    fill={PENDING_COLOR}
                    stroke="var(--background)"
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                  >
                    {monthlyStats.map((entry) => (
                      <Cell key={entry.month} opacity={selectedMonth && selectedMonth !== entry.month ? 0.35 : 1} />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="closedWon"
                    name="Closed Won"
                    stackId="pocs"
                    fill={CLOSED_WON_COLOR}
                    stroke="var(--background)"
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                  >
                    {monthlyStats.map((entry) => (
                      <Cell key={entry.month} opacity={selectedMonth && selectedMonth !== entry.month ? 0.35 : 1} />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="closedLost"
                    name="Closed Lost"
                    stackId="pocs"
                    fill={CLOSED_LOST_COLOR}
                    stroke="var(--background)"
                    strokeWidth={2}
                    radius={[4, 4, 0, 0]}
                    style={{ cursor: "pointer" }}
                  >
                    {monthlyStats.map((entry) => (
                      <Cell key={entry.month} opacity={selectedMonth && selectedMonth !== entry.month ? 0.35 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion rate trend</CardTitle>
            <p className="text-sm text-muted-foreground">Closed-won share of decided POCs, per month.</p>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyStats} onClick={handleChartClick} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="conversionTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CONVERSION_LINE_COLOR} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CONVERSION_LINE_COLOR} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthLabelTick}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    width={40}
                  />
                  <Tooltip content={<ConversionTooltip />} cursor={{ stroke: "var(--border)" }} />
                  <Area
                    type="monotone"
                    dataKey="conversionRate"
                    name="Conversion rate"
                    stroke={CONVERSION_LINE_COLOR}
                    strokeWidth={2}
                    fill="url(#conversionTrendFill)"
                    dot={{ r: 4, fill: CONVERSION_LINE_COLOR, strokeWidth: 0, style: { cursor: "pointer" } }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedMonth && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Showing POCs for {monthLabelTick(selectedMonth)}.</span>
          <Button variant="ghost" size="sm" onClick={() => onSelectMonth(null)}>
            Clear filter
          </Button>
        </div>
      )}
    </div>
  );
}
