import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { POCDashboard } from "@/features/pocs/components/POCDashboard";
import { POCList } from "@/features/pocs/components/POCList";

const CURRENT_MONTH_KEY = format(new Date(), "yyyy-MM");

// Composes the monthly dashboard + POC list with drill-down wired between
// them: clicking a month's bar in POCDashboard sets `selectedMonth`, which
// filters POCList to that month (BRD §5 Phase 6). Defaults to the current
// month rather than "all POCs ever", matching how presales actually reviews
// this page day to day.
export function POCsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(CURRENT_MONTH_KEY);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales POCs</h1>
          <p className="text-muted-foreground">Track proof-of-concept engagements and conversion into projects.</p>
        </div>
        <Button asChild>
          <Link to="/pocs/new">Log POC</Link>
        </Button>
      </div>

      <POCDashboard selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} currentMonthKey={CURRENT_MONTH_KEY} />

      <POCList monthFilter={selectedMonth} onClearMonth={() => setSelectedMonth(null)} />
    </div>
  );
}
