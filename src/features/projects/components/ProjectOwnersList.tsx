import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectOwners } from "@/features/projects/hooks/useProjectOwners";
import { useAddProjectOwner } from "@/features/projects/hooks/useAddProjectOwner";
import { useOrgProfiles } from "@/features/projects/hooks/useOrgProfiles";

interface ProjectOwnersListProps {
  projectId: string;
}

export function ProjectOwnersList({ projectId }: ProjectOwnersListProps) {
  const { data: owners, isLoading } = useProjectOwners(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const { data: candidates } = useOrgProfiles(search);
  const addOwner = useAddProjectOwner(projectId);

  const existingOwnerIds = new Set((owners ?? []).map((o) => o.profile_id));
  const options = (candidates ?? []).filter((c) => !existingOwnerIds.has(c.id));
  const looksLikeEmail = search.includes("@");
  const noMatchForEmail = looksLikeEmail && options.length === 0;

  async function handleAdd() {
    if (!selectedProfileId) return;
    try {
      await addOwner.mutateAsync({ profileId: selectedProfileId });
      toast.success("Owner added.");
      setDialogOpen(false);
      setSelectedProfileId("");
      setSearch("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add owner");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Project Owners</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          Add owner
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : owners?.length ? (
          <ul className="space-y-2">
            {owners.map((owner) => (
              <li key={owner.id} className="flex items-center justify-between text-sm">
                <span>
                  {owner.profile?.full_name ?? "Unknown"}{" "}
                  <span className="text-muted-foreground">({owner.profile?.email ?? "—"})</span>
                </span>
                {owner.is_primary && <Badge variant="secondary">Primary</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No owners yet" description="Add a PM or co-owner to manage this project." />
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add project owner</DialogTitle>
            <DialogDescription>Search for a colleague in your organization to add as a co-owner.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {noMatchForEmail && (
              <p className="text-sm text-destructive">No user found with that email address.</p>
            )}
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a person" />
              </SelectTrigger>
              <SelectContent>
                {options.length ? (
                  options.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.full_name} ({candidate.email})
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No matching people found.</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={addOwner.isPending}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selectedProfileId || addOwner.isPending}>
              {addOwner.isPending ? "Adding…" : "Add owner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
