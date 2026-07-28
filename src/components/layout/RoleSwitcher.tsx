import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { useUserRoles } from "@/features/auth/hooks/useUserRoles";
import { useUIStore } from "@/store/useUIStore";
import { humanizeEnum } from "@/lib/status-badges";

// Pure UI view-switch (Zustand) — does not change auth.role or RLS access,
// only which role's dashboard/nav emphasis is shown. Only rendered when the
// user actually holds more than one role.
export function RoleSwitcher() {
  const { primaryRole } = useAuthRole();
  const { data: additionalRoles } = useUserRoles();
  const activeRoleView = useUIStore((s) => s.activeRoleView);
  const setActiveRoleView = useUIStore((s) => s.setActiveRoleView);

  if (!primaryRole || !additionalRoles || additionalRoles.length === 0) return null;

  const allRoles = [primaryRole, ...additionalRoles.map((r) => r.role)];
  const current = activeRoleView ?? primaryRole;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {humanizeEnum(current)} view
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {allRoles.map((role) => (
          <DropdownMenuItem key={role} onClick={() => setActiveRoleView(role)}>
            {humanizeEnum(role)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
