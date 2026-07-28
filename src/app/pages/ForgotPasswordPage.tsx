import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      description="Bulk-imported employees: this is your first-login path."
      footer={
        <Link to="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
