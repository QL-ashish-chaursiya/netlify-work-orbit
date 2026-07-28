import { z } from "zod";

// Business function / dates are optional at creation time — a PM may not know
// them yet when spinning up a Draft project (BRD §5 Phase 3).
export const createProjectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  code: z.string().optional(),
  client_name: z.string().optional(),
  business_function_id: z.string().uuid().optional(),
  planned_start_date: z.string().optional(),
  planned_end_date: z.string().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// Role requirements defined by a PM during the Staffing stage.
// required_skills holds skill ids (uuid[] column on project_role_requirements).
export const roleRequirementSchema = z.object({
  title: z.string().min(2, "Title is required"),
  headcount: z.coerce.number().int("Headcount must be a whole number").min(1, "At least 1 headcount is required").default(1),
  required_skills: z.array(z.string().uuid()).default([]),
});
export type RoleRequirementInput = z.infer<typeof roleRequirementSchema>;
