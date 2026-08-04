import { useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ACCOUNT_STATUS_TONE, humanizeEnum } from "@/lib/status-badges";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useResendInvite } from "@/features/employees/hooks/useResendInvite";
import { useDeactivateEmployee } from "@/features/employees/hooks/useDeactivateEmployee";
import { useActivateEmployee } from "@/features/employees/hooks/useActivateEmployee";
import type { Tables } from "@/lib/database.types";

type Employee = Tables<"profiles">;

export function EmployeeTable() {
  const { data: employees, isLoading } = useEmployees();
  const resendInvite = useResendInvite();
  const deactivateEmployee = useDeactivateEmployee();
  const activateEmployee = useActivateEmployee();
  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(null);

  async function handleResendInvite(employee: Employee) {
    try {
      await resendInvite.mutateAsync(employee.id);
      toast.success(`Invite re-sent to ${employee.email}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend invite");
    }
  }

  async function handleActivate(employee: Employee) {
    try {
      await activateEmployee.mutateAsync(employee.id);
      toast.success(`${employee.full_name} is now active.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not activate employee");
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivateTarget) return;
    try {
      await deactivateEmployee.mutateAsync(deactivateTarget.id);
      toast.success(`${deactivateTarget.full_name} has been deactivated.`);
      setDeactivateTarget(null);
    } catch (err) {
      // The guard_last_admin trigger's RAISE EXCEPTION message surfaces here
      // verbatim (e.g. "Cannot deactivate the last remaining Admin...").
      toast.error(err instanceof Error ? err.message : "Could not deactivate employee");
    }
  }

  const columns: ColumnDef<Employee>[] = [
    { accessorKey: "full_name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      id: "primary_role",
      header: "Role",
      cell: ({ row }) => humanizeEnum(row.original.primary_role),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} toneMap={ACCOUNT_STATUS_TONE} />,
    },
    {
      id: "designation",
      header: "Designation",
      cell: ({ row }) => row.original.designation ?? "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={employee.status !== "invited" || resendInvite.isPending}
                onClick={() => handleResendInvite(employee)}
              >
                Resend invite
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={employee.status === "active" || activateEmployee.isPending}
                onClick={() => handleActivate(employee)}
              >
                Activate now
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={employee.status === "deactivated"}
                className="text-destructive focus:text-destructive"
                onClick={() => setDeactivateTarget(employee)}
              >
                Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={employees ?? []}
        isLoading={isLoading}
        searchKey="full_name"
        searchPlaceholder="Search employees…"
        emptyMessage="No employees yet."
      />
      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate employee"
        description={`Are you sure you want to deactivate ${deactivateTarget?.full_name}? They will lose access immediately.`}
        confirmLabel="Deactivate"
        destructive
        isPending={deactivateEmployee.isPending}
        onConfirm={handleConfirmDeactivate}
      />
    </>
  );
}
