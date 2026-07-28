import { Badge } from "@/components/ui/badge";
import { TONE_CLASSES, humanizeEnum, type BadgeTone } from "@/lib/status-badges";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  value: string;
  toneMap: Record<string, BadgeTone>;
  className?: string;
}

export function StatusBadge({ value, toneMap, className }: StatusBadgeProps) {
  const tone = toneMap[value] ?? "gray";
  return (
    <Badge variant="outline" className={cn("border-transparent", TONE_CLASSES[tone], className)}>
      {humanizeEnum(value)}
    </Badge>
  );
}
