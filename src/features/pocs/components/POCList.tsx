import { useMemo } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { format, isSameMonth, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { POC_OUTCOME_TONE } from "@/lib/status-badges";
import { usePocs, type PocWithBusinessFunction } from "@/features/pocs/hooks/usePocs";
import { getPocBucketMonth } from "@/features/pocs/hooks/usePocMonthlyStats";
import { usePocEngagementSummaries } from "@/features/pocs/hooks/usePocEngagementSummaries";

interface POCListProps {
  /** "YYYY-MM" — when set, only POCs bucketed into this month (via
   * getPocBucketMonth, same rule the dashboard uses) are shown. Drives the
   * dashboard's drill-down. */
  monthFilter?: string | null;
  onClearMonth?: () => void;
}

function shortName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? fullName;
  const last = parts[parts.length - 1] ?? first;
  return parts.length === 1 ? first : `${first[0] ?? ""}. ${last}`;
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  if (start && !end) return format(parseISO(start), "MMM d");
  if (!start && end) return format(parseISO(end), "MMM d");
  const startDate = parseISO(start as string);
  const endDate = parseISO(end as string);
  return isSameMonth(startDate, endDate)
    ? `${format(startDate, "MMM d")}–${format(endDate, "d")}`
    : `${format(startDate, "MMM d")}–${format(endDate, "MMM d")}`;
}

export function POCList({ monthFilter, onClearMonth }: POCListProps) {
  const { data: pocs, isLoading } = usePocs();

  const filtered = useMemo(() => {
    if (!monthFilter) return pocs ?? [];
    return (pocs ?? []).filter((poc) => getPocBucketMonth(poc) === monthFilter);
  }, [pocs, monthFilter]);

  const { data: engagement } = usePocEngagementSummaries(filtered.map((p) => p.id));

  const columns = useMemo<ColumnDef<PocWithBusinessFunction>[]>(
    () => [
      {
        accessorKey: "client_name",
        header: "Client / Opportunity",
        cell: ({ row }) => (
          <div>
            <Link to={`/pocs/${row.original.id}`} className="font-medium text-primary hover:underline">
              {row.original.client_name}
            </Link>
            {row.original.opportunity_name && (
              <p className="text-xs text-muted-foreground">{row.original.opportunity_name}</p>
            )}
          </div>
        ),
      },
      {
        id: "dates",
        header: "Dates",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateRange(row.original.start_date, row.original.end_date)}
          </span>
        ),
      },
      {
        id: "resources",
        header: "Resources engaged",
        cell: ({ row }) => {
          const resources = engagement?.get(row.original.id)?.resources ?? [];
          const first = resources[0];
          if (!first) return <span className="text-sm text-muted-foreground">—</span>;
          const rest = resources.slice(1);
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-[var(--blue-bright)] to-[var(--indigo)] text-[10px] font-semibold text-white">
                  {initials(first.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">
                {shortName(first.fullName)}
                {rest.length > 0 && <span className="text-muted-foreground"> +{rest.length}</span>}
              </span>
            </div>
          );
        },
      },
      {
        id: "skills",
        header: "Skills / Tech",
        cell: ({ row }) => {
          const skillNames = engagement?.get(row.original.id)?.skillNames ?? [];
          if (skillNames.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {skillNames.map((name) => (
                <Badge key={name} variant="secondary" className="font-normal">
                  {name}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "outcome",
        header: "Outcome",
        cell: ({ row }) => <StatusBadge value={row.original.outcome} toneMap={POC_OUTCOME_TONE} />,
      },
    ],
    [engagement],
  );

  function exportToExcel() {
    const rows = filtered.map((poc) => {
      const resources = engagement?.get(poc.id)?.resources ?? [];
      const skillNames = engagement?.get(poc.id)?.skillNames ?? [];
      return {
        Client: poc.client_name,
        Opportunity: poc.opportunity_name ?? "",
        "Business function": poc.business_function?.name ?? "",
        "Start date": poc.start_date ?? "",
        "Target close date": poc.end_date ?? "",
        Priority: poc.priority,
        "Resources engaged": resources.map((r) => r.fullName).join(", "),
        "Skills / Tech": skillNames.join(", "),
        Outcome: poc.outcome,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "POC log");
    const suffix = monthFilter ? monthFilter : "all";
    XLSX.writeFile(workbook, `poc-log-${suffix}.xlsx`);
  }

  const monthLabel = monthFilter ? format(parseISO(`${monthFilter}-01`), "MMMM yyyy") : "All time";

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">POC log — {monthLabel}</CardTitle>
          <p className="text-xs text-muted-foreground">Linked to resource allocations for effort traceability</p>
        </div>
        <div className="flex items-center gap-2">
          {monthFilter && onClearMonth && (
            <Button variant="ghost" size="sm" onClick={onClearMonth}>
              View all
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          searchKey="client_name"
          searchPlaceholder="Search POCs by client…"
          emptyMessage={monthFilter ? "No POCs logged for this month." : "No POCs logged yet — log your first one to get started."}
        />
      </CardContent>
    </Card>
  );
}
