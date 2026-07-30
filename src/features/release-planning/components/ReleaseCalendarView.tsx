import { useMemo, useState } from "react";
import {
  addMonths,
  compareAsc,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActiveAllocationsForCalendar } from "@/features/release-planning/hooks/useActiveAllocationsForCalendar";
import type { AllocationWithNames } from "@/features/release-planning/types";

interface CalendarEntry {
  allocation: AllocationWithNames;
  date: string;
  dateKind: "Planned release" | "Expected completion";
}

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

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

function shortName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? fullName;
  const last = parts[parts.length - 1] ?? first;
  return parts.length === 1 ? first : `${first[0] ?? ""}. ${last}`;
}

export function ReleaseCalendarView() {
  const { data, isLoading } = useActiveAllocationsForCalendar();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const entriesByDay = useMemo(() => {
    const entries = toEntries(data ?? []);
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const key = format(parseISO(entry.date), "yyyy-MM-dd");
      const bucket = map.get(key);
      if (bucket) bucket.push(entry);
      else map.set(key, [entry]);
    }
    return map;
  }, [data]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading calendar…</p>;
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Release calendar</h3>
          <p className="text-sm text-muted-foreground">
            {format(month, "MMMM yyyy")} — planned & confirmed releases
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="rounded-full bg-surface-base px-3.5 py-1.5 text-sm font-semibold text-white">
            {format(month, "MMM")}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const entries = entriesByDay.get(key) ?? [];
          const singleEntry = entries.length === 1 ? entries[0] : undefined;
          const inMonth = isSameMonth(day, month);
          return (
            <div
              key={key}
              className={cn(
                "min-h-24 rounded-lg border p-2",
                inMonth ? "bg-background" : "bg-muted/30",
                isToday(day) && "border-brand-blue",
              )}
            >
              <p className={cn("text-xs font-medium", inMonth ? "text-foreground" : "text-muted-foreground/50")}>
                {format(day, "d")}
              </p>
              {singleEntry && (
                <div
                  title={`${singleEntry.allocation.profile?.full_name ?? "Unknown resource"} — ${singleEntry.dateKind} on ${singleEntry.allocation.project?.name ?? "Unknown project"}`}
                  className={cn(
                    "mt-1.5 truncate rounded px-1.5 py-1 text-[11px] font-semibold",
                    singleEntry.dateKind === "Planned release"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-indigo-50 text-indigo-700",
                  )}
                >
                  {shortName(singleEntry.allocation.profile?.full_name ?? "Unknown resource")}
                </div>
              )}
              {entries.length > 1 && (
                <div
                  title={entries
                    .map((e) => `${e.allocation.profile?.full_name ?? "Unknown resource"} (${e.dateKind})`)
                    .join(", ")}
                  className="mt-1.5 truncate rounded bg-emerald-50 px-1.5 py-1 text-[11px] font-semibold text-emerald-700"
                >
                  {entries.length} releases
                </div>
              )}
            </div>
          );
        })}
      </div>

      {entriesByDay.size === 0 && (
        <p className="pt-1 text-center text-xs text-muted-foreground">
          Nothing scheduled yet — planned releases and upcoming completions will appear here.
        </p>
      )}
    </div>
  );
}
