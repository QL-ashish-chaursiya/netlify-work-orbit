import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { POC_OUTCOME_TONE } from "@/lib/status-badges";
import { usePocs, type PocWithBusinessFunction } from "@/features/pocs/hooks/usePocs";
import { getPocBucketMonth } from "@/features/pocs/hooks/usePocMonthlyStats";

interface POCListProps {
  /** "YYYY-MM" — when set, only POCs bucketed into this month (via
   * getPocBucketMonth, same rule the dashboard uses) are shown. Drives the
   * dashboard's drill-down. */
  monthFilter?: string | null;
}

export function POCList({ monthFilter }: POCListProps) {
  const { data: pocs, isLoading } = usePocs();

  const filtered = useMemo(() => {
    if (!monthFilter) return pocs ?? [];
    return (pocs ?? []).filter((poc) => getPocBucketMonth(poc) === monthFilter);
  }, [pocs, monthFilter]);

  const columns = useMemo<ColumnDef<PocWithBusinessFunction>[]>(
    () => [
      {
        accessorKey: "client_name",
        header: "Client",
        cell: ({ row }) => (
          <Link to={`/pocs/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.client_name}
          </Link>
        ),
      },
      {
        accessorKey: "opportunity_name",
        header: "Opportunity",
        cell: ({ row }) => row.original.opportunity_name ?? "—",
      },
      {
        id: "business_function",
        header: "Business function",
        cell: ({ row }) => row.original.business_function?.name ?? "—",
      },
      {
        accessorKey: "outcome",
        header: "Outcome",
        cell: ({ row }) => <StatusBadge value={row.original.outcome} toneMap={POC_OUTCOME_TONE} />,
      },
      {
        accessorKey: "start_date",
        header: "Start date",
        cell: ({ row }) => row.original.start_date ?? "—",
      },
      {
        accessorKey: "end_date",
        header: "End date",
        cell: ({ row }) => row.original.end_date ?? "—",
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={filtered}
      isLoading={isLoading}
      searchKey="client_name"
      searchPlaceholder="Search POCs by client…"
      emptyMessage={monthFilter ? "No POCs logged for this month." : "No POCs logged yet — log your first one to get started."}
    />
  );
}
