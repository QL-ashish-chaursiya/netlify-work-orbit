import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { RequestStatus } from "@/lib/database.types";

export interface MyRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// Tech Lead dashboard: requests THEY raised, by outcome. Status column only
// — no need for the full request rows here, this feeds four stat counts.
async function fetchMyRequestStats(profileId: string): Promise<MyRequestStats> {
  const { data, error } = await supabase.from("allocation_requests").select("status").eq("requested_by", profileId);
  if (error) throw error;

  const counts = { total: data?.length ?? 0, pending: 0, approved: 0, rejected: 0 };
  const byStatus: Record<string, keyof MyRequestStats | undefined> = {
    pending: "pending", conflict_flagged: "pending", approved: "approved", rejected: "rejected",
  };
  for (const row of data ?? []) {
    const key = byStatus[row.status as RequestStatus];
    if (key && key !== "total") counts[key] += 1;
  }
  return counts;
}

export function useMyRequests() {
  const { profile } = useAuthRole();

  return useQuery({
    queryKey: ["dashboard", "my-requests", profile?.id],
    queryFn: () => fetchMyRequestStats(profile!.id),
    enabled: !!profile?.id,
  });
}
