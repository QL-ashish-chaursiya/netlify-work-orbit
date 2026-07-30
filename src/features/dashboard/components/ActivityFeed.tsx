import { formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Inbox } from "lucide-react";

export interface ActivityItem {
  id: string;
  icon: LucideIcon;
  toneClass: string;
  prefix: string;
  subject: string;
  suffix: string;
  timestamp: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  emptyMessage?: string;
}

export function ActivityFeed({ items, emptyMessage = "No recent activity." }: ActivityFeedProps) {
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} icon={Inbox} className="py-10" />;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.toneClass}`}>
            <item.icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm leading-snug text-foreground">
              {item.prefix}
              <strong className="font-semibold">{item.subject}</strong>
              {item.suffix}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
