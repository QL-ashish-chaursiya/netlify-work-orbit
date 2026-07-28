import { Link } from "react-router-dom";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeTable } from "@/features/employees/components/EmployeeTable";
import { AddEmployeeForm } from "@/features/employees/components/AddEmployeeForm";

export function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage who has access to your organization.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/employees/bulk-import">
              <Upload className="h-4 w-4" />
              Bulk Import
            </Link>
          </Button>
          <AddEmployeeForm />
        </div>
      </div>

      <EmployeeTable />
    </div>
  );
}
