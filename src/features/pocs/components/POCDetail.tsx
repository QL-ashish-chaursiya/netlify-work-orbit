import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { POC_OUTCOME_TONE } from "@/lib/status-badges";
import { usePoc } from "@/features/pocs/hooks/usePoc";
import { usePocMilestones } from "@/features/pocs/hooks/usePocMilestones";
import { getPocAttachmentUrl } from "@/features/pocs/hooks/useUploadPocAttachment";
import { useSetPocOutcome } from "@/features/pocs/hooks/useSetPocOutcome";
import { useAddPocResource } from "@/features/pocs/hooks/useAddPocResource";
import { useRemovePocResource } from "@/features/pocs/hooks/useRemovePocResource";
import { useBusinessFunctions } from "@/features/org/hooks/useBusinessFunctions";
// Reused read-only from the employees feature (org profile directory) — same
// cross-feature-lookup rationale as useBusinessFunctions: this module owns no
// employees code, it just needs "who can be added as an engaged resource."
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { setOutcomeSchema, POC_OUTCOME_VALUES, type SetOutcomeInput } from "@/features/pocs/types";
import { ConvertToProjectDialog } from "@/features/pocs/components/ConvertToProjectDialog";
import { humanizeEnum } from "@/lib/status-badges";

interface POCDetailProps {
  pocId: string;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function POCDetail({ pocId }: POCDetailProps) {
  const { data: poc, isLoading } = usePoc(pocId);
  const { data: businessFunctions } = useBusinessFunctions();
  const { data: employees } = useEmployees();
  const { data: milestones } = usePocMilestones(pocId);

  const setOutcome = useSetPocOutcome();
  const addResource = useAddPocResource();
  const removeResource = useRemovePocResource();

  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  const form = useForm<SetOutcomeInput>({
    resolver: zodResolver(setOutcomeSchema),
    values: poc ? { outcome: poc.outcome, outcome_notes: poc.outcome_notes ?? "" } : undefined,
  });

  const businessFunctionName = useMemo(
    () => businessFunctions?.find((bf) => bf.id === poc?.business_function_id)?.name ?? null,
    [businessFunctions, poc?.business_function_id],
  );

  const presalesLeadName = useMemo(
    () => employees?.find((e) => e.id === poc?.presales_lead_id)?.full_name ?? null,
    [employees, poc?.presales_lead_id],
  );

  const availableEmployees = useMemo(() => {
    const engagedIds = new Set((poc?.resources ?? []).map((r) => r.profile_id));
    return (employees ?? []).filter((e) => !engagedIds.has(e.id));
  }, [employees, poc?.resources]);

  async function onSubmitOutcome(values: SetOutcomeInput) {
    try {
      await setOutcome.mutateAsync({ pocId, ...values });
      toast.success("Outcome updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update outcome");
    }
  }

  async function onAddResource() {
    if (!selectedProfileId) return;
    try {
      await addResource.mutateAsync({ pocId, profileId: selectedProfileId });
      toast.success("Resource added.");
      setSelectedProfileId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add resource");
    }
  }

  async function onDownloadAttachment() {
    if (!poc?.attachment_path) return;
    try {
      const url = await getPocAttachmentUrl(poc.attachment_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open the attachment");
    }
  }

  async function onConfirmRemove() {
    if (!removeTarget) return;
    try {
      await removeResource.mutateAsync({ id: removeTarget.id, pocId });
      toast.success("Resource removed.");
      setRemoveTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove resource");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!poc) {
    return <EmptyState message="POC not found" description="It may have been removed, or you don't have access to it." />;
  }

  const canConvert = poc.outcome === "closed_won" && !poc.converted_project_id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{poc.client_name}</h1>
            <StatusBadge value={poc.outcome} toneMap={POC_OUTCOME_TONE} />
          </div>
          {poc.opportunity_name && <p className="text-muted-foreground">{poc.opportunity_name}</p>}
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-4">
            <div>
              <dt className="font-medium text-foreground">Business function</dt>
              <dd>{businessFunctionName ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Presales / Sales lead</dt>
              <dd>{presalesLeadName ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Requirement</dt>
              <dd>{poc.requirement ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Priority</dt>
              <dd>{humanizeEnum(poc.priority)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Start date</dt>
              <dd>{poc.start_date ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Target close date</dt>
              <dd>{poc.end_date ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Logged</dt>
              <dd>{new Date(poc.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
          {poc.attachment_name && (
            <Button variant="link" className="mt-1 h-auto p-0 text-sm" onClick={onDownloadAttachment}>
              <Paperclip className="h-3.5 w-3.5" /> {poc.attachment_name}
            </Button>
          )}
          {poc.justification && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Justification: </span>
              {poc.justification}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {poc.converted_project_id ? (
            <Button asChild variant="outline">
              <Link to={`/projects/${poc.converted_project_id}`}>View converted project</Link>
            </Button>
          ) : (
            canConvert && <Button onClick={() => setConvertOpen(true)}>Convert to Project</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outcome</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitOutcome)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an outcome" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {POC_OUTCOME_VALUES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {humanizeEnum(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="outcome_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Why did this close won/lost?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={setOutcome.isPending || !form.formState.isDirty}>
                  {setOutcome.isPending ? "Saving…" : "Save outcome"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engaged resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {poc.resources.length ? (
              <ul className="space-y-2">
                {poc.resources.map((resource) => (
                  <li key={resource.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarFallback>{initialsOf(resource.profile?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{resource.profile?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{resource.profile?.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove resource"
                      onClick={() => setRemoveTarget({ id: resource.id, label: resource.profile?.full_name ?? "this resource" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No resources engaged on this POC yet.</p>
            )}

            <div className="flex items-center gap-2 border-t pt-4">
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a resource to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.length ? (
                    availableEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No more resources to add</div>
                  )}
                </SelectContent>
              </Select>
              <Button onClick={onAddResource} disabled={!selectedProfileId || addResource.isPending}>
                {addResource.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {milestones && milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Effort by milestone / feature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left font-semibold">Milestone / Feature</th>
                    <th className="px-3 py-2 text-right font-semibold">Backend</th>
                    <th className="px-3 py-2 text-right font-semibold">Frontend</th>
                    <th className="px-3 py-2 text-right font-semibold">Design</th>
                    <th className="px-3 py-2 text-right font-semibold">DevOps</th>
                    <th className="px-3 py-2 text-right font-semibold">PM</th>
                    <th className="px-3 py-2 text-right font-semibold">QA</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {milestones.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2">{m.name}</td>
                      <td className="px-3 py-2 text-right">{m.backend_days}</td>
                      <td className="px-3 py-2 text-right">{m.frontend_days}</td>
                      <td className="px-3 py-2 text-right">{m.design_days}</td>
                      <td className="px-3 py-2 text-right">{m.devops_days}</td>
                      <td className="px-3 py-2 text-right">{m.pm_days}</td>
                      <td className="px-3 py-2 text-right">{m.qa_days}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {m.backend_days + m.frontend_days + m.design_days + m.devops_days + m.pm_days + m.qa_days}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove resource"
        description={`Remove ${removeTarget?.label ?? "this resource"} from this POC?`}
        confirmLabel="Remove"
        destructive
        isPending={removeResource.isPending}
        onConfirm={onConfirmRemove}
      />

      <ConvertToProjectDialog poc={poc} open={convertOpen} onOpenChange={setConvertOpen} />
    </div>
  );
}
