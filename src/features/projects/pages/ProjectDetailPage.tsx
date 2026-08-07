import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PROJECT_STATUS_TONE } from "@/lib/status-badges";
import { useProject } from "@/features/projects/hooks/useProject";
import { ProjectStatusStepper } from "@/features/projects/components/ProjectStatusStepper";
import { ProjectOwnersList } from "@/features/projects/components/ProjectOwnersList";
import { ProjectForm } from "@/features/projects/components/ProjectForm";
import { AllocationsForProject } from "@/features/allocations/components/AllocationsForProject";
import { useOrgProfiles } from "@/features/projects/hooks/useOrgProfiles";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id);
  const { data: orgProfiles } = useOrgProfiles("");
  const [editOpen, setEditOpen] = useState(false);

  const profileNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const profile of orgProfiles ?? []) map.set(profile.id, profile.full_name);
    return map;
  }, [orgProfiles]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyState
        message="Project not found"
        description="It may have been removed, or you don't have access to it."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <StatusBadge value={project.status} toneMap={PROJECT_STATUS_TONE} />
          </div>
          <p className="text-sm text-muted-foreground">
            {project.client_name ?? "No client"}
            {project.code ? ` · ${project.code}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {project.planned_start_date ?? "No start date"} – {project.planned_end_date ?? "No end date"}
          </p>
          {project.description ? <p className="max-w-3xl text-sm text-muted-foreground">{project.description}</p> : null}
          <p className="text-sm text-muted-foreground">
            Project manager: {project.project_manager_id ? profileNameById.get(project.project_manager_id) ?? "Unknown" : "Not set"}
          </p>
          <p className="text-sm text-muted-foreground">
            Tech Lead: {project.resource_manager_id ? profileNameById.get(project.resource_manager_id) ?? "Unknown" : "Not set"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit details
        </Button>
      </div>

      <ProjectForm open={editOpen} onOpenChange={setEditOpen} project={project} />

      <ProjectStatusStepper project={project} />

      <ProjectOwnersList projectId={project.id} />

      <AllocationsForProject projectId={project.id} />
    </div>
  );
}
