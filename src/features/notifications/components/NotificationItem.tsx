import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useMarkNotificationRead } from "@/features/notifications/hooks/useMarkNotificationRead";
import { getNotificationVisual } from "@/features/notifications/lib/notification-visuals";
import type { Tables } from "@/lib/database.types";

interface NotificationItemProps {
  notification: Tables<"notifications">;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const markRead = useMarkNotificationRead();
  const isUnread = notification.read_at === null;
  const { icon: Icon, toneClass } = getNotificationVisual(notification.type);

  return (
    <button
      type="button"
      onClick={() => {
        if (isUnread) markRead.mutate(notification.id);
      }}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
        isUnread && "bg-accent/40",
      )}
    >
      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", toneClass)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <p className={cn("truncate leading-snug text-foreground", isUnread && "font-semibold")}>{notification.title}</p>
          {isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
        </div>
        {notification.body && <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}
