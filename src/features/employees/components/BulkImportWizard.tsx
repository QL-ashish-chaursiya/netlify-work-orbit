import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload, XCircle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { IMPORT_JOB_STATUS_TONE } from "@/lib/status-badges";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useSeatLimit } from "@/features/employees/hooks/useSeatLimit";
import { useBulkImportEmployees } from "@/features/employees/hooks/useBulkImportEmployees";
import { bulkImportRowSchema, type BulkImportJobResult, type ParsedRow } from "@/features/employees/types";

type Step = "upload" | "preview" | "results";

// Accepted header spellings per canonical field — matched case-insensitively
// after stripping non-alphanumerics, so "Full Name", "full_name", "Name" all resolve.
const HEADER_ALIASES: Record<string, string[]> = {
  full_name: ["fullname", "name", "employeename"],
  email: ["email", "emailaddress", "workemail"],
  primary_role: ["primaryrole", "role"],
  designation: ["designation", "title", "jobtitle"],
  reporting_manager_email: ["reportingmanageremail", "manageremail", "reportingmanager", "manager"],
};

function normalizeHeader(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function mapRawRow(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    normalized[normalizeHeader(key)] = value;
  }
  const mapped: Record<string, unknown> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const matchKey = aliases.find((alias) => alias in normalized);
    if (matchKey !== undefined) {
      mapped[field] = normalized[matchKey];
    }
  }
  return mapped;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${(cell ?? "").toString().replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Sample rows double as documentation: one of each accepted role and a
// designation example — mirrors bulkImportRowSchema in types.ts exactly.
// reporting_manager_email is left blank in every sample row on purpose: it
// must reference an employee who already exists in the org, so a manager
// listed in this SAME file would always fail validation ("not found") —
// import managers first, then re-import a file with reports referencing them.
const SAMPLE_ROWS = [
  { full_name: "Rita Sharma", email: "rita.sales@example.com", primary_role: "sales_lead", designation: "Sales Lead", reporting_manager_email: "" },
  { full_name: "Priya Patel", email: "priya.pm@example.com", primary_role: "project_manager", designation: "Project Manager", reporting_manager_email: "" },
  { full_name: "Tom Wilson", email: "tom.tl@example.com", primary_role: "tech_lead", designation: "Tech Lead", reporting_manager_email: "" },
  { full_name: "Alice Chen", email: "alice.dev@example.com", primary_role: "team_member", designation: "Software Engineer", reporting_manager_email: "" },
];

function downloadSampleTemplate() {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_ROWS, {
    header: ["full_name", "email", "primary_role", "designation", "reporting_manager_email"],
  });
  worksheet["!cols"] = [{ wch: 18 }, { wch: 26 }, { wch: 18 }, { wch: 20 }, { wch: 26 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
  XLSX.writeFile(workbook, "employee-bulk-import-sample.xlsx");
}

export function BulkImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<BulkImportJobResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: employees } = useEmployees();
  const { data: seatLimit } = useSeatLimit();
  const bulkImport = useBulkImportEmployees();

  const existingEmails = useMemo(
    () => new Set((employees ?? []).map((e) => e.email.toLowerCase())),
    [employees],
  );

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          toast.error("The file has no sheets.");
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        if (!sheet) {
          toast.error("The file has no sheets.");
          return;
        }
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        if (rawRows.length === 0) {
          toast.error("The file has no data rows.");
          return;
        }

        const seenEmails = new Set<string>();
        const rows: ParsedRow[] = rawRows.map((raw, idx) => {
          const rowNumber = idx + 2; // header is row 1
          const mapped = mapRawRow(raw);
          const parsed = bulkImportRowSchema.safeParse(mapped);

          if (!parsed.success) {
            return {
              rowNumber,
              raw,
              valid: false,
              errors: parsed.error.issues.map((issue) => issue.message),
            };
          }

          const errors: string[] = [];
          const emailLower = parsed.data.email.toLowerCase();
          if (seenEmails.has(emailLower)) {
            errors.push("Duplicate email in file");
          }
          seenEmails.add(emailLower);
          if (existingEmails.has(emailLower)) {
            errors.push("Email already exists in this organization");
          }
          if (parsed.data.reporting_manager_email) {
            const managerEmail = parsed.data.reporting_manager_email.toLowerCase();
            if (!existingEmails.has(managerEmail)) {
              errors.push("Reporting manager not found (must be an existing employee)");
            }
          }

          return {
            rowNumber,
            raw,
            valid: errors.length === 0,
            errors,
            data: errors.length === 0 ? parsed.data : undefined,
          };
        });

        setParsedRows(rows);
        setStep("preview");
      } catch {
        toast.error("Could not parse this file. Make sure it's a valid .xlsx or .csv export.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const validRows = parsedRows.filter((r) => r.valid && r.data);
  const errorRowsCount = parsedRows.length - validRows.length;
  const seatsAfterImport = (seatLimit?.used ?? 0) + validRows.length;
  const wouldExceedSeatLimit = !!seatLimit && seatsAfterImport > seatLimit.limit;

  async function handleConfirmImport() {
    try {
      const res = await bulkImport.mutateAsync({
        file_name: fileName,
        rows: validRows.map((r) => r.data!),
      });
      setResult(res);
      setStep("results");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk import failed");
    }
  }

  function reset() {
    setStep("upload");
    setFileName("");
    setParsedRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDownloadErrorReport() {
    if (!result) return;
    const rows: string[][] = [["Row", "Error", "Raw Data"]];
    for (const err of result.errorRows) {
      rows.push([String(err.row_number), err.error_reason, JSON.stringify(err.raw_data)]);
    }
    downloadCsv(`bulk-import-errors-${result.job.id}.csv`, rows);
  }

  const previewColumns: ColumnDef<ParsedRow>[] = [
    { accessorKey: "rowNumber", header: "Row" },
    {
      id: "full_name",
      header: "Name",
      cell: ({ row }) => row.original.data?.full_name ?? (row.original.raw.full_name as string) ?? "—",
    },
    {
      id: "email",
      header: "Email",
      cell: ({ row }) => row.original.data?.email ?? (row.original.raw.email as string) ?? "—",
    },
    {
      id: "primary_role",
      header: "Role",
      cell: ({ row }) => row.original.data?.primary_role ?? "—",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.valid ? (
          <Badge variant="outline" className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> Valid
          </Badge>
        ) : (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3" /> Error
          </Badge>
        ),
    },
    {
      id: "errors",
      header: "Reason",
      cell: ({ row }) => row.original.errors.join("; ") || "—",
    },
  ];

  return (
    <div className="space-y-6">
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload employee sheet</CardTitle>
            <CardDescription>
              Upload a .xlsx or .csv file with columns: Full Name, Email, Primary Role, Designation (optional),
              Reporting Manager Email (optional). No invite email is sent — employees activate via Forgot Password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {seatLimit?.reached && (
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Seat limit reached ({seatLimit.used}/{seatLimit.limit}). Contact your Admin to add more employees.
              </p>
            )}
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-10 text-center hover:bg-accent/50">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Click to choose a file</span>
              <span className="text-xs text-muted-foreground">.xlsx or .csv</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFile}
              />
            </label>
            <div className="flex justify-between gap-2">
              <Button variant="outline" asChild>
                <Link to="/employees">Cancel</Link>
              </Button>
              <Button variant="outline" onClick={downloadSampleTemplate}>
                <Download className="h-4 w-4" />
                Download sample template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> {fileName}
            </CardTitle>
            <CardDescription>
              {validRows.length} valid row{validRows.length === 1 ? "" : "s"}, {errorRowsCount} error row
              {errorRowsCount === 1 ? "" : "s"} of {parsedRows.length} total.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {wouldExceedSeatLimit && seatLimit && (
              <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Importing all {validRows.length} valid rows would bring your org to {seatsAfterImport} seats, above
                the limit of {seatLimit.limit}. Rows exceeding the seat limit will be rejected individually — you can
                still proceed and review the error report afterward.
              </p>
            )}
            <DataTable columns={previewColumns} data={parsedRows} emptyMessage="No rows parsed." />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Start over
              </Button>
              <Button onClick={handleConfirmImport} disabled={validRows.length === 0 || bulkImport.isPending}>
                {bulkImport.isPending ? "Importing…" : `Import ${validRows.length} employee${validRows.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "results" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Import complete
              <StatusBadge value={result.job.status} toneMap={IMPORT_JOB_STATUS_TONE} />
            </CardTitle>
            <CardDescription>
              {result.job.valid_rows} imported, {result.job.error_rows} failed, out of {result.job.total_rows} total
              rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.errorRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Error rows</p>
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errorRows.map((err) => (
                        <tr key={err.row_number} className="border-t">
                          <td className="p-2">{err.row_number}</td>
                          <td className="p-2">{err.error_reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadErrorReport}>
                  <Download className="h-4 w-4" />
                  Download error report
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>
                Import another file
              </Button>
              <Button asChild>
                <Link to="/employees">Back to employees</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
