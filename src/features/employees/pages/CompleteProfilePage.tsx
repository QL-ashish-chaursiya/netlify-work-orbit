import { useNavigate } from "react-router-dom";
import { ProfileCompletionForm } from "@/features/employees/components/ProfileCompletionForm";

export function CompleteProfilePage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <ProfileCompletionForm onCompleted={() => navigate("/dashboard", { replace: true })} />
    </div>
  );
}
