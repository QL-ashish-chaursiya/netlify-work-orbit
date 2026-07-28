import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      description=""
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
