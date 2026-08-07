import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ALLOCATION_STATUS_TONE, humanizeEnum } from "@/lib/status-badges";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { useAllocationsByProfile } from "@/features/allocations/hooks/useAllocationsByProfile";
import { useProfileDetail, useProfileSkills, useSkillOptions } from "@/features/allocations/hooks/useLookups";
import { useAddProfileSkill } from "@/features/allocations/hooks/useAddProfileSkill";
import { AllocationRequestForm } from "@/features/allocations/components/AllocationRequestForm";

interface ResourceProfileDrawerProps {
  profileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResourceProfileDrawer({ profileId, open, onOpenChange }: ResourceProfileDrawerProps) {
  const { profile: currentProfile } = useAuthRole();
  const { data: profile } = useProfileDetail(profileId);
  const { data: skills, isLoading: skillsLoading } = useProfileSkills(profileId);
  const { data: allocations, isLoading: allocationsLoading } = useAllocationsByProfile(profileId ?? undefined);
  const { data: skillOptions } = useSkillOptions();
  const addProfileSkill = useAddProfileSkill();

  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkillId, setNewSkillId] = useState("");
  const [newSkillYears, setNewSkillYears] = useState("");

  // Soft-reserved (half allocation) and planned-for-release both still
  // occupy real bandwidth — same "currently occupying" set used elsewhere
  // (AllocationRequestForm, useUtilizationData) — so they count here too;
  // 'active'-only was undercounting anyone on a half allocation as 0%.
  const activePercent = (allocations ?? [])
    .filter((a) => a.status === "active" || a.status === "soft_reserved" || a.status === "planned_for_release")
    .reduce((sum, a) => sum + Number(a.allocation_percent), 0);
  const isOverAllocated = activePercent > 100;

  // profile_skills_write_self RLS only allows adding to your OWN profile —
  // this is the only place that capability is reachable at all now (the
  // old first-login Profile Completion form was the sole entry point
  // before, with no way back in afterward).
  const isOwnProfile = !!profileId && profileId === currentProfile?.id;
  const remainingSkillOptions = (skillOptions ?? []).filter(
    (s) => !(skills ?? []).some((existing) => existing.skillId === s.id),
  );

  async function handleAddSkill() {
    if (!profileId || !newSkillId) return;
    try {
      await addProfileSkill.mutateAsync({
        profileId,
        skillId: newSkillId,
        experienceYears: newSkillYears ? Number(newSkillYears) : null,
      });
      toast.success("Skill added.");
      setNewSkillId("");
      setNewSkillYears("");
      setAddingSkill(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add skill");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{profile?.full_name ?? "Resource profile"}</SheetTitle>
          <SheetDescription>
            {profile?.designation ?? humanizeEnum(profile?.primary_role ?? "")}
            {profile?.email ? ` · ${profile.email}` : ""}
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
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Skills</h3>
              {isOwnProfile && !addingSkill && (
                <Button size="sm" variant="outline" onClick={() => setAddingSkill(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add skill
                </Button>
              )}
            </div>

            {isOwnProfile && addingSkill && (
              <div className="mb-3 space-y-2 rounded-md border p-3">
                <Select value={newSkillId} onValueChange={setNewSkillId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {remainingSkillOptions.length ? (
                      remainingSkillOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">All skills already added.</div>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  placeholder="Years of experience (optional)"
                  value={newSkillYears}
                  onChange={(e) => setNewSkillYears(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddSkill} disabled={!newSkillId || addProfileSkill.isPending}>
                    {addProfileSkill.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAddingSkill(false);
                      setNewSkillId("");
                      setNewSkillYears("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

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
