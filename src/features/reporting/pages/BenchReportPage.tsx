import { BenchReportTable } from "@/features/reporting/components/BenchReportTable";

export function BenchReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bench Report</h1>
        <p className="text-sm text-muted-foreground">
          Resources currently below their idle-threshold utilization, how long they've been trending down, and what
          they're bringing to the next assignment.
        </p>
      </div>
      <BenchReportTable />
    </div>
  );
}
