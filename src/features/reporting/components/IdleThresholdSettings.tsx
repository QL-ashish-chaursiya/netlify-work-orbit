import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { useBusinessFunctions } from "@/features/org/hooks/useBusinessFunctions";
import { useIdleThresholds } from "@/features/reporting/hooks/useIdleThresholds";
import { useSetIdleThreshold } from "@/features/reporting/hooks/useSetIdleThreshold";
import { idleThresholdSchema, ORG_WIDE_THRESHOLD_VALUE, type IdleThresholdInput } from "@/features/reporting/types";

export function IdleThresholdSettings() {
  const { hasRole } = useAuthRole();
  const canManage = hasRole("admin") || hasRole("tech_lead");

  const { data: thresholds, isLoading } = useIdleThresholds();
  const { data: businessFunctions } = useBusinessFunctions();
  const setThreshold = useSetIdleThreshold();

  const businessFunctionNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const bf of businessFunctions ?? []) map.set(bf.id, bf.name);
    return map;
  }, [businessFunctions]);

  const form = useForm<IdleThresholdInput>({
    resolver: zodResolver(idleThresholdSchema),
    defaultValues: { business_function_id: null, threshold_percent: 70 },
  });

  function startEdit(businessFunctionId: string | null, thresholdPercent: number) {
    form.reset({ business_function_id: businessFunctionId, threshold_percent: thresholdPercent });
  }

  async function onSubmit(values: IdleThresholdInput) {
    try {
      await setThreshold.mutateAsync(values);
      toast.success("Idle threshold saved.");
      form.reset({ business_function_id: null, threshold_percent: 70 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save threshold");
    }
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Set idle threshold</CardTitle>
            <CardDescription>
              Resources below this utilization % are surfaced on the Bench report. Leave the business function as
              "Org-wide default" to set the fallback used when a function has no override.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-4">
                <FormField
                  control={form.control}
                  name="business_function_id"
                  render={({ field }) => (
                    <FormItem className="w-64">
                      <FormLabel>Business function</FormLabel>
                      <Select
                        value={field.value ?? ORG_WIDE_THRESHOLD_VALUE}
                        onValueChange={(value) => field.onChange(value === ORG_WIDE_THRESHOLD_VALUE ? null : value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Org-wide default" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ORG_WIDE_THRESHOLD_VALUE}>Org-wide default</SelectItem>
                          {(businessFunctions ?? []).map((bf) => (
                            <SelectItem key={bf.id} value={bf.id}>
                              {bf.name}
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
                  name="threshold_percent"
                  render={({ field }) => (
                    <FormItem className="w-40">
                      <FormLabel>Threshold %</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} step={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={setThreshold.isPending}>
                  {setThreshold.isPending ? "Saving…" : "Save threshold"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configured thresholds</CardTitle>
          <CardDescription>The org-wide default and any per-business-function overrides.</CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoading && (!thresholds || thresholds.length === 0) ? (
            <EmptyState message="No thresholds configured yet." description="Falls back to 70% org-wide until set." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Function</TableHead>
                  <TableHead>Threshold %</TableHead>
                  {canManage && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(thresholds ?? []).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {t.business_function_id ? businessFunctionNames.get(t.business_function_id) ?? "—" : "Org-wide default"}
                    </TableCell>
                    <TableCell>{t.threshold_percent}%</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(t.business_function_id, Number(t.threshold_percent))}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
