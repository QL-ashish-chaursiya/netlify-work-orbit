import { AuthLayout } from "@/components/layout/AuthLayout";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export function ResetPasswordPage() {
  return (
    <AuthLayout title="Set a new password">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
