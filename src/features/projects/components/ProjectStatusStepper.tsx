import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PROJECT_STATUS_TONE, humanizeEnum } from "@/lib/status-badges";
import { useUpdateProjectStatus } from "@/features/projects/hooks/useUpdateProjectStatus";
import { useProjectActiveAllocationCount } from "@/features/projects/hooks/useProjectActiveAllocationCount";
import type { ProjectStatus, Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

// The linear lifecycle a project moves through. `cancelled` is a side exit
// available from any non-terminal stage rather than part of this line.
const LIFECYCLE_STAGES: ProjectStatus[] = ["draft", "staffing", "in_progress", "releasing", "closed"];

interface ProjectStatusStepperProps {
  project: Tables<"projects">;
}

export function ProjectStatusStepper({ project }: ProjectStatusStepperProps) {
  const updateStatus = useUpdateProjectStatus();
  const { data: activeAllocationCount = 0 } = useProjectActiveAllocationCount(project.id);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const currentIndex = LIFECYCLE_STAGES.indexOf(project.status);
  const isTerminal = project.status === "closed" || project.status === "cancelled";
  const nextStage =
    !isTerminal && currentIndex >= 0 && currentIndex < LIFECYCLE_STAGES.length - 1
      ? LIFECYCLE_STAGES[currentIndex + 1]
      : null;

  // BRD §5 Phase 3 / §7: block closing a project with any active allocation
  // still attached. The guard_project_close Postgres trigger enforces this
  // too (defense in depth) — this check just gives the PM a readable warning
  // before they ever hit that raw error.
  const blockedByActiveAllocations = nextStage === "closed" && activeAllocationCount > 0;

  async function handleAdvance() {
    if (!nextStage || blockedByActiveAllocations) return;
    try {
      await updateStatus.mutateAsync({ id: project.id, status: nextStage, organizationId: project.organization_id });
      toast.success(`Project moved to ${humanizeEnum(nextStage)}.`);
    } catch (err) {
      // Surfaces the trigger's message verbatim if the DB-side guard fires
      // despite the UI-side check (e.g. a stale allocation count).
      toast.error(err instanceof Error ? err.message : "Could not update project status");
    }
  }

  async function handleCancel() {
    try {
      await updateStatus.mutateAsync({ id: project.id, status: "cancelled", organizationId: project.organization_id });
      toast.success("Project cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel project");
    } finally {
      setConfirmCancelOpen(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        {LIFECYCLE_STAGES.map((stage, index) => (
          <div key={stage} className="flex items-center gap-2">
            <StatusBadge
              value={stage}
              toneMap={PROJECT_STATUS_TONE}
              className={cn(
                index === currentIndex && project.status !== "cancelled" && "ring-2 ring-primary ring-offset-1",
                index > currentIndex && "opacity-40",
              )}
            />
            {index < LIFECYCLE_STAGES.length - 1 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
        {project.status === "cancelled" && (
          <>
            <span className="text-muted-foreground">·</span>
            <StatusBadge value="cancelled" toneMap={PROJECT_STATUS_TONE} className="ring-2 ring-primary ring-offset-1" />
          </>
        )}
      </div>

      {!isTerminal && (
        <div className="flex flex-wrap items-center gap-3">
          {nextStage && (
            <Button size="sm" onClick={handleAdvance} disabled={updateStatus.isPending || blockedByActiveAllocations}>
              {updateStatus.isPending ? "Updating…" : `Move to ${humanizeEnum(nextStage)}`}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmCancelOpen(true)}
            disabled={updateStatus.isPending}
          >
            Cancel project
          </Button>
          {blockedByActiveAllocations && (
            <p className="text-sm text-destructive">
              Cannot close — {activeAllocationCount} allocation{activeAllocationCount === 1 ? "" : "s"} still active.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title="Cancel this project?"
        description="The project will be marked as cancelled. This does not delete any of its data."
        confirmLabel="Cancel project"
        destructive
        isPending={updateStatus.isPending}
        onConfirm={handleCancel}
      />
    </div>
  );
}
