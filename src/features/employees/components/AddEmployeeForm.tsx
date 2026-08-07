import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { humanizeEnum } from "@/lib/status-badges";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useAddEmployee } from "@/features/employees/hooks/useAddEmployee";
import { useSeatLimit } from "@/features/employees/hooks/useSeatLimit";
import { addEmployeeSchema, USER_ROLE_VALUES, type AddEmployeeInput } from "@/features/employees/types";

export function AddEmployeeForm() {
  const [open, setOpen] = useState(false);
  const [managerPopoverOpen, setManagerPopoverOpen] = useState(false);
  const [managerFilter, setManagerFilter] = useState("");

  const { data: employees } = useEmployees();
  const { data: seatLimit } = useSeatLimit();
  const addEmployee = useAddEmployee();

  const form = useForm<AddEmployeeInput>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      full_name: "",
      email: "",
      primary_role: "team_member",
      designation: "",
      reporting_manager_id: "",
    },
  });

  const activeEmployees = (employees ?? []).filter((e) => e.status !== "deactivated");
  const filteredManagers = activeEmployees.filter((e) =>
    e.full_name.toLowerCase().includes(managerFilter.toLowerCase()),
  );
  const selectedManagerId = form.watch("reporting_manager_id");
  const selectedManager = activeEmployees.find((e) => e.id === selectedManagerId);

  const seatLimitReached = !!seatLimit?.reached;

  async function onSubmit(values: AddEmployeeInput) {
    try {
      await addEmployee.mutateAsync(values);
      toast.success(`Invite sent to ${values.email}.`);
      form.reset({
        full_name: "",
        email: "",
        primary_role: "team_member",
        designation: "",
        reporting_manager_id: "",
      });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add employee");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add employee</DialogTitle>
          <DialogDescription>
            Sends an email invite with a set-password link. The employee becomes Active once they set a password.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primary_role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USER_ROLE_VALUES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {humanizeEnum(role)}
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
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Senior Engineer"
                      name={field.name}
                      ref={field.ref}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reporting_manager_id"
              render={() => (
                <FormItem>
                  <FormLabel>Reporting manager (optional)</FormLabel>
                  <Popover open={managerPopoverOpen} onOpenChange={setManagerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {selectedManager ? selectedManager.full_name : "Search employees…"}
                          <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
                      <Input
                        autoFocus
                        placeholder="Search by name…"
                        value={managerFilter}
                        onChange={(e) => setManagerFilter(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-48 overflow-y-auto">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2 px-2 font-normal"
                          onClick={() => {
                            form.setValue("reporting_manager_id", "");
                            setManagerPopoverOpen(false);
                          }}
                        >
                          <Check className={cn("h-4 w-4", !selectedManagerId ? "opacity-100" : "opacity-0")} />
                          No manager
                        </Button>
                        {filteredManagers.map((emp) => (
                          <Button
                            key={emp.id}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 px-2 font-normal"
                            onClick={() => {
                              form.setValue("reporting_manager_id", emp.id);
                              setManagerPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn("h-4 w-4", selectedManagerId === emp.id ? "opacity-100" : "opacity-0")}
                            />
                            {emp.full_name}
                            <span className="ml-auto text-xs text-muted-foreground">{emp.email}</span>
                          </Button>
                        ))}
                        {filteredManagers.length === 0 && (
                          <p className="px-2 py-1.5 text-sm text-muted-foreground">No matching employees</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {seatLimitReached && (
              <p className="text-sm font-medium text-destructive">
                Seat limit reached ({seatLimit?.used}/{seatLimit?.limit}). Contact your Admin to add more employees.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addEmployee.isPending || seatLimitReached}>
                {addEmployee.isPending ? "Sending invite…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
