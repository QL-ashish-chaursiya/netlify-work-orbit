import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { NAV_ITEMS } from "@/components/layout/nav-config";
import { humanizeEnum } from "@/lib/status-badges";

// Role-based dashboard landing (BRD Phase 1). Feature-specific widgets
// (utilization charts, approval counts, POC pipeline) are layered in by
// each feature module rather than duplicated here — this stays a launcher.
export function DashboardPage() {
  const { profile, primaryRole } = useAuthRole();

  const quickLinks = NAV_ITEMS.filter(
    (item) => item.href !== "/dashboard" && (!primaryRole || item.roles.includes(primaryRole)),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        {primaryRole && <p className="text-muted-foreground">Signed in as {humanizeEnum(primaryRole)}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((item) => (
          <Link key={item.href} to={item.href}>
            <Card className="transition-colors hover:border-primary">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <item.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Go to {item.label.toLowerCase()}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
