import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ChevronRight, Download, Paperclip, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  createPocSchema,
  pocMilestoneDraftSchema,
  POC_PRIORITY_VALUES,
  type CreatePocInput,
  type PocMilestoneDraft,
} from "@/features/pocs/types";
import { useCreatePoc } from "@/features/pocs/hooks/useCreatePoc";
import { useCreatePocMilestones } from "@/features/pocs/hooks/usePocMilestones";
import { useUploadPocAttachment } from "@/features/pocs/hooks/useUploadPocAttachment";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { useEmployees } from "@/features/employees/hooks/useEmployees";

const NO_PRESALES_LEAD = "none";

const PRIORITY_META: Record<(typeof POC_PRIORITY_VALUES)[number], { label: string; dot: string; active: string }> = {
  normal: { label: "Normal", dot: "bg-muted-foreground/50", active: "border-foreground/30 bg-muted" },
  high: { label: "High", dot: "bg-amber-500", active: "border-amber-300 bg-amber-50 text-amber-800" },
  urgent: { label: "Urgent", dot: "bg-rose-500", active: "border-rose-300 bg-rose-50 text-rose-800" },
};

const EFFORT_COLUMNS = [
  { key: "backend_days", label: "Backend" },
  { key: "frontend_days", label: "Frontend" },
  { key: "design_days", label: "Design" },
  { key: "devops_days", label: "DevOps" },
  { key: "pm_days", label: "PM" },
  { key: "qa_days", label: "QA" },
] as const;

function milestoneTotal(m: PocMilestoneDraft) {
  return m.backend_days + m.frontend_days + m.design_days + m.devops_days + m.pm_days + m.qa_days;
}

const emptyMilestoneDraft: Record<string, string> = {
  name: "",
  backend_days: "0",
  frontend_days: "0",
  design_days: "0",
  devops_days: "0",
  pm_days: "0",
  qa_days: "0",
};

