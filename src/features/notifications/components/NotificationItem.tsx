import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useMarkNotificationRead } from "@/features/notifications/hooks/useMarkNotificationRead";
import type { Tables } from "@/lib/database.types";

interface NotificationItemProps {
  notification: Tables<"notifications">;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const markRead = useMarkNotificationRead();
  const isUnread = notification.read_at === null;

  return (
    <button
      type="button"
      onClick={() => {
        if (isUnread) markRead.mutate(notification.id);
      }}
      className={cn(
        "flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
        isUnread && "bg-accent/40",
      )}
    >
      <div className="flex items-start gap-2">
        {isUnread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
        <div className="flex-1 space-y-0.5">
          <p className={cn("leading-snug text-foreground", isUnread && "font-semibold")}>{notification.title}</p>
          {notification.body && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </button>
  );
}
