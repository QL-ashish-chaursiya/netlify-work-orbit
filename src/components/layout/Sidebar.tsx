import { Link, NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { NAV_SECTIONS, type NavBadgeKey } from "@/components/layout/nav-config";
import { humanizeEnum } from "@/lib/status-badges";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useApprovalQueue } from "@/features/allocations/hooks/useApprovalQueue";
import { useAllocationsPlannedForRelease } from "@/features/release-planning/hooks/useAllocationsPlannedForRelease";
import { useBenchReport } from "@/features/reporting/hooks/useBenchReport";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// Deliberately dark regardless of the app's (light) semantic theme — this is
// the persistent brand rail, styled directly off the raw brand tokens in
// index.css rather than --background/--card, so it doesn't shift if the
// content theme ever changes.
export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const { profile, primaryRole } = useAuthRole();
  const navigate = useNavigate();

  // Same three counts that already back other screens (Approval Queue,
  // Release Calendar, Bench Report) — reused here as nav badges, not
  // recomputed. Each hook is already a no-op until enough auth context
  // exists, so calling them unconditionally is safe regardless of role.
  const { data: approvalQueue } = useApprovalQueue();
  const { data: plannedReleases } = useAllocationsPlannedForRelease();
  const { data: benchRows } = useBenchReport();

  const badgeValues: Record<NavBadgeKey, number | undefined> = {
    approvals: approvalQueue?.length,
    releases: plannedReleases?.length,
    bench: benchRows?.length,
  };

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !primaryRole || item.roles.includes(primaryRole)),
  })).filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-white/10 bg-surface-base transition-all duration-200",
        sidebarOpen ? "w-64" : "w-16",
      )}
    >
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <Link to="/" className={cn("font-semibold text-white", !sidebarOpen && "sr-only")}>
          Work<span className="text-brand-blue-bright">Orbit</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {sections.map((section) => (
          <div key={section.label}>
            <p className={cn("mb-1.5 px-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-white/35", !sidebarOpen && "sr-only")}>
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const badgeValue = item.badgeKey ? badgeValues[item.badgeKey] : undefined;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === "/dashboard"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive ? "bg-brand-blue text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className={cn("flex-1 truncate", !sidebarOpen && "sr-only")}>{item.label}</span>
                    {sidebarOpen && !!badgeValue && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
                        {badgeValue}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {profile && (
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2.5 border-t border-white/10 p-3 text-left hover:bg-white/5"
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-brand-blue text-xs text-white">{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
              <p className="truncate text-xs text-white/50">{primaryRole ? humanizeEnum(primaryRole) : ""}</p>
            </div>
          )}
        </button>
      )}
    </aside>
  );
}
