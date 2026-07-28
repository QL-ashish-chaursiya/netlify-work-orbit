import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  message: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ message, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-8 text-center", className)}>
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
