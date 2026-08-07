import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { humanizeEnum } from "@/lib/status-badges";
import type { ExpertiseSearchFilters, ExpertiseSearchResult } from "@/features/allocations/types";
import { useExpertiseSearch } from "@/features/allocations/hooks/useExpertiseSearch";
import { useSkillOptions } from "@/features/allocations/hooks/useLookups";
import { ResourceProfileDrawer } from "@/features/allocations/components/ResourceProfileDrawer";

const ANY_SKILL_SENTINEL = "__any__";
const ANY_EXPERIENCE_SENTINEL = "__any__";

const EXPERIENCE_BANDS = [
  { value: "0-2", label: "0–2 yrs", min: 0, max: 2 },
  { value: "3-6", label: "3–6 yrs", min: 3, max: 6 },
  { value: "7+", label: "7+ yrs", min: 7, max: undefined },
] as const;

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function availabilityBadge(result: ExpertiseSearchResult) {
  if (result.utilizationPercent <= 0) {
    return { label: "Available now", className: "bg-emerald-50 text-emerald-700" };
  }
  if (result.utilizationPercent < 100) {
    return { label: `${100 - result.utilizationPercent}% free`, className: "bg-amber-50 text-amber-700" };
  }
  if (result.availableFrom) {
    return {
      label: `Available ${format(parseISO(result.availableFrom), "MMM d")}`,
      className: "bg-indigo-50 text-indigo-700",
    };
  }
  return { label: "Fully allocated", className: "bg-muted text-muted-foreground" };
}

export function ExpertiseSearch() {
  const { data: skills } = useSkillOptions();
  const [skillId, setSkillId] = useState<string | undefined>(undefined);
  const [experienceBand, setExperienceBand] = useState<string | undefined>(undefined);
  const [maxUtilization, setMaxUtilization] = useState<string>("");
  const [nameQuery, setNameQuery] = useState("");
  const [drawerProfileId, setDrawerProfileId] = useState<string | null>(null);

  const band = EXPERIENCE_BANDS.find((b) => b.value === experienceBand);

  const filters: ExpertiseSearchFilters = useMemo(
    () => ({
      skillId,
      minExperience: band?.min,
      maxExperience: band?.max,
      maxUtilization: maxUtilization ? Number(maxUtilization) : undefined,
    }),
    [skillId, band, maxUtilization],
  );

  const { data: results, isLoading } = useExpertiseSearch(filters);

  const visibleResults = useMemo(() => {
    const list = results ?? [];
    if (!nameQuery.trim()) return list;
    const q = nameQuery.trim().toLowerCase();
    return list.filter((r) => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [results, nameQuery]);

  const hasActiveFilters = !!(skillId || experienceBand || maxUtilization || nameQuery);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <Label>Name or email</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-56 pl-8"
              placeholder="Search by name or email…"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Skill</Label>
          <Select
            value={skillId ?? ANY_SKILL_SENTINEL}
            onValueChange={(value) => setSkillId(value === ANY_SKILL_SENTINEL ? undefined : value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Any skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_SKILL_SENTINEL}>Any skill</SelectItem>
              {(skills ?? []).map((skill) => (
                <SelectItem key={skill.id} value={skill.id}>
                  {skill.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Experience</Label>
          <Select
            value={experienceBand ?? ANY_EXPERIENCE_SENTINEL}
            onValueChange={(value) => setExperienceBand(value === ANY_EXPERIENCE_SENTINEL ? undefined : value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_EXPERIENCE_SENTINEL}>Any</SelectItem>
              {EXPERIENCE_BANDS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Max. utilization (%)</Label>
          <Input
            type="number"
            min={0}
            className="w-32"
            value={maxUtilization}
            onChange={(e) => setMaxUtilization(e.target.value)}
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSkillId(undefined);
              setExperienceBand(undefined);
              setMaxUtilization("");
              setNameQuery("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visibleResults.length === 0 ? (
        <EmptyState message="No resources match these filters." />
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {visibleResults.map((result) => {
            const badge = availabilityBadge(result);
            return (
              <div key={result.id} className="flex items-center gap-4 p-4">
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-[var(--blue-bright)] to-[var(--indigo)] text-sm font-semibold text-white">
                    {initials(result.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{result.full_name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {result.designation ?? humanizeEnum(result.primary_role)}
                    {result.experienceYears != null ? ` · ${result.experienceYears} yrs` : ""}
                    {` · ${result.email}`}
                  </p>
                  {result.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.skills.slice(0, 4).map((s) => (
                        <Badge key={s.id} variant="secondary" className="font-normal">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="outline" onClick={() => setDrawerProfileId(result.id)}>
                  Request
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ResourceProfileDrawer
        profileId={drawerProfileId}
        open={!!drawerProfileId}
        onOpenChange={(open) => !open && setDrawerProfileId(null)}
      />
    </div>
  );
}
