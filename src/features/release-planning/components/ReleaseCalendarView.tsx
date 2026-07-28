import { useMemo } from "react";
import { compareAsc, format, parseISO } from "date-fns";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ALLOCATION_STATUS_TONE } from "@/lib/status-badges";
import { useActiveAllocationsForCalendar } from "@/features/release-planning/hooks/useActiveAllocationsForCalendar";
import type { AllocationWithNames } from "@/features/release-planning/types";

interface CalendarEntry {
  allocation: AllocationWithNames;
  date: string;
  dateKind: "Planned release" | "Expected completion";
}

// planned_for_release rows key off planned_release_date; plain active rows
// (no release date set yet) key off expected_completion_date instead, so
// both "already scheduled to leave" and "coming up soon" show on the
// calendar together.
function toEntries(allocations: AllocationWithNames[]): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  for (const allocation of allocations) {
    if (allocation.planned_release_date) {
      entries.push({ allocation, date: allocation.planned_release_date, dateKind: "Planned release" });
    } else if (allocation.expected_completion_date) {
      entries.push({ allocation, date: allocation.expected_completion_date, dateKind: "Expected completion" });
    }
  }
  return entries.sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
}

// Lightweight calendar substitute: a full grid isn't needed for this data
// volume — grouping chronologically by month reads clearly and needs no
// calendar library.
export function ReleaseCalendarView() {
  const { data, isLoading } = useActiveAllocationsForCalendar();

  const monthBuckets = useMemo(() => {
    const entries = toEntries(data ?? []);
    const buckets = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const key = format(parseISO(entry.date), "MMMM yyyy");
      const bucket = buckets.get(key);
      if (bucket) bucket.push(entry);
      else buckets.set(key, [entry]);
    }
    return Array.from(buckets.entries());
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading calendar…</p>;
  }

  if (monthBuckets.length === 0) {
    return (
      <EmptyState
        message="Nothing scheduled"
        description="No active allocations have a planned release or expected completion date yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      {monthBuckets.map(([month, entries]) => (
        <div key={month} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{month}</h3>
          <div className="divide-y rounded-md border">
            {entries.map((entry) => (
              <div
                key={`${entry.allocation.id}-${entry.dateKind}`}
                className="flex items-center justify-between gap-4 p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {entry.allocation.profile?.full_name ?? "Unknown resource"}{" "}
                    <span className="text-muted-foreground">on</span>{" "}
                    {entry.allocation.project?.name ?? "Unknown project"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.dateKind}: {format(parseISO(entry.date), "EEE, MMM d, yyyy")}
                  </p>
                </div>
                <StatusBadge value={entry.allocation.status} toneMap={ALLOCATION_STATUS_TONE} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
