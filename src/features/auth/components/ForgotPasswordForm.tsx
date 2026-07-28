import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/features/auth/types";
import { useForgotPassword } from "@/features/auth/hooks/useAuthMutations";
import { useState } from "react";

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    try {
      await forgotPassword.mutateAsync(values);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        If an account exists for that email, a password reset link is on its way. This is also the first-login
        path for bulk-imported employees.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
          {forgotPassword.isPending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </Form>
  );
}
