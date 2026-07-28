import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPocSchema, type CreatePocInput } from "@/features/pocs/types";
import { useCreatePoc } from "@/features/pocs/hooks/useCreatePoc";
import { useBusinessFunctions } from "@/features/org/hooks/useBusinessFunctions";

const NO_BUSINESS_FUNCTION = "none";

interface POCFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (pocId: string) => void;
}

// "Log POC" dialog. New POCs always start `outcome: 'pending'` (set
// server-side default + explicitly in useCreatePoc) — no outcome field here;
// that's set later from POCDetail once the engagement concludes.
export function POCForm({ open, onOpenChange, onCreated }: POCFormProps) {
  const { data: businessFunctions } = useBusinessFunctions();
  const createPoc = useCreatePoc();

  const form = useForm<CreatePocInput>({
    resolver: zodResolver(createPocSchema),
    defaultValues: {
      client_name: "",
      opportunity_name: "",
      business_function_id: undefined,
      start_date: "",
      end_date: "",
    },
  });

  async function onSubmit(values: CreatePocInput) {
    try {
      const poc = await createPoc.mutateAsync(values);
      toast.success(`POC for "${poc.client_name}" logged.`);
      form.reset();
      onOpenChange(false);
      onCreated?.(poc.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log POC");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a POC</DialogTitle>
          <DialogDescription>
            Record a new proof-of-concept engagement. You can add engaged resources and set the outcome afterwards.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="opportunity_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opportunity name</FormLabel>
                  <FormControl>
                    <Input placeholder="Platform modernization POC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="business_function_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business function</FormLabel>
                  <Select
                    value={field.value ?? NO_BUSINESS_FUNCTION}
                    onValueChange={(value) => field.onChange(value === NO_BUSINESS_FUNCTION ? undefined : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a business function" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_BUSINESS_FUNCTION}>No business function</SelectItem>
                      {businessFunctions?.map((bf) => (
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
            <div className="grid grid-cols-2 gap-4">
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
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createPoc.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPoc.isPending}>
                {createPoc.isPending ? "Logging…" : "Log POC"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
