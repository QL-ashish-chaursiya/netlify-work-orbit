import { ExpertiseSearch } from "@/features/allocations/components/ExpertiseSearch";

export function ExpertiseSearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expertise Search</h1>
        <p className="text-sm text-muted-foreground">
          Find people by skill, experience, and current utilization across the org.
        </p>
      </div>
      <ExpertiseSearch />
    </div>
  );
}
