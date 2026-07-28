import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoleRequirements } from "@/features/projects/hooks/useRoleRequirements";
import { useSkills } from "@/features/projects/hooks/useSkills";

interface RoleRequirementsListProps {
  projectId: string;
}

export function RoleRequirementsList({ projectId }: RoleRequirementsListProps) {
  const { data: requirements, isLoading } = useRoleRequirements(projectId);
  const { data: skills } = useSkills();

  const skillNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const skill of skills ?? []) map.set(skill.id, skill.name);
    return map;
  }, [skills]);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!requirements?.length) {
    return <EmptyState message="No role requirements yet" description="Add one to start staffing this project." />;
  }

  return (
    <div className="space-y-2">
      {requirements.map((req) => (
        <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
          <div>
            <p className="font-medium">{req.title}</p>
            <p className="text-sm text-muted-foreground">
              Headcount: {req.headcount} · Status: {req.status}
            </p>
            {req.required_skills.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {req.required_skills.map((skillId) => (
                  <Badge key={skillId} variant="secondary" className="text-xs">
                    {skillNameById.get(skillId) ?? "Unknown skill"}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
