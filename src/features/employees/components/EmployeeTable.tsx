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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ACCOUNT_STATUS_TONE, humanizeEnum } from "@/lib/status-badges";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useResendInvite } from "@/features/employees/hooks/useResendInvite";
import { useDeactivateEmployee } from "@/features/employees/hooks/useDeactivateEmployee";
import { useActivateEmployee } from "@/features/employees/hooks/useActivateEmployee";
import { useUpdateEmployeeRole } from "@/features/employees/hooks/useUpdateEmployeeRole";
import { USER_ROLE_VALUES } from "@/features/employees/types";
import type { Tables, UserRole } from "@/lib/database.types";

type Employee = Tables<"profiles">;

export function EmployeeTable() {
  const { profile: currentProfile } = useAuthRole();
  const { data: employees, isLoading } = useEmployees();
  const resendInvite = useResendInvite();
  const deactivateEmployee = useDeactivateEmployee();
  const activateEmployee = useActivateEmployee();
  const updateRole = useUpdateEmployeeRole();
  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(null);
  const [roleTarget, setRoleTarget] = useState<Employee | null>(null);
  const [roleDraft, setRoleDraft] = useState<UserRole | "">("");

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

  function openRoleEditor(employee: Employee) {
    setRoleTarget(employee);
    setRoleDraft(employee.primary_role);
  }

  async function handleConfirmRoleChange() {
    if (!roleTarget || !roleDraft) return;
    try {
      await updateRole.mutateAsync({ id: roleTarget.id, primary_role: roleDraft });
      toast.success(`${roleTarget.full_name}'s role updated to ${humanizeEnum(roleDraft)}.`);
      setRoleTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update role");
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
        // An Admin managing their own row could deactivate themselves —
        // guard_last_admin only blocks it when they're the *last* Admin, so
        // with 2+ Admins this button would otherwise work and immediately
        // lock the person out of their own session. Simplest safe fix: no
        // self-service actions here at all.
        if (employee.id === currentProfile?.id) return null;
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
              <DropdownMenuItem onClick={() => openRoleEditor(employee)}>Edit role</DropdownMenuItem>
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

      <Dialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>
              Change {roleTarget?.full_name}'s role. This takes effect immediately.
            </DialogDescription>
          </DialogHeader>
          <Select value={roleDraft} onValueChange={(v) => setRoleDraft(v as UserRole)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {USER_ROLE_VALUES.map((role) => (
                <SelectItem key={role} value={role}>
                  {humanizeEnum(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)} disabled={updateRole.isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRoleChange} disabled={!roleDraft || updateRole.isPending}>
              {updateRole.isPending ? "Saving…" : "Save role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
