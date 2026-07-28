import { z } from "zod";
import type { Tables } from "@/lib/database.types";

// Mirrors the user_role Postgres enum (schema.sql SECTION 1) — keep in sync
// with database.types.ts's UserRole union.
export const USER_ROLE_VALUES = [
  "admin",
  "resource_manager",
  "project_manager",
  "tech_lead",
  "team_member",
  "sales_lead",
] as const;
export type UserRoleValue = (typeof USER_ROLE_VALUES)[number];

const emptyToUndefined = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);

// Must match the invite-employee edge function's `inputSchema` exactly (see
// supabase/functions/invite-employee/index.ts) — this is Path B (individual add).
export const addEmployeeSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  primary_role: z.enum(USER_ROLE_VALUES, {
    errorMap: () => ({ message: "Select a role" }),
  }),
  designation: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  reporting_manager_id: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
  business_function_id: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
});
export type AddEmployeeInput = z.infer<typeof addEmployeeSchema>;

// One parsed row from a bulk-import CSV/Excel sheet (Path C). Roles arrive as
// free text (e.g. "Resource Manager", "resource-manager") so we normalize
// before checking against the enum. Reporting managers are referenced by
// email since the sheet's row order means the manager's profile id doesn't
// exist yet at parse time — the edge function resolves email -> id.
function normalizeRoleText(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

const trimmedOptional = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const bulkImportRowSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required"),
  email: z.string().trim().email("Invalid email"),
  primary_role: z.preprocess(
    normalizeRoleText,
    z.enum(USER_ROLE_VALUES, { errorMap: () => ({ message: "Unrecognized role" }) }),
  ),
  designation: trimmedOptional,
  reporting_manager_email: z.preprocess(
    emptyToUndefined,
    z.string().trim().email("Reporting manager email is invalid").optional(),
  ),
});
export type BulkImportRow = z.infer<typeof bulkImportRowSchema>;

// One row of a parsed sheet, before/after validation — drives the
// BulkImportWizard's preview table (valid rows vs. per-row error reasons).
export type ParsedRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  valid: boolean;
  errors: string[];
  data?: BulkImportRow;
};

// bulk-import-employees edge function response shape.
export interface BulkImportErrorRow {
  row_number: number;
  raw_data: Record<string, unknown>;
  error_reason: string;
}

export interface BulkImportJobResult {
  job: Tables<"bulk_import_jobs">;
  errorRows: BulkImportErrorRow[];
}

// First-login profile completion (BRD §5 Phase 2) — designation + a dynamic
// list of skills with experience/recency, shown once for non-admins.
export const profileCompletionSchema = z.object({
  designation: trimmedOptional,
  skills: z.array(
    z.object({
      skill_id: z.string().uuid("Select a skill"),
      experience_years: z.preprocess(
        (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
        z.number().min(0, "Must be 0 or more").max(60, "Enter a realistic number of years").optional(),
      ),
      last_used_on: trimmedOptional,
    }),
  ),
});
export type ProfileCompletionInput = z.infer<typeof profileCompletionSchema>;
