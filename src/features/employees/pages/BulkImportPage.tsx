import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkImportWizard } from "@/features/employees/components/BulkImportWizard";

export function BulkImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link to="/employees">
            <ArrowLeft className="h-4 w-4" />
            Back to employees
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Bulk import employees</h1>
        <p className="text-sm text-muted-foreground">
          Upload a spreadsheet to add many employees at once. No email is sent — employees activate via Forgot
          Password.
        </p>
      </div>

      <BulkImportWizard />
    </div>
  );
}
