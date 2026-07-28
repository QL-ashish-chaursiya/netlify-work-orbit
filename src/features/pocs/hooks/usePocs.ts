import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { Tables } from "@/lib/database.types";

export interface PocWithBusinessFunction extends Tables<"pocs"> {
  business_function: Pick<Tables<"business_functions">, "id" | "name"> | null;
}

// Lists every POC visible to the caller — RLS (`pocs_select`) already scopes
// this to the caller's organization, so no client-side org filter here.
// business_functions is merged client-side (two plain queries) rather than an
// embedded `.select("*, business_functions(name)")` — the hand-authored
// database.types.ts declares no `Relationships`, so embedded-resource
// selects can't be typed reliably against it (same pattern as
// useProjectOwners in the projects feature).
export function usePocs() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: queryKeys.pocs(orgId),
    queryFn: async (): Promise<PocWithBusinessFunction[]> => {
      const { data: pocs, error } = await supabase
        .from("pocs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!pocs.length) return [];

      const businessFunctionIds = [
        ...new Set(pocs.map((p) => p.business_function_id).filter((id): id is string => !!id)),
      ];

      let businessFunctionMap = new Map<string, Pick<Tables<"business_functions">, "id" | "name">>();
      if (businessFunctionIds.length) {
        const { data: businessFunctions, error: bfError } = await supabase
          .from("business_functions")
          .select("id, name")
          .in("id", businessFunctionIds);
        if (bfError) throw bfError;
        businessFunctionMap = new Map(businessFunctions.map((bf) => [bf.id, bf]));
      }

      return pocs.map((p) => ({
        ...p,
        business_function: p.business_function_id ? businessFunctionMap.get(p.business_function_id) ?? null : null,
      }));
    },
    enabled: !!orgId,
  });
}
