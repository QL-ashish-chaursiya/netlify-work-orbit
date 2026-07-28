import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { NAV_ITEMS } from "@/components/layout/nav-config";

// Deliberately dark regardless of the app's (light) semantic theme — this is
// the persistent brand rail, styled directly off the raw brand tokens in
// index.css rather than --background/--card, so it doesn't shift if the
// content theme ever changes.
export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const { primaryRole } = useAuthRole();

  const items = NAV_ITEMS.filter((item) => !primaryRole || item.roles.includes(primaryRole));

  return (
    <aside
      className={cn(
        "shrink-0 border-r border-white/10 bg-surface-base transition-all duration-200",
        sidebarOpen ? "w-56" : "w-16",
      )}
    >
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <span className={cn("font-semibold text-white", !sidebarOpen && "sr-only")}>
          Work<span className="text-brand-blue-bright">Orbit</span>
        </span>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/dashboard"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-brand-blue text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className={cn(!sidebarOpen && "sr-only")}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
