import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAllocationsByFunction } from "@/features/dashboard/hooks/useAllocationsByFunction";

const BAR_COLORS = ["var(--blue)", "#059669", "#7c6cff", "#d97706", "#ef4444", "#0891b2"];

export function AllocationByFunctionCard() {
  const { data, isLoading } = useAllocationsByFunction();
  const rows = data ?? [];
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Allocation by function</CardTitle>
        <CardDescription>Share of active resources</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState message="No active allocations yet." className="py-8" />
        ) : (
          <div className="space-y-4">
            {rows.slice(0, 6).map((row, i) => (
              <div key={row.businessFunctionId} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{row.name}</span>
                  <span className="tabular-nums text-muted-foreground">{row.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(row.count / max) * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
