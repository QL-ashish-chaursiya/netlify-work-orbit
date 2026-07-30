import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActivityFeed } from "@/features/dashboard/components/ActivityFeed";
import { useRecentActivity } from "@/features/dashboard/hooks/useRecentActivity";

interface RecentActivityCardProps {
  projectIds?: string[];
  includePocs?: boolean;
}

export function RecentActivityCard({ projectIds, includePocs = true }: RecentActivityCardProps) {
  const { data: items, isLoading } = useRecentActivity({ limit: 8, projectIds, includePocs });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
        <CardDescription>Allocation decisions and outcomes as they happen</CardDescription>
      </CardHeader>
      <CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : <ActivityFeed items={items ?? []} />}</CardContent>
    </Card>
  );
}
