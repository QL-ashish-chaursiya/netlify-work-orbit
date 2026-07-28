import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

export interface SeatLimitInfo {
  used: number;
  limit: number;
  reached: boolean;
}

// Pre-emptive UI-side seat limit check (BRD §7) — the authoritative
// enforcement is the check_seat_limit Postgres trigger (schema.sql SECTION
// 12), this just lets Add Employee / Bulk Import warn/block before a round
// trip. No entry in lib/query-keys.ts for this, so it uses a local key scoped
// to this feature.
export function useSeatLimit() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["seat-limit", orgId] as const,
    queryFn: async (): Promise<SeatLimitInfo> => {
      const [{ count, error: countError }, { data: org, error: orgError }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("organizations").select("seat_limit").eq("id", orgId as string).single(),
      ]);
      if (countError) throw countError;
      if (orgError) throw orgError;

      const used = count ?? 0;
      const limit = org?.seat_limit ?? 0;
      return { used, limit, reached: used >= limit };
    },
    enabled: !!orgId,
  });
}
