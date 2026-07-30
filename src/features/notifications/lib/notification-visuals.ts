import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Bell, CalendarClock, ClipboardCheck, FolderKanban, Target, UserCheck, Users, XCircle } from "lucide-react";
import { TONE_CLASSES, type BadgeTone } from "@/lib/status-badges";

interface NotificationVisual {
  icon: LucideIcon;
  toneClass: string;
}

// Ordered rules, first match wins — mirrors the `type` values the
// notification triggers (migrations 0006-0008) actually insert.
const RULES: [test: (type: string) => boolean, icon: LucideIcon, tone: BadgeTone][] = [
  [(t) => t === "allocation_request_rejected", XCircle, "red"],
  [(t) => t === "allocation_request_conflict", AlertTriangle, "amber"],
  [(t) => t === "allocation_request_approved" || t === "allocation_assigned" || t === "allocation_extended", UserCheck, "green"],
  [(t) => t.startsWith("allocation"), ClipboardCheck, "blue"],
  [(t) => t === "project_owner_added", FolderKanban, "purple"],
  [(t) => t === "reporting_manager_assigned", Users, "blue"],
  [(t) => t.startsWith("poc_"), Target, "purple"],
  [(t) => t === "release_reminder", CalendarClock, "amber"],
];

export function getNotificationVisual(type: string): NotificationVisual {
  const match = RULES.find(([test]) => test(type));
  const [, icon, tone] = match ?? [undefined, Bell, "gray" as BadgeTone];
  return { icon, toneClass: TONE_CLASSES[tone] };
}
