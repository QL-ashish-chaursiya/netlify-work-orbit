import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useBenchReportDetail } from "@/features/reporting/hooks/useBenchReportDetail";
import { ResourceProfileDrawer } from "@/features/allocations/components/ResourceProfileDrawer";
import type { BenchDetailRow } from "@/features/reporting/types";

const GRID_COLS = "minmax(180px,2fr) minmax(150px,1.5fr) minmax(150px,1.5fr) 90px 90px 90px";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function utilizationBadgeClass(percent: number) {
  return percent <= 0 ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700";
}

export function BenchReportTable() {
  const [nameQuery, setNameQuery] = useState("");
  const [drawerProfileId, setDrawerProfileId] = useState<string | null>(null);
  const { data: rows, isLoading } = useBenchReportDetail();

  const visibleRows = useMemo(() => {
    const list = rows ?? [];
    if (!nameQuery.trim()) return list;
    const q = nameQuery.trim().toLowerCase();
    return list.filter((r) => r.fullName.toLowerCase().includes(q));
  }, [rows, nameQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Name</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-48 pl-8"
              placeholder="Search bench resources…"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visibleRows.length === 0 ? (
        <EmptyState
          message="No resources are currently on the bench."
          description="Everyone in this org is at or above their idle-threshold utilization."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <div className="min-w-[880px]">
            <div
              className="grid items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <span>Resource</span>
              <span>Skill profile</span>
              <span>Last project</span>
              <span>Idle since</span>
              <span>Utilization</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y">
              {visibleRows.map((row: BenchDetailRow) => (
                <div key={row.profileId} className="grid items-center gap-3 px-4 py-3" style={{ gridTemplateColumns: GRID_COLS }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-[var(--blue-bright)] to-[var(--indigo)] text-xs font-semibold text-white">
                        {initials(row.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.fullName}</p>
                      {row.designation && <p className="truncate text-xs text-muted-foreground">{row.designation}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {row.skills.length > 0 ? (
                      row.skills.map((s) => (
                        <Badge key={s.id} variant="secondary" className="font-normal">
                          {s.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>

                  <p className="truncate text-sm">{row.lastProjectName ?? "—"}</p>

                  <p className="text-sm text-muted-foreground">
                    {row.idleSinceDate ? format(parseISO(row.idleSinceDate), "MMM d") : "—"}
                  </p>

                  <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${utilizationBadgeClass(row.utilizationPercent)}`}>
                    {row.utilizationPercent}%
                  </span>

                  <div className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setDrawerProfileId(row.profileId)}>
                      View profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ResourceProfileDrawer
        profileId={drawerProfileId}
        open={!!drawerProfileId}
        onOpenChange={(open) => !open && setDrawerProfileId(null)}
      />
    </div>
  );
}
