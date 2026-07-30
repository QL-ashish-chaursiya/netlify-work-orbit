import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ALLOCATION_STATUS_TONE } from "@/lib/status-badges";
import { useUpcomingReleases } from "@/features/dashboard/hooks/useUpcomingReleases";

interface UpcomingReleasesCardProps {
  projectIds?: string[];
  days?: number;
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function UpcomingReleasesCard({ projectIds, days = 14 }: UpcomingReleasesCardProps) {
  const { data: releases, isLoading } = useUpcomingReleases(days, projectIds);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Releases — next {days} days</CardTitle>
          <CardDescription>Flagged for release soon</CardDescription>
        </div>
        <Link to="/release-calendar" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          View calendar <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !releases || releases.length === 0 ? (
          <EmptyState message="Nothing planned for release soon." className="py-8" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Release date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releases.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{r.profile ? initials(r.profile.full_name) : "?"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{r.profile?.full_name ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.project?.name ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    {r.planned_release_date ? format(new Date(r.planned_release_date), "MMM d") : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={r.status} toneMap={ALLOCATION_STATUS_TONE} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
