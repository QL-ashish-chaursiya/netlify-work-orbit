import { useMemo, useState } from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useMarkAllRead } from "@/features/notifications/hooks/useMarkAllRead";
import { useMarkNotificationRead } from "@/features/notifications/hooks/useMarkNotificationRead";
import { getNotificationVisual } from "@/features/notifications/lib/notification-visuals";
import type { Tables } from "@/lib/database.types";

type Notification = Tables<"notifications">;
type Tab = "all" | "unread";

function groupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function NotificationRow({ notification }: { notification: Notification }) {
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
        "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/60",
        isUnread && "bg-accent/25",
      )}
    >
      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", toneClass)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm text-foreground", isUnread && "font-semibold")}>{notification.title}</p>
          {isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
        </div>
        {notification.body && <p className="text-sm text-muted-foreground">{notification.body}</p>}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}

export function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const [tab, setTab] = useState<Tab>("all");

  const unreadCount = notifications?.filter((n) => n.read_at === null).length ?? 0;
  const visible = tab === "unread" ? (notifications ?? []).filter((n) => n.read_at === null) : notifications ?? [];

  const groups = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const n of visible) {
      const label = groupLabel(n.created_at);
      const list = map.get(label) ?? [];
      list.push(n);
      map.set(label, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" disabled={markAllRead.isPending} onClick={() => markAllRead.mutate()}>
            Mark all read
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              message={tab === "unread" ? "No unread notifications" : "No notifications yet"}
              description="You're all caught up."
              icon={BellOff}
              className="py-16"
            />
          ) : (
            <div className="space-y-6">
              {groups.map(([label, items]) => (
                <div key={label} className="space-y-2">
                  <p className="px-1 font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    {items.map((n, i) => (
                      <div key={n.id} className={cn(i !== 0 && "border-t")}>
                        <NotificationRow notification={n} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
