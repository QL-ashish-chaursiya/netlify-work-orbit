import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
// Hidden until the db-assistant edge function is deployed — re-enable this
// import + the <AssistantWidget /> mount below once it's live.
// import { AssistantWidget } from "@/features/assistant/components/AssistantWidget";

interface AppShellProps {
  children: ReactNode;
  topbarRightSlot?: ReactNode;
}

export function AppShell({ children, topbarRightSlot }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar
          rightSlot={
            <>
              {topbarRightSlot}
              <NotificationBell />
            </>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      {/* <AssistantWidget /> */}
    </div>
  );
}
