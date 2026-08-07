import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/types";
import { useResetPassword } from "@/features/auth/hooks/useAuthMutations";
import { supabase } from "@/lib/supabase";

type View = "form" | "expired" | "success";

// Supabase reports an invalid/expired/already-used recovery or invite token
// by redirecting back here with error params instead of a session — either
// in the query string or the hash fragment depending on flow type. Checking
// this on mount catches that immediately, instead of only after the user
// fills out the form and submits into a dead token.
function getLinkErrorFromUrl(): boolean {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return !!(hashParams.get("error") || hashParams.get("error_code") || searchParams.get("error") || searchParams.get("error_code"));
}

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const resetPassword = useResetPassword();
  const [view, setView] = useState<View>("form");
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (getLinkErrorFromUrl()) {
      setView("expired");
    }
  }, []);

  async function onSubmit(values: ResetPasswordInput) {
    try {
      await resetPassword.mutateAsync(values);
      // The email link leaves an implicit session from Supabase's own token
      // exchange. Sign that out rather than carrying it forward — the
      // "Go to Login" button below should land on a real login form, not a
      // page that's secretly already authenticated.
      await supabase.auth.signOut();
      setView("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not reset password";
      // Supabase surfaces expired/invalid recovery tokens as an auth error here —
      // give a clear recovery action instead of a dead-end form (BRD §7).
      if (/expired|invalid/i.test(message)) {
        setView("expired");
      } else {
        toast.error(message);
      }
    }
  }

  if (view === "expired") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          This link has expired or was already used. Request a new one to continue.
        </p>
        <Button className="w-full" onClick={() => navigate("/forgot-password")}>
          Request a new link
        </Button>
      </div>
    );
  }

  if (view === "success") {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <div>
          <p className="font-medium text-foreground">Account activated successfully!</p>
          <p className="text-sm text-muted-foreground">Sign in with your new password to continue.</p>
        </div>
        <Button className="w-full" onClick={() => navigate("/login")}>
          Go to Login
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
                <PasswordInput {...field} />
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
                <PasswordInput {...field} />
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
