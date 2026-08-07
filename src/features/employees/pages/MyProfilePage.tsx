import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ACCOUNT_STATUS_TONE, ALLOCATION_STATUS_TONE, humanizeEnum } from "@/lib/status-badges";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { useAllocationsByProfile } from "@/features/allocations/hooks/useAllocationsByProfile";
import { useProfileSkills, useSkillOptions, useProfileOptions } from "@/features/allocations/hooks/useLookups";
import { useAddProfileSkill } from "@/features/allocations/hooks/useAddProfileSkill";
import { useBusinessFunctions } from "@/features/org/hooks/useBusinessFunctions";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// The logged-in user's own profile — reachable from the sidebar footer.
// Reuses the same data/hooks as ResourceProfileDrawer (which stays in place
// for viewing OTHER people's profiles from Expertise Search / Bench Report),
// but as a full page with a bit more detail (business function, reporting
// manager, member since) since this is the user's own dedicated view.
export function MyProfilePage() {
  const { profile } = useAuthRole();
  const { data: skills, isLoading: skillsLoading } = useProfileSkills(profile?.id);
  const { data: allocations, isLoading: allocationsLoading } = useAllocationsByProfile(profile?.id);
  const { data: skillOptions } = useSkillOptions();
  const { data: businessFunctions } = useBusinessFunctions();
  const { data: orgProfiles } = useProfileOptions();
  const addProfileSkill = useAddProfileSkill();

  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkillId, setNewSkillId] = useState("");
  const [newSkillYears, setNewSkillYears] = useState("");

  const businessFunctionName = useMemo(
    () => businessFunctions?.find((bf) => bf.id === profile?.business_function_id)?.name,
    [businessFunctions, profile?.business_function_id],
  );
  const reportingManagerName = useMemo(
    () => orgProfiles?.find((p) => p.id === profile?.reporting_manager_id)?.full_name,
    [orgProfiles, profile?.reporting_manager_id],
  );

  const remainingSkillOptions = (skillOptions ?? []).filter(
    (s) => !(skills ?? []).some((existing) => existing.skillId === s.id),
  );

  // Soft-reserved (half allocation) and planned-for-release both still
  // occupy real bandwidth — see the same fix in ResourceProfileDrawer /
  // useUtilizationData; 'active'-only was undercounting half allocations as 0%.
  const activePercent = (allocations ?? [])
    .filter((a) => a.status === "active" || a.status === "soft_reserved" || a.status === "planned_for_release")
    .reduce((sum, a) => sum + Number(a.allocation_percent), 0);
  const isOverAllocated = activePercent > 100;

  async function handleAddSkill() {
    if (!profile || !newSkillId) return;
    try {
      await addProfileSkill.mutateAsync({
        profileId: profile.id,
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

  if (!profile) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              {activePercent}% {isOverAllocated ? "— over-allocated" : "allocated"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Skills</CardTitle>
          {!addingSkill && (
            <Button size="sm" variant="outline" onClick={() => setAddingSkill(true)}>
              <Plus className="h-3.5 w-3.5" /> Add skill
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {addingSkill && (
            <div className="mb-4 space-y-2 rounded-md border p-3">
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
          <CardTitle className="text-base">Allocations</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
