import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useOverAllocatedResources } from "@/features/reporting/hooks/useOverAllocatedResources";

// Meant to sit at the top of the Utilization tab — a loud, destructive-tone
// card when anyone is over 100% allocated, otherwise a quiet all-clear card.
export function OverAllocationBanner() {
  const { data: rows, isLoading } = useOverAllocatedResources();

  if (isLoading) return null;

  if (!rows || rows.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            No resources are currently over-allocated.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {rows.length} resource{rows.length === 1 ? "" : "s"} over-allocated
        </CardTitle>
        <CardDescription>
          These resources are currently committed above 100% of their capacity across active allocations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.profileId} className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{row.fullName}</span>
              <span className="font-semibold tabular-nums text-destructive">{row.utilizationPercent}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
