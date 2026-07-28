import { BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useMarkAllRead } from "@/features/notifications/hooks/useMarkAllRead";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";

export function NotificationList() {
  const { data: notifications, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();

  const unreadCount = notifications?.filter((notification) => notification.read_at === null).length ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-foreground">Notifications</p>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 px-1 py-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="flex flex-col gap-1">
            {notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        ) : (
          <EmptyState message="No notifications yet" description="You're all caught up." icon={BellOff} className="py-6" />
        )}
      </div>
    </div>
  );
}
