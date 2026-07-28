import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReleaseCalendarView } from "@/features/release-planning/components/ReleaseCalendarView";
import { ReleasePlanningList } from "@/features/release-planning/components/ReleasePlanningList";

// Composes the Tech Lead + RM calendar view with the PM-facing planned
// releases table as tabs on one page (BRD Phase 4).
export function ReleaseCalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Release Planning</h1>
        <p className="text-muted-foreground">
          Track upcoming releases and confirm or extend allocations as target dates approach.
        </p>
      </div>
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="planned">Planned Releases</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          <ReleaseCalendarView />
        </TabsContent>
        <TabsContent value="planned">
          <ReleasePlanningList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
