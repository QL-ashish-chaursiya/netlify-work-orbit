import { useState } from "react";
import { Button } from "@/components/ui/button";
import { POCDashboard } from "@/features/pocs/components/POCDashboard";
import { POCList } from "@/features/pocs/components/POCList";
import { POCForm } from "@/features/pocs/components/POCForm";

// Composes the monthly dashboard + POC list with drill-down wired between
// them: clicking a month's bar in POCDashboard sets `selectedMonth`, which
// filters POCList to that month (BRD §5 Phase 6).
export function POCsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales POCs</h1>
          <p className="text-muted-foreground">Track proof-of-concept engagements and conversion into projects.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Log POC</Button>
      </div>

      <POCDashboard selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />

      <POCList monthFilter={selectedMonth} />

      <POCForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
