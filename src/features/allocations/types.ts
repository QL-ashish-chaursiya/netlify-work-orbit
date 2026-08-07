import { z } from "zod";

export const REQUEST_TYPE_OPTIONS = ["hard_allocation", "soft_reservation"] as const;

// Display labels only — the underlying enum values (hard_allocation /
// soft_reservation) stay as-is in the DB and in useDecideAllocationRequest's
// active/soft_reserved branching. "Full allocation" / "Half allocation" is
// just friendlier wording shown wherever request_type is rendered.
export const REQUEST_TYPE_LABELS: Record<(typeof REQUEST_TYPE_OPTIONS)[number], string> = {
  hard_allocation: "Full allocation",
  soft_reservation: "Half allocation",
};

// A UUID field that's optional in the form: shadcn <Select> can't carry an
// empty-string value (Radix reserves "" to mean "clear selection"), so the
// form layer uses a sentinel ("unassigned"/"open") and strips it before this
// schema ever sees the value — by the time RHF validates, the field is either
// a real uuid or simply absent.
const optionalUuid = z.string().uuid().optional();

export const allocationRequestSchema = z.object({
  project_id: z.string().uuid({ message: "Select a project" }),
  // null / absent means "anyone matching skill X" per schema.sql comment on
  // allocation_requests.requested_profile_id.
  requested_profile_id: optionalUuid,
  resource_manager_id: optionalUuid,
  request_type: z.enum(REQUEST_TYPE_OPTIONS),
  allocation_percent: z.coerce
    .number({ invalid_type_error: "Enter a percentage" })
    .min(1, "Must be at least 1%")
    .max(100, "Cannot exceed 100%"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  justification: z.string().optional(),
});

export type AllocationRequestInput = z.infer<typeof allocationRequestSchema>;

export const decisionSchema = z.object({
  decision_notes: z.string().optional(),
});

export type DecisionInput = z.infer<typeof decisionSchema>;

export interface ExpertiseSearchFilters {
  skillId?: string;
  minExperience?: number;
  maxExperience?: number;
  maxUtilization?: number;
}

export interface ProfileSkillRow {
  id: string;
  skillId: string;
  name: string;
  category: string | null;
  experienceYears: number | null;
  lastUsedOn: string | null;
}

export interface ExpertiseSearchResult {
  id: string;
  full_name: string;
  designation: string | null;
  primary_role: string;
  skills: ProfileSkillRow[];
  utilizationPercent: number;
  isOverAllocated: boolean;
  // Highest experience_years across this profile's (filtered) skills — the
  // schema has no standalone "years of experience" field on profiles.
  experienceYears: number | null;
  // Earliest planned_release_date/expected_completion_date among this
  // profile's active allocations — only meaningful (and only surfaced in the
  // UI) once they're at/over 100% utilization.
  availableFrom: string | null;
}
