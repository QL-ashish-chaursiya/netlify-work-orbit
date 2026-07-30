import { z } from "zod";

const emptyToUndefined = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);

// Mirrors the poc_outcome Postgres enum (schema.sql SECTION 9) — keep in sync
// with database.types.ts's PocOutcome union.
export const POC_OUTCOME_VALUES = ["pending", "closed_won", "closed_lost"] as const;

// Mirrors the poc_priority Postgres enum (migration 0009) — keep in sync with
// database.types.ts's PocPriority union.
export const POC_PRIORITY_VALUES = ["normal", "high", "urgent"] as const;

// Log POC. Dates/business function/presales lead are optional at creation
// time — a Sales Lead may log a POC before those details are pinned down.
// No `outcome`/status field here by design: every new POC starts 'pending'
// server-side (see useCreatePoc) — the create form never exposes it.
export const createPocSchema = z.object({
  client_name: z.string().min(2, "Client name is required"),
  opportunity_name: z.preprocess(emptyToUndefined, z.string().optional()),
  business_function_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  presales_lead_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  start_date: z.preprocess(emptyToUndefined, z.string().optional()),
  end_date: z.preprocess(emptyToUndefined, z.string().optional()),
  priority: z.enum(POC_PRIORITY_VALUES).default("normal"),
  justification: z.preprocess(emptyToUndefined, z.string().optional()),
});
export type CreatePocInput = z.infer<typeof createPocSchema>;

// A milestone/feature row is staged client-side while the "Log New POC" page
// is being filled out (no poc_id exists yet) and only persisted once the POC
// itself is created — see LogPocPage. Days default to 0 rather than being
// required, since a milestone might only involve one or two disciplines.
export const pocMilestoneDraftSchema = z.object({
  name: z.string().min(2, "Milestone / feature name is required"),
  backend_days: z.coerce.number().min(0).default(0),
  frontend_days: z.coerce.number().min(0).default(0),
  pm_days: z.coerce.number().min(0).default(0),
  qa_days: z.coerce.number().min(0).default(0),
});
export type PocMilestoneDraft = z.infer<typeof pocMilestoneDraftSchema>;

// Set outcome (Pending / Closed-Won / Closed-Lost).
export const setOutcomeSchema = z.object({
  outcome: z.enum(POC_OUTCOME_VALUES, { errorMap: () => ({ message: "Select an outcome" }) }),
  outcome_notes: z.preprocess(emptyToUndefined, z.string().optional()),
});
export type SetOutcomeInput = z.infer<typeof setOutcomeSchema>;

// Closed-Won -> Project conversion. `name` is prefilled from the POC's
// client_name by the dialog but stays a required, user-editable field here.
export const convertToProjectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  code: z.preprocess(emptyToUndefined, z.string().optional()),
  planned_start_date: z.preprocess(emptyToUndefined, z.string().optional()),
  planned_end_date: z.preprocess(emptyToUndefined, z.string().optional()),
});
export type ConvertToProjectInput = z.infer<typeof convertToProjectSchema>;
