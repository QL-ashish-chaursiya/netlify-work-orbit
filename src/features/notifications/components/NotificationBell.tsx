import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUnreadCount } from "@/features/notifications/hooks/useUnreadCount";
import { useNotificationRealtimeToast } from "@/features/notifications/hooks/useNotificationRealtimeToast";
import { NotificationList } from "@/features/notifications/components/NotificationList";

// Drop-in for Topbar's `rightSlot` — no required props. Keeps the realtime
// toast subscription active for as long as the bell (i.e. the app shell) is
// mounted.
export function NotificationBell() {
  useNotificationRealtimeToast();
  const unreadCount = useUnreadCount();
  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {badgeLabel}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <NotificationList />
      </PopoverContent>
    </Popover>
  );
}
