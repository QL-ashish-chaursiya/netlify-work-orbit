import { OrgSetupWizard } from "@/features/auth/components/OrgSetupWizard";

export function OrgSetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <OrgSetupWizard />
    </div>
  );
}
