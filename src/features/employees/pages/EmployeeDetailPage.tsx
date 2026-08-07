import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ACCOUNT_STATUS_TONE, ALLOCATION_STATUS_TONE, PROJECT_STATUS_TONE, humanizeEnum } from "@/lib/status-badges";
import { useEmployeeDetail, type EmployeeAllocationRow } from "@/features/employees/hooks/useEmployeeDetail";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function AllocationRow({ row }: { row: EmployeeAllocationRow }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link to={`/projects/${row.projectId}`} className="font-medium hover:underline">
            {row.projectName}
          </Link>
          <StatusBadge value={row.projectStatus} toneMap={PROJECT_STATUS_TONE} />
        </div>
        <p className="mt-0.5 text-muted-foreground">
          PM: {row.projectManagerName ?? "Not set"} · Tech Lead: {row.techLeadName ?? "Not set"}
        </p>
        <p className="text-muted-foreground">
          {row.startDate} → {row.endDate ?? "open-ended"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{row.allocationPercent}%</span>
        <StatusBadge value={row.status} toneMap={ALLOCATION_STATUS_TONE} />
      </div>
    </div>
  );
}

// Full detail view for one employee, reached by clicking a name in the
// Resource Directory table — mirrors ProjectDetailPage's shape (back link,
// header, sectioned cards) so the two "detail page" patterns in the app stay
// consistent. Unlike ResourceProfileDrawer (a quick side-panel), this is the
// exhaustive view: identity, org placement, every skill, and the complete
// project history split into current vs past.
export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useEmployeeDetail(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/employees")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resource Directory
        </Button>
        <EmptyState message="Employee not found" description="They may have been removed, or you don't have access." />
      </div>
    );
  }

  const { profile, businessFunctionName, reportingManagerName, skills, currentAllocations, pastAllocations } = data;
  const utilizationPercent = currentAllocations.reduce((sum, a) => sum + a.allocationPercent, 0);
  const isOverAllocated = utilizationPercent > 100;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/employees")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Resource Directory
      </Button>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="h-16 w-16 shrink-0">
          <AvatarFallback className="bg-brand-blue text-lg text-white">{initials(profile.full_name)}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{profile.full_name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{profile.designation ?? humanizeEnum(profile.primary_role)}</span>
            <span>·</span>
            <span>{profile.email}</span>
            <StatusBadge value={profile.status} toneMap={ACCOUNT_STATUS_TONE} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-medium">{humanizeEnum(profile.primary_role)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Business function
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-medium">{businessFunctionName ?? "Not set"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reporting manager
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-medium">{reportingManagerName ?? "Not set"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={isOverAllocated ? "destructive" : "secondary"}>
              {utilizationPercent}% {isOverAllocated ? "— over-allocated" : "allocated"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {skills.length > 0 ? (
            <ul className="space-y-1">
              {skills.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span>
                    {s.name}
                    {s.category ? <span className="text-muted-foreground"> · {s.category}</span> : null}
                  </span>
                  <span className="text-muted-foreground">{s.experienceYears != null ? `${s.experienceYears} yrs` : "—"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No skills recorded." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current projects</CardTitle>
        </CardHeader>
        <CardContent>
          {currentAllocations.length > 0 ? (
            <div className="space-y-2">
              {currentAllocations.map((row) => (
                <AllocationRow key={row.id} row={row} />
              ))}
            </div>
          ) : (
            <EmptyState message="Not currently allocated to any project." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Past projects</CardTitle>
        </CardHeader>
        <CardContent>
          {pastAllocations.length > 0 ? (
            <div className="space-y-2">
              {pastAllocations.map((row) => (
                <AllocationRow key={row.id} row={row} />
              ))}
            </div>
          ) : (
            <EmptyState message="No past project history." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