function downloadMilestonesCsv(milestones: PocMilestoneDraft[]) {
  const rows = milestones.map((m) => ({
    "Milestone / Feature": m.name,
    Backend: m.backend_days,
    Frontend: m.frontend_days,
    Design: m.design_days,
    DevOps: m.devops_days,
    PM: m.pm_days,
    QA: m.qa_days,
    Total: milestoneTotal(m),
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Milestones");
  XLSX.writeFile(workbook, "poc-milestone-effort.csv");
}

export function LogPocPage() {
  const navigate = useNavigate();
  const { profile } = useAuthRole();
  const { data: employees } = useEmployees();
  const createPoc = useCreatePoc();
  const createMilestones = useCreatePocMilestones();
  const uploadAttachment = useUploadPocAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [milestones, setMilestones] = useState<PocMilestoneDraft[]>([]);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneDraft, setMilestoneDraft] = useState<Record<string, string>>(emptyMilestoneDraft);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const form = useForm<CreatePocInput>({
    resolver: zodResolver(createPocSchema),
    defaultValues: {
      client_name: "",
      opportunity_name: "",
      requirement: "",
      presales_lead_id: undefined,
      start_date: "",
      end_date: "",
      priority: "normal",
      justification: "",
    },
  });

  const totalEffort = milestones.reduce((sum, m) => sum + milestoneTotal(m), 0);
  const isSubmitting = createPoc.isPending || createMilestones.isPending || uploadAttachment.isPending;

  function confirmMilestone() {
    const parsed = pocMilestoneDraftSchema.safeParse(milestoneDraft);
    if (!parsed.success) {
      setMilestoneError(parsed.error.issues[0]?.message ?? "Invalid milestone");
      return;
    }
    setMilestones((prev) => [...prev, parsed.data]);
    setMilestoneDraft(emptyMilestoneDraft);
    setMilestoneError(null);
    setAddingMilestone(false);
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: CreatePocInput) {
    try {
      const poc = await createPoc.mutateAsync(values);
      if (milestones.length > 0) {
        await createMilestones.mutateAsync({ pocId: poc.id, milestones });
      }
      if (attachedFile && profile) {
        try {
          await uploadAttachment.mutateAsync({ pocId: poc.id, organizationId: profile.organization_id, file: attachedFile });
        } catch (err) {
          // The POC (and any milestones) are already saved at this point —
          // a failed attachment upload shouldn't block navigation, just
          // surface separately so it's obvious the file didn't make it.
          toast.error(err instanceof Error ? `Attachment upload failed: ${err.message}` : "Attachment upload failed");
        }
      }
      toast.success(`POC for "${poc.client_name}" logged.`);
      navigate(`/pocs/${poc.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log POC");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/pocs" className="hover:text-foreground hover:underline">
          Sales POCs
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Log New POC</span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle className="text-base">POC / Project Details</CardTitle>
              <p className="text-xs text-muted-foreground">Linked to resource allocations for effort traceability</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="opportunity_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>POC / Project name</FormLabel>
                      <FormControl>
                        <Input placeholder="Project Helix — Presales POC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="client_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <FormControl>
                        <Input placeholder="Vertex Logistics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="requirement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requirement</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What the client needs this POC to prove out" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="presales_lead_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presales / Sales lead</FormLabel>
                      <Select
                        value={field.value ?? NO_PRESALES_LEAD}
                        onValueChange={(value) => field.onChange(value === NO_PRESALES_LEAD ? undefined : value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a presales / sales lead" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_PRESALES_LEAD}>Unassigned</SelectItem>
                          {employees?.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start date</FormLabel>
                      <FormControl>
                        <DatePicker {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target close date</FormLabel>
                      <FormControl>
                        <DatePicker {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <div className="flex gap-2">
                      {POC_PRIORITY_VALUES.map((value) => {
                        const meta = PRIORITY_META[value];
                        const active = field.value === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                              active ? meta.active : "border-input text-muted-foreground hover:bg-muted",
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Required Business Document</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-4 w-4" /> Attach document
                  </Button>
                  {attachedFile && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {attachedFile.name}
                      <button
                        type="button"
                        aria-label="Remove attachment"
                        onClick={() => {
                          setAttachedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Effort by Milestone / Feature</CardTitle>
                <p className="text-xs text-muted-foreground">Person-days per role</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={milestones.length === 0}
                onClick={() => downloadMilestonesCsv(milestones)}
              >
                <Download className="h-4 w-4" /> Download CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {milestones.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 text-left font-semibold">Milestone / Feature</th>
                        {EFFORT_COLUMNS.map((col) => (
                          <th key={col.key} className="px-3 py-2 text-right font-semibold">
                            {col.label}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right font-semibold">Total</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {milestones.map((m, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{m.name}</td>
                          {EFFORT_COLUMNS.map((col) => (
                            <td key={col.key} className="px-3 py-2 text-right text-primary">
                              {m[col.key]}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right font-medium">{milestoneTotal(m)}</td>
                          <td className="px-1 py-2 text-right">
                            <button
                              type="button"
                              aria-label="Remove milestone"
                              onClick={() => removeMilestone(i)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30 font-semibold">
                        <td className="px-3 py-2">Total effort</td>
                        {EFFORT_COLUMNS.map((col) => (
                          <td key={col.key} className="px-3 py-2 text-right">
                            {milestones.reduce((sum, m) => sum + m[col.key], 0)}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">{totalEffort}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {addingMilestone ? (
                <div className="space-y-3 rounded-md border p-3">
                  <Input
                    placeholder="Milestone / feature name"
                    value={milestoneDraft.name}
                    onChange={(e) => setMilestoneDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {EFFORT_COLUMNS.map((col) => (
                      <div key={col.key} className="space-y-1">
                        <label className="text-xs text-muted-foreground">{col.label}</label>
                        <Input
                          type="number"
                          min={0}
                          step="0.5"
                          value={milestoneDraft[col.key]}
                          onChange={(e) => setMilestoneDraft((d) => ({ ...d, [col.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  {milestoneError && <p className="text-sm text-destructive">{milestoneError}</p>}
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={confirmMilestone}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingMilestone(false);
                        setMilestoneDraft(emptyMilestoneDraft);
                        setMilestoneError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setAddingMilestone(true)}>
                  <Plus className="h-4 w-4" /> Add Milestone / Feature
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Justification / Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="justification"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Presales POC to validate Kubernetes/Terraform automation ahead of Aug renewal discussion."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Logging…" : "Log POC →"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/pocs")} disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Total effort logged: <span className="font-semibold text-foreground">{totalEffort} person-days</span>
              </p>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
