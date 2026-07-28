import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentProfile } from "@/features/auth/hooks/useAuthSession";
import { useSkills, useCompleteProfile } from "@/features/employees/hooks/useSkills";
import { profileCompletionSchema, type ProfileCompletionInput } from "@/features/employees/types";

interface ProfileCompletionFormProps {
  onCompleted?: () => void;
}

export function ProfileCompletionForm({ onCompleted }: ProfileCompletionFormProps) {
  const { data: profile } = useCurrentProfile();
  const { data: skills } = useSkills();
  const completeProfile = useCompleteProfile();

  const form = useForm<ProfileCompletionInput>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      designation: profile?.designation ?? "",
      skills: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "skills" });

  async function onSubmit(values: ProfileCompletionInput) {
    try {
      await completeProfile.mutateAsync({
        designation: values.designation,
        skills: values.skills.map((s) => ({
          skill_id: s.skill_id,
          experience_years: s.experience_years ?? null,
          last_used_on: s.last_used_on || null,
        })),
      });
      toast.success("Profile completed.");
      onCompleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile");
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Complete your profile</CardTitle>
        <CardDescription>
          Add your designation and skills so teams can find you for the right work. You only need to do this once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Skills</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ skill_id: "", experience_years: undefined, last_used_on: "" })}
                >
                  <Plus className="h-4 w-4" />
                  Add skill
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">No skills added yet.</p>
              )}

              {fields.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto] items-start gap-2 rounded-md border p-3">
                  <FormField
                    control={form.control}
                    name={`skills.${index}.skill_id`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Skill</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a skill" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(skills ?? []).map((skill) => (
                              <SelectItem key={skill.id} value={skill.id}>
                                {skill.name}
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
                    name={`skills.${index}.experience_years`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Years</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.5"
                            className="w-24"
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
                    name={`skills.${index}.last_used_on`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Last used</FormLabel>
                        <FormControl>
                          <DatePicker
                            className="w-36"
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

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-5"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={completeProfile.isPending}>
              {completeProfile.isPending ? "Saving…" : "Save and continue"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
