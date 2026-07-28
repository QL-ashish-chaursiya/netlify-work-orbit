import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/types";
import { useResetPassword } from "@/features/auth/hooks/useAuthMutations";
import { useState } from "react";

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const resetPassword = useResetPassword();
  const [linkExpired, setLinkExpired] = useState(false);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    try {
      await resetPassword.mutateAsync(values);
      toast.success("Password set — you're all logged in.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not reset password";
      // Supabase surfaces expired/invalid recovery tokens as an auth error here —
      // give a clear recovery action instead of a dead-end form (BRD §7).
      if (/expired|invalid/i.test(message)) {
        setLinkExpired(true);
      } else {
        toast.error(message);
      }
    }
  }

  if (linkExpired) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          This reset link has expired or was already used. Request a new one to continue.
        </p>
        <Button asChild className="w-full">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
          {resetPassword.isPending ? "Saving…" : "Set password"}
        </Button>
      </form>
    </Form>
  );
}
