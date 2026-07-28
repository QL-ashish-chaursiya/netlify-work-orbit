import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { SignupInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from "@/features/auth/types";

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SignupInput) => {
      const { error: signUpError } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
      });
      if (signUpError) throw signUpError;

      // create_organization_and_admin relies on auth.uid() from the just-created
      // session, so it must run right after signUp — see schema.sql SECTION 12.
      const { data: orgId, error: rpcError } = await supabase.rpc("create_organization_and_admin", {
        p_company_name: input.companyName,
        p_full_name: input.fullName,
      });
      if (rpcError) throw rpcError;
      return orgId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data, error } = await supabase.auth.signInWithPassword(input);
      if (error) throw error;
      return data;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (input: ForgotPasswordInput) => {
      const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
      const { data, error } = await supabase.auth.updateUser({ password: input.password });
      if (error) throw error;

      // This is the activation moment for both bulk-imported (pending_activation)
      // and individually-invited (invited) employees — schema.sql's own comments
      // describe "activates via forgot-password" as the intended transition, but
      // nothing was actually flipping the row. Scoped to those two statuses only
      // so a deactivated employee can't reactivate themselves via password reset,
      // and a regular active user resetting a forgotten password is a no-op.
      const userId = data.user?.id;
      if (userId) {
        const { error: statusError } = await supabase
          .from("profiles")
          .update({ status: "active" })
          .eq("id", userId)
          .in("status", ["invited", "pending_activation"]);
        if (statusError) throw statusError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
