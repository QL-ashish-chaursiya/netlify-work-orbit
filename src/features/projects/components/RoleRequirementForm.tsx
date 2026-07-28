import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { roleRequirementSchema, type RoleRequirementInput } from "@/features/projects/types";
import { useCreateRoleRequirement } from "@/features/projects/hooks/useCreateRoleRequirement";
import { useSkills } from "@/features/projects/hooks/useSkills";

interface RoleRequirementFormProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleRequirementForm({ projectId, open, onOpenChange }: RoleRequirementFormProps) {
  const { data: skills } = useSkills();
  const createRoleRequirement = useCreateRoleRequirement(projectId);

  const form = useForm<RoleRequirementInput>({
    resolver: zodResolver(roleRequirementSchema),
    defaultValues: { title: "", headcount: 1, required_skills: [] },
  });

  async function onSubmit(values: RoleRequirementInput) {
    try {
      await createRoleRequirement.mutateAsync(values);
      toast.success(`Role requirement "${values.title}" added.`);
      form.reset({ title: "", headcount: 1, required_skills: [] });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add role requirement");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset({ title: "", headcount: 1, required_skills: [] });
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add role requirement</DialogTitle>
          <DialogDescription>Define an open position for this project during Staffing.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Backend Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="headcount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headcount</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="required_skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required skills</FormLabel>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                    {skills?.length ? (
                      skills.map((skill) => {
                        const value = field.value ?? [];
                        const checked = value.includes(skill.id);
                        return (
                          <label key={skill.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(isChecked) => {
                                field.onChange(
                                  isChecked ? [...value, skill.id] : value.filter((id) => id !== skill.id),
                                );
                              }}
                            />
                            {skill.name}
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">No skills defined for this organization yet.</p>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createRoleRequirement.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRoleRequirement.isPending}>
                {createRoleRequirement.isPending ? "Adding…" : "Add role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
