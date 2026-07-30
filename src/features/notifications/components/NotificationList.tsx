import { BellOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useMarkAllRead } from "@/features/notifications/hooks/useMarkAllRead";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";

interface NotificationListProps {
  // Bell dropdown: show unread only, so a notification disappears from here
  // the moment it's read (full history stays on the /notifications page —
  // useNotifications() is one shared cache, this just filters the view).
  unreadOnly?: boolean;
}

export function NotificationList({ unreadOnly = false }: NotificationListProps) {
  const { data: notifications, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();

  const unreadCount = notifications?.filter((notification) => notification.read_at === null).length ?? 0;
  const visible = unreadOnly ? (notifications ?? []).filter((n) => n.read_at === null) : notifications ?? [];

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
        ) : visible.length > 0 ? (
          <div className="flex flex-col gap-1">
            {visible.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        ) : (
          <EmptyState
            message={unreadOnly ? "You're all caught up" : "No notifications yet"}
            description={unreadOnly ? "No unread notifications." : "You're all caught up."}
            icon={BellOff}
            className="py-6"
          />
        )}
      </div>

      {unreadOnly && (
        <Link
          to="/notifications"
          className="rounded-md px-1 py-1.5 text-center text-xs font-medium text-primary hover:underline"
        >
          View all notifications
        </Link>
      )}
    </div>
  );
}
