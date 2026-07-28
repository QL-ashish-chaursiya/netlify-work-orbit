import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBenchReport } from "@/features/reporting/hooks/useBenchReport";
import { useBusinessFunctions } from "@/features/org/hooks/useBusinessFunctions";
import type { BenchRow } from "@/features/reporting/types";

const ALL_FUNCTIONS_VALUE = "__all__";

export function BenchReport() {
  const [businessFunctionId, setBusinessFunctionId] = useState<string | null>(null);
  const { data: businessFunctions } = useBusinessFunctions();
  const { data: rows, isLoading } = useBenchReport({ businessFunctionId });

  const businessFunctionNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const bf of businessFunctions ?? []) map.set(bf.id, bf.name);
    return map;
  }, [businessFunctions]);

  const columns = useMemo<ColumnDef<BenchRow>[]>(
    () => [
      { accessorKey: "fullName", header: "Resource" },
      {
        id: "businessFunction",
        header: "Business Function",
        cell: ({ row }) => {
          const id = row.original.businessFunctionId;
          return id ? businessFunctionNames.get(id) ?? "—" : "—";
        },
      },
      {
        accessorKey: "utilizationPercent",
        header: "Current Utilization",
        cell: ({ row }) => `${row.original.utilizationPercent}%`,
      },
      {
        accessorKey: "thresholdPercent",
        header: "Applicable Threshold",
        cell: ({ row }) => `${row.original.thresholdPercent}%`,
      },
    ],
    [businessFunctionNames],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={businessFunctionId ?? ALL_FUNCTIONS_VALUE}
          onValueChange={(value) => setBusinessFunctionId(value === ALL_FUNCTIONS_VALUE ? null : value)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by business function" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FUNCTIONS_VALUE}>All business functions</SelectItem>
            {(businessFunctions ?? []).map((bf) => (
              <SelectItem key={bf.id} value={bf.id}>
                {bf.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={rows ?? []}
        isLoading={isLoading}
        searchKey="fullName"
        searchPlaceholder="Search bench resources..."
        emptyMessage="No resources are currently on the bench."
      />
    </div>
  );
}
