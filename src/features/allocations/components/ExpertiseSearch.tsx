import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/shared/DataTable";
import { humanizeEnum } from "@/lib/status-badges";
import type { ExpertiseSearchFilters, ExpertiseSearchResult } from "@/features/allocations/types";
import { useExpertiseSearch } from "@/features/allocations/hooks/useExpertiseSearch";
import { useSkillOptions } from "@/features/allocations/hooks/useLookups";
import { ResourceProfileDrawer } from "@/features/allocations/components/ResourceProfileDrawer";

const ANY_SKILL_SENTINEL = "__any__";

export function ExpertiseSearch() {
  const { data: skills } = useSkillOptions();
  const [skillId, setSkillId] = useState<string | undefined>(undefined);
  const [minExperience, setMinExperience] = useState<string>("");
  const [maxUtilization, setMaxUtilization] = useState<string>("");
  const [drawerProfileId, setDrawerProfileId] = useState<string | null>(null);

  const filters: ExpertiseSearchFilters = useMemo(
    () => ({
      skillId,
      minExperience: minExperience ? Number(minExperience) : undefined,
      maxUtilization: maxUtilization ? Number(maxUtilization) : undefined,
    }),
    [skillId, minExperience, maxUtilization],
  );

  const { data: results, isLoading } = useExpertiseSearch(filters);

  const columns: ColumnDef<ExpertiseSearchResult>[] = [
    {
      accessorKey: "full_name",
      header: "Name",
    },
    {
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }) => row.original.designation ?? humanizeEnum(row.original.primary_role),
    },
    {
      id: "skills",
      header: "Top skills",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.skills.slice(0, 4).map((s) => (
            <Badge key={s.id} variant="secondary">
              {s.name}
              {s.experienceYears != null ? ` (${s.experienceYears}y)` : ""}
            </Badge>
          ))}
          {row.original.skills.length === 0 && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      accessorKey: "utilizationPercent",
      header: "Utilization",
      cell: ({ row }) => (
        <Badge variant={row.original.isOverAllocated ? "destructive" : "secondary"}>
          {row.original.utilizationPercent}%{row.original.isOverAllocated ? " over" : ""}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => setDrawerProfileId(row.original.id)}>
          View profile
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-md border p-4">
        <div className="space-y-1">
          <Label>Skill</Label>
          <Select
            value={skillId ?? ANY_SKILL_SENTINEL}
            onValueChange={(value) => setSkillId(value === ANY_SKILL_SENTINEL ? undefined : value)}
          >
            <SelectTrigger className="w-56">
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
          <Label>Min. experience (years)</Label>
          <Input
            type="number"
            min={0}
            className="w-40"
            value={minExperience}
            onChange={(e) => setMinExperience(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Max. utilization (%)</Label>
          <Input
            type="number"
            min={0}
            className="w-40"
            value={maxUtilization}
            onChange={(e) => setMaxUtilization(e.target.value)}
          />
        </div>
        {(skillId || minExperience || maxUtilization) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSkillId(undefined);
              setMinExperience("");
              setMaxUtilization("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={results ?? []}
        isLoading={isLoading}
        searchKey="full_name"
        searchPlaceholder="Search by name…"
        emptyMessage="No resources match these filters."
      />

      <ResourceProfileDrawer
        profileId={drawerProfileId}
        open={!!drawerProfileId}
        onOpenChange={(open) => !open && setDrawerProfileId(null)}
      />
    </div>
  );
}
