// Single source of truth for enum -> badge color across the app (BRD §6:
// "Status badges: consistent color mapping ... define once in a shared constants file").

export type BadgeTone = "amber" | "green" | "red" | "gray" | "blue" | "purple";

export const TONE_CLASSES: Record<BadgeTone, string> = {
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  gray: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

export const ACCOUNT_STATUS_TONE: Record<string, BadgeTone> = {
  invited: "amber",
  pending_activation: "purple",
  active: "green",
  deactivated: "gray",
};

export const PROJECT_STATUS_TONE: Record<string, BadgeTone> = {
  draft: "gray",
  staffing: "amber",
  in_progress: "blue",
  releasing: "purple",
  closed: "gray",
  cancelled: "red",
};

export const ALLOCATION_STATUS_TONE: Record<string, BadgeTone> = {
  soft_reserved: "amber",
  active: "green",
  planned_for_release: "purple",
  released: "gray",
  cancelled: "red",
};

export const REQUEST_STATUS_TONE: Record<string, BadgeTone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  withdrawn: "gray",
  conflict_flagged: "red",
};

export const POC_OUTCOME_TONE: Record<string, BadgeTone> = {
  pending: "amber",
  closed_won: "green",
  closed_lost: "red",
};

export const IMPORT_JOB_STATUS_TONE: Record<string, BadgeTone> = {
  processing: "amber",
  completed: "green",
  completed_with_errors: "amber",
  failed: "red",
};

export function humanizeEnum(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
