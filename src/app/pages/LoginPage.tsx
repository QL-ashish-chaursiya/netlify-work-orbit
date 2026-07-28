import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/features/auth/components/LoginForm";

export function LoginPage() {
  return (
    <AuthLayout
      title="Sign in"
      description="Email + password only — no SSO, no magic links."
      footer={
        <>
          New company?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Create an organization
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
