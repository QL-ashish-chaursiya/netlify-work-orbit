import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, DollarSign, TrendingDown, Undo2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { TONE_CLASSES } from "@/lib/status-badges";
import type { ActivityItem } from "@/features/dashboard/components/ActivityFeed";

interface RecentActivityOptions {
  limit?: number;
  projectIds?: string[];
  includePocs?: boolean;
}

// Assembled client-side from allocation_requests + pocs — the schema has an
// audit_log table, but nothing writes to it yet (BRD flags it as
// system/security-definer-only, and no trigger populates it in this build).
// Rather than leaving "recent activity" empty, this reconstructs a real feed
// from tables the caller can already read, same spirit as the utilization
// trend's reconstruction-from-current-rows approach.
async function fetchRecentActivity(projectIds: string[] | undefined, includePocs: boolean): Promise<ActivityItem[]> {
  let requestsQuery = supabase
    .from("allocation_requests")
    .select("id, status, requested_by, decided_by, requested_profile_id, project_id, created_at, decided_at")
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);
  if (projectIds) {
    if (projectIds.length === 0) {
      requestsQuery = requestsQuery.eq("project_id", "00000000-0000-0000-0000-000000000000"); // never matches: no projects in scope
    } else {
      requestsQuery = requestsQuery.in("project_id", projectIds);
    }
  }

  const [{ data: requests, error: reqError }, pocsResult] = await Promise.all([
    requestsQuery,
    includePocs
      ? supabase
          .from("pocs")
          .select("id, client_name, outcome, updated_at")
          .neq("outcome", "pending")
          .order("updated_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (reqError) throw reqError;
  if (pocsResult.error) throw pocsResult.error;
  const pocs = pocsResult.data ?? [];

  const profileIds = [
    ...new Set((requests ?? []).flatMap((r) => [r.requested_by, r.decided_by, r.requested_profile_id].filter((id): id is string => !!id))),
  ];
  const projIds = [...new Set((requests ?? []).map((r) => r.project_id))];

  const [{ data: profiles }, { data: projects }] = await Promise.all([
    profileIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    projIds.length > 0
      ? supabase.from("projects").select("id, name").in("id", projIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const profileName = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const projectName = new Map((projects ?? []).map((p) => [p.id, p.name]));

  const items: ActivityItem[] = [];

  for (const r of requests ?? []) {
    const project = projectName.get(r.project_id) ?? "a project";
    const target = r.requested_profile_id ? profileName.get(r.requested_profile_id) : undefined;
    const timestamp = r.decided_at ?? r.created_at;

    if (r.status === "approved") {
      const decider = (r.decided_by && profileName.get(r.decided_by)) ?? "An approver";
      items.push({
        id: r.id, icon: Check, toneClass: TONE_CLASSES.green,
        prefix: `${decider} approved allocation request for `, subject: target ?? "a resource", suffix: ` → ${project}`,
        timestamp,
      });
    } else if (r.status === "rejected") {
      const decider = (r.decided_by && profileName.get(r.decided_by)) ?? "An approver";
      items.push({
        id: r.id, icon: X, toneClass: TONE_CLASSES.red,
        prefix: `${decider} rejected allocation request for `, subject: target ?? "a resource", suffix: ` → ${project}`,
        timestamp,
      });
    } else if (r.status === "conflict_flagged") {
      const requester = (r.requested_by && profileName.get(r.requested_by)) ?? "Someone";
      items.push({
        id: r.id, icon: AlertTriangle, toneClass: TONE_CLASSES.amber,
        prefix: "Conflict detected: ", subject: target ?? "a resource", suffix: ` requested by ${requester} on ${project}`,
        timestamp,
      });
    } else if (r.status === "withdrawn") {
      const requester = (r.requested_by && profileName.get(r.requested_by)) ?? "Someone";
      items.push({
        id: r.id, icon: Undo2, toneClass: TONE_CLASSES.gray,
        prefix: `${requester} withdrew a request on `, subject: project, suffix: "",
        timestamp,
      });
    }
  }

  for (const poc of pocs) {
    const isWon = poc.outcome === "closed_won";
    items.push({
      id: poc.id,
      icon: isWon ? DollarSign : TrendingDown,
      toneClass: isWon ? TONE_CLASSES.green : TONE_CLASSES.red,
      prefix: "POC for ",
      subject: poc.client_name,
      suffix: isWon ? " logged as Closed-Won" : " logged as Closed-Lost",
      timestamp: poc.updated_at,
    });
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function useRecentActivity({ limit = 8, projectIds, includePocs = true }: RecentActivityOptions = {}) {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;
  const scopeKey = projectIds ? [...projectIds].sort().join(",") : "all";

  const query = useQuery({
    queryKey: ["dashboard", "recent-activity", orgId, scopeKey, includePocs],
    queryFn: () => fetchRecentActivity(projectIds, includePocs),
    enabled: !!orgId,
  });

  return { ...query, data: query.data?.slice(0, limit) };
}
