import type { UserRole } from "@/lib/database.types";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Search,
  ClipboardCheck,
  CalendarClock,
  BarChart3,
  Target,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[]; // which primary roles see this item (defense-in-depth only)
}

const ALL_ROLES: UserRole[] = [
  "admin",
  "resource_manager",
  "project_manager",
  "tech_lead",
  "team_member",
  "sales_lead",
];

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
  { label: "Employees", href: "/employees", icon: Users, roles: ["admin"] },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
    roles: ["admin", "project_manager", "resource_manager", "tech_lead"],
  },
  {
    label: "Expertise Search",
    href: "/expertise-search",
    icon: Search,
    roles: ["admin", "project_manager", "tech_lead", "resource_manager"],
  },
  {
    label: "Approval Queue",
    href: "/approvals",
    icon: ClipboardCheck,
    roles: ["admin", "resource_manager"],
  },
  {
    label: "Release Calendar",
    href: "/release-calendar",
    icon: CalendarClock,
    roles: ["admin", "project_manager", "tech_lead", "resource_manager"],
  },
  {
    label: "Reporting",
    href: "/reporting",
    icon: BarChart3,
    roles: ["admin", "resource_manager", "project_manager"],
  },
  {
    label: "Sales POCs",
    href: "/pocs",
    icon: Target,
    roles: ["admin", "sales_lead"],
  },
  { label: "Notifications", href: "/notifications", icon: Bell, roles: ALL_ROLES },
];
