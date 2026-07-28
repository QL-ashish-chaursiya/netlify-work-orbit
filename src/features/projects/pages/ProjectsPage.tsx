import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { ProjectForm } from "@/features/projects/components/ProjectForm";

export function ProjectsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Create and manage projects across your organization.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <ProjectList />

      <ProjectForm open={formOpen} onOpenChange={setFormOpen} onCreated={(id) => navigate(`/projects/${id}`)} />
    </div>
  );
}
