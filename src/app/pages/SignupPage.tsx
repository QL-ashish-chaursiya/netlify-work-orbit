import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { SignupForm } from "@/features/auth/components/SignupForm";

export function SignupPage() {
  return (
    <AuthLayout
      title="Create your organization"
      description="You'll become the Admin — no billing step, trial plan with 25 seats starts automatically."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthLayout>
  );
}
