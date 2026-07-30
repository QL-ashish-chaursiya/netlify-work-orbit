import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExecutiveDashboard } from "@/features/reporting/components/ExecutiveDashboard";
import { UtilizationDashboard } from "@/features/reporting/components/UtilizationDashboard";
import { OverAllocationBanner } from "@/features/reporting/components/OverAllocationBanner";
import { IdleThresholdSettings } from "@/features/reporting/components/IdleThresholdSettings";

// Bench Report moved to its own page at /bench-report — see BenchReportPage.
export function ReportingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Utilization & Reporting</h1>
        <p className="text-sm text-muted-foreground">
          Org-wide utilization, over-allocation flags, and idle-threshold settings.
        </p>
      </div>

      <Tabs defaultValue="executive">
        <TabsList>
          <TabsTrigger value="executive">Executive</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="executive">
          <ExecutiveDashboard />
        </TabsContent>

        <TabsContent value="utilization" className="space-y-6">
          <OverAllocationBanner />
          <UtilizationDashboard />
        </TabsContent>

        <TabsContent value="settings">
          <IdleThresholdSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
