import { z } from "zod";

// Sentinel used by the Settings form's business-function <Select> to represent
// "org-wide default" (business_function_id = null) — Radix Select item values
// can't be an empty string, so we translate this back to null on submit/reset.
export const ORG_WIDE_THRESHOLD_VALUE = "__org_wide__";

// business_function_id: null (or omitted) = the org-wide default row in
// idle_thresholds; a uuid = a per-business-function override.
export const idleThresholdSchema = z.object({
  business_function_id: z.string().uuid().nullable().optional(),
  threshold_percent: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Must be at least 0")
    .max(100, "Must be at most 100")
    .default(70),
});
export type IdleThresholdInput = z.infer<typeof idleThresholdSchema>;

// Fallback used when an org has configured no idle_thresholds rows at all yet
// (neither an org-wide default nor a per-function override) — mirrors the
// schema's own `threshold_percent numeric(5,2) not null default 70`.
export const FALLBACK_IDLE_THRESHOLD_PERCENT = 70;

export interface UtilizationRow {
  profileId: string;
  fullName: string;
  businessFunctionId: string | null;
  utilizationPercent: number;
  isOverAllocated: boolean;
}

export interface BenchRow extends UtilizationRow {
  thresholdPercent: number;
}

export interface MonthlyUtilizationPoint {
  /** "2026-07" — stable sort/dedupe key */
  month: string;
  /** "Jul 2026" — chart-friendly label */
  label: string;
  averageUtilizationPercent: number;
}
