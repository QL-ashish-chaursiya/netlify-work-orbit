import type { UserRole } from "@/lib/database.types";
import { LayoutGrid, Users, FolderKanban, Search, CheckSquare, Calendar, MapPin, Clock, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// A nav item can carry a live count badge — see Sidebar.tsx for where each
// key's number actually comes from (approval queue size, planned releases,
// bench report size). Optional since most items don't have one.
export type NavBadgeKey = "approvals" | "releases" | "bench";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[]; // which primary roles see this item (defense-in-depth only)
  badgeKey?: NavBadgeKey;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

const ALL_ROLES: UserRole[] = [
  "admin",
  "resource_manager",
  "project_manager",
  "tech_lead",
  "team_member",
  "sales_lead",
];

// Names and 4-section grouping match the reference design 1:1. Each item
// still points at a real, working route with live data — "Resource
// Directory" is the Employees list, "Bench Report" has its own dedicated
// page/route, "Utilization Timeline" still lives on the Reporting page
// pending its own split. "Projects" isn't in the reference at all, but it's
// existing real functionality (project creation, role requirements, status
// lifecycle) with nothing else to reach it from, so it stays in Allocation
// rather than becoming unreachable.
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutGrid, roles: ALL_ROLES }],
  },
  {
    label: "Allocation",
    items: [
      { label: "Resource Directory", href: "/employees", icon: Users, roles: ["admin"] },
      {
        label: "Projects",
        href: "/projects",
        icon: FolderKanban,
        roles: ["admin", "project_manager", "tech_lead"],
      },
      {
        label: "Utilization Timeline",
        href: "/reporting",
        icon: Calendar,
        roles: ["admin", "tech_lead", "project_manager"],
      },
      {
        label: "Release Planning",
        href: "/release-calendar",
        icon: MapPin,
        roles: ["admin", "project_manager", "tech_lead"],
        badgeKey: "releases",
      },
      {
        // Resource Manager doesn't exist as a role in this org — Tech Lead
        // is who allocation requests route to for approval instead (see
        // AllocationRequestForm's "Tech Lead" picker).
        label: "Allocation Requests",
        href: "/approvals",
        icon: CheckSquare,
        roles: ["admin", "tech_lead"],
        badgeKey: "approvals",
      },
    ],
  },
  {
    label: "Discovery",
    items: [
      {
        label: "Expertise Search",
        href: "/expertise-search",
        icon: Search,
        roles: ["admin", "project_manager", "tech_lead"],
      },
      {
        label: "Bench Report",
        href: "/bench-report",
        icon: Clock,
        roles: ["admin", "tech_lead", "project_manager"],
        badgeKey: "bench",
      },
    ],
  },
  {
    label: "Sales",
    items: [{ label: "Sales POC Tracking", href: "/pocs", icon: TrendingUp, roles: ["admin", "sales_lead"] }],
  },
];

// Flat view, kept for anywhere that just needs "every item" regardless of
// section (e.g. RoleRoute-adjacent lookups) — Sidebar itself renders
// NAV_SECTIONS directly.
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);
