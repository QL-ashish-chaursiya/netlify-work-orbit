import { z } from "zod";
import type { Tables } from "@/lib/database.types";

// PM marks an active allocation planned_for_release with a target date.
export const markForReleaseSchema = z.object({
  planned_release_date: z.string().min(1, "Planned release date is required"),
});
export type MarkForReleaseInput = z.infer<typeof markForReleaseSchema>;

// PM decides to extend rather than release: pulls the allocation back to
// active with a new expected completion date.
export const extendAllocationSchema = z.object({
  new_expected_completion_date: z.string().min(1, "New expected completion date is required"),
});
export type ExtendAllocationInput = z.infer<typeof extendAllocationSchema>;

// database.types.ts ships empty `Relationships` arrays (hand-authored, not
// generated) and `allocations` has two FKs to `profiles` (profile_id,
// created_by), which makes a Supabase embedded select like `profiles(...)`
// ambiguous at the PostgREST layer. Hooks batch-fetch names and merge them in
// client-side instead (see attachAllocationNames.ts — same approach the
// projects feature's useProjectOwners.ts uses for the same reason).
export interface AllocationWithNames extends Tables<"allocations"> {
  profile: Pick<Tables<"profiles">, "id" | "full_name"> | null;
  project: Pick<Tables<"projects">, "id" | "name"> | null;
}
