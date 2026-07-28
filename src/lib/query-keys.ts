// Central query-key factory so invalidations stay consistent across feature hooks.
export const queryKeys = {
  session: ["session"] as const,
  profile: (id: string | undefined) => ["profile", id] as const,

  employees: (orgId: string | undefined) => ["employees", orgId] as const,
  employee: (id: string) => ["employees", "detail", id] as const,
  bulkImportJobs: (orgId: string | undefined) => ["bulk-import-jobs", orgId] as const,

  businessFunctions: (orgId: string | undefined) => ["business-functions", orgId] as const,
  skills: (orgId: string | undefined) => ["skills", orgId] as const,

  projects: (orgId: string | undefined) => ["projects", orgId] as const,
  project: (id: string) => ["projects", "detail", id] as const,
  roleRequirements: (projectId: string) => ["role-requirements", projectId] as const,

  allocations: (orgId: string | undefined) => ["allocations", orgId] as const,
  allocationsByProfile: (profileId: string) => ["allocations", "by-profile", profileId] as const,
  allocationsByProject: (projectId: string) => ["allocations", "by-project", projectId] as const,

  allocationRequests: (orgId: string | undefined) => ["allocation-requests", orgId] as const,
  approvalQueue: (routedTo: string | undefined) => ["allocation-requests", "queue", routedTo] as const,

  expertiseSearch: (filters: unknown) => ["expertise-search", filters] as const,

  utilization: (orgId: string | undefined) => ["utilization", orgId] as const,
  benchReport: (orgId: string | undefined) => ["bench-report", orgId] as const,
  idleThresholds: (orgId: string | undefined) => ["idle-thresholds", orgId] as const,

  pocs: (orgId: string | undefined) => ["pocs", orgId] as const,
  poc: (id: string) => ["pocs", "detail", id] as const,

  notifications: (profileId: string | undefined) => ["notifications", profileId] as const,
};
