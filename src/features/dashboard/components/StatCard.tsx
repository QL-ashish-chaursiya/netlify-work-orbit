import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/features/dashboard/components/ProgressRing";

interface StatCardProps {
  label: string;
  value: string;
  percent: number;
  colorClass: string; // e.g. "stroke-brand-blue" / "text-brand-blue"
}

// The five-card stat row at the top of every role dashboard. Deliberately no
// "vs last month" comparison line — dropped per design direction, since we
// don't have historical snapshots to back a trustworthy trend claim there.
export function StatCard({ label, value, percent, colorClass }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        </div>
        <ProgressRing percent={percent} colorClass={colorClass} />
      </CardContent>
    </Card>
  );
}
