import { type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { markForReleaseSchema, type MarkForReleaseInput } from "@/features/release-planning/types";
import { useMarkForRelease } from "@/features/release-planning/hooks/useMarkForRelease";

export interface MarkForReleaseDialogProps {
  /** Allocation to mark planned_for_release. Caller is responsible for only
   * rendering/enabling this on `active` allocations — there's no DB guard. */
  allocationId: string;
  /** The element that opens the dialog, e.g. a <Button>. */
  trigger: ReactNode;
}

// Standalone + reusable: any module holding an allocation row (e.g. the
// Projects & Allocations list) can render this directly with its own
// trigger element, without knowing anything about release-planning internals.
export function MarkForReleaseDialog({ allocationId, trigger }: MarkForReleaseDialogProps) {
  const [open, setOpen] = useState(false);
  const markForRelease = useMarkForRelease();

  const form = useForm<MarkForReleaseInput>({
    resolver: zodResolver(markForReleaseSchema),
    defaultValues: { planned_release_date: "" },
  });

  async function onSubmit(values: MarkForReleaseInput) {
    try {
      await markForRelease.mutateAsync({ allocationId, ...values });
      toast.success("Allocation marked for release.");
      form.reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark allocation for release");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark for release</DialogTitle>
          <DialogDescription>
            Schedule this allocation for release on a target date. It stays active on the project until the release
            is confirmed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="planned_release_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planned release date</FormLabel>
                  <FormControl>
                    <DatePicker {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={markForRelease.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={markForRelease.isPending}>
                {markForRelease.isPending ? "Saving…" : "Mark for release"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
