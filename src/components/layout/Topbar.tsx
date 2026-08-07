import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const initials = profile?.full_name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await logout.mutateAsync();
    setConfirmOpen(false);
    // Explicit navigation to the public landing page — ProtectedRoute's own
    // no-session redirect would otherwise land on /login instead.
    navigate("/", { replace: true });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <Button variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-3">
        <RoleSwitcher />
        {rightSlot}
        <button type="button" onClick={() => navigate("/profile")} title="View profile">
          <Avatar>
            <AvatarFallback>{initials ?? "?"}</AvatarFallback>
          </Avatar>
        </button>
        <Button variant="ghost" size="icon" onClick={() => setConfirmOpen(true)} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Sign out"
        description="You'll need to sign in again to access your dashboard."
        confirmLabel="Sign out"
        isPending={logout.isPending}
        onConfirm={handleLogout}
      />
    </header>
  );
}
