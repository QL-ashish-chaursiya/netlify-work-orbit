import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ALLOCATION_STATUS_TONE, humanizeEnum } from "@/lib/status-badges";
import { useAllocationsByProfile } from "@/features/allocations/hooks/useAllocationsByProfile";
import { useProfileDetail, useProfileSkills } from "@/features/allocations/hooks/useLookups";
import { AllocationRequestForm } from "@/features/allocations/components/AllocationRequestForm";

interface ResourceProfileDrawerProps {
  profileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResourceProfileDrawer({ profileId, open, onOpenChange }: ResourceProfileDrawerProps) {
  const { data: profile } = useProfileDetail(profileId);
  const { data: skills, isLoading: skillsLoading } = useProfileSkills(profileId);
  const { data: allocations, isLoading: allocationsLoading } = useAllocationsByProfile(profileId ?? undefined);

  const activePercent = (allocations ?? [])
    .filter((a) => a.status === "active")
    .reduce((sum, a) => sum + Number(a.allocation_percent), 0);
  const isOverAllocated = activePercent > 100;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{profile?.full_name ?? "Resource profile"}</SheetTitle>
          <SheetDescription>
            {profile?.designation ?? humanizeEnum(profile?.primary_role ?? "")}
          </SheetDescription>
        </SheetHeader>

        {profileId && (
          <AllocationRequestForm
            defaultProfileId={profileId}
            trigger={<Button className="mt-4 w-full">Raise allocation request for this resource</Button>}
          />
        )}

        <div className="mt-6 space-y-6">
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Utilization</h3>
              <Badge variant={isOverAllocated ? "destructive" : "secondary"}>
                {activePercent}% {isOverAllocated ? "— over-allocated" : "allocated"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Sum of allocation_percent across this profile's active allocations.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Skills</h3>
            {skillsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : skills && skills.length > 0 ? (
              <ul className="space-y-1">
                {skills.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span>
                      {s.name}
                      {s.category ? <span className="text-muted-foreground"> · {s.category}</span> : null}
                    </span>
                    <span className="text-muted-foreground">
                      {s.experienceYears != null ? `${s.experienceYears} yrs` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="No skills recorded." />
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Allocations</h3>
            {allocationsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : allocations && allocations.length > 0 ? (
              <ul className="space-y-2">
                {allocations.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <div>
                      <p className="font-medium">{a.allocation_percent}%</p>
                      <p className="text-muted-foreground">
                        {a.start_date} → {a.expected_completion_date ?? "open-ended"}
                      </p>
                    </div>
                    <StatusBadge value={a.status} toneMap={ALLOCATION_STATUS_TONE} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="No allocations yet." />
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
