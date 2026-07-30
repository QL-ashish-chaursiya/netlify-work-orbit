import { Link } from "react-router-dom";
import { Search, CalendarClock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { UpcomingReleasesCard } from "@/features/dashboard/components/UpcomingReleasesCard";
import { useMyRequests } from "@/features/dashboard/hooks/useMyRequests";

const SHORTCUTS = [
  { label: "Expertise Search", description: "Find a resource by skill", href: "/expertise-search", icon: Search },
  { label: "Release Calendar", description: "See who's freeing up soon", href: "/release-calendar", icon: CalendarClock },
];

export function TechLeadDashboard() {
  const { data: stats } = useMyRequests();
  const total = stats?.total ?? 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Requests Raised" value={String(total)} percent={100} colorClass="stroke-brand-blue" />
        <StatCard label="Pending" value={String(stats?.pending ?? 0)} percent={pct(stats?.pending ?? 0)} colorClass="stroke-amber-500" />
        <StatCard label="Approved" value={String(stats?.approved ?? 0)} percent={pct(stats?.approved ?? 0)} colorClass="stroke-emerald-600" />
        <StatCard label="Rejected" value={String(stats?.rejected ?? 0)} percent={pct(stats?.rejected ?? 0)} colorClass="stroke-red-500" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SHORTCUTS.map((s) => (
          <Link key={s.href} to={s.href}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex items-center gap-3 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <s.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.label}</p>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <UpcomingReleasesCard />
    </div>
  );
}
