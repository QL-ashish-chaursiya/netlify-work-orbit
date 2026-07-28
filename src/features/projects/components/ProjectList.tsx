import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PROJECT_STATUS_TONE } from "@/lib/status-badges";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { useBusinessFunctions } from "@/features/org/hooks/useBusinessFunctions";
import type { Tables } from "@/lib/database.types";

export function ProjectList() {
  const { data: projects, isLoading } = useProjects();
  const { data: businessFunctions } = useBusinessFunctions();

  const businessFunctionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const bf of businessFunctions ?? []) map.set(bf.id, bf.name);
    return map;
  }, [businessFunctions]);

  const columns = useMemo<ColumnDef<Tables<"projects">>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link to={`/projects/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "client_name",
        header: "Client",
        cell: ({ row }) => row.original.client_name ?? "—",
      },
      {
        id: "business_function",
        header: "Business function",
        cell: ({ row }) =>
          row.original.business_function_id
            ? businessFunctionNameById.get(row.original.business_function_id) ?? "—"
            : "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge value={row.original.status} toneMap={PROJECT_STATUS_TONE} />,
      },
      {
        accessorKey: "planned_start_date",
        header: "Planned start",
        cell: ({ row }) => row.original.planned_start_date ?? "—",
      },
      {
        accessorKey: "planned_end_date",
        header: "Planned end",
        cell: ({ row }) => row.original.planned_end_date ?? "—",
      },
    ],
    [businessFunctionNameById],
  );

  return (
    <DataTable
      columns={columns}
      data={projects ?? []}
      isLoading={isLoading}
      searchKey="name"
      searchPlaceholder="Search projects…"
      emptyMessage="No projects yet — create your first one to get started."
    />
  );
}
