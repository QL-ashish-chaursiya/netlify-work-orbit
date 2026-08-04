import { z } from "zod";

const emptyToUndefined = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);

// New projects can be created without dates, but they now capture a short
// description plus assigned PM / RM ownership up front.
export const createProjectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  code: z.string().optional(),
  client_name: z.string().optional(),
  description: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  project_manager_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  resource_manager_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
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
