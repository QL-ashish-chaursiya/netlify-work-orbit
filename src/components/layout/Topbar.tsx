import type { ReactNode } from "react";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUIStore } from "@/store/useUIStore";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { useLogout } from "@/features/auth/hooks/useAuthMutations";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";

interface TopbarProps {
  rightSlot?: ReactNode;
}

export function Topbar({ rightSlot }: TopbarProps) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { profile } = useAuthRole();
  const logout = useLogout();

  const initials = profile?.full_name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <Button variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-3">
        <RoleSwitcher />
        {rightSlot}
        <Avatar>
          <AvatarFallback>{initials ?? "?"}</AvatarFallback>
        </Avatar>
        <Button variant="ghost" size="icon" onClick={() => logout.mutate()} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
