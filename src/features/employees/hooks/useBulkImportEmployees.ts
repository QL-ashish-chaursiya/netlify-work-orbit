import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { resolveEdgeFunctionError } from "@/features/employees/hooks/edgeFunctionError";
import type { BulkImportJobResult, BulkImportRow } from "@/features/employees/types";

interface BulkImportInput {
  file_name?: string;
  rows: BulkImportRow[];
}

// Path C (BRD §4): calls the bulk-import-employees edge function with only
// the client-validated rows. The function itself is the authoritative
// validator (duplicate emails, manager lookup, seat limit) and never fails
// the whole batch for a few bad rows — it returns per-row errors instead.
export function useBulkImportEmployees() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();

  return useMutation({
    mutationFn: async (input: BulkImportInput) => {
      const { data, error } = await supabase.functions.invoke<BulkImportJobResult & { error?: string }>(
        "bulk-import-employees",
        { body: input },
      );
      const message = await resolveEdgeFunctionError(error, data);
      if (message) throw new Error(message);
      if (!data) throw new Error("Bulk import returned no result");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(profile?.organization_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bulkImportJobs(profile?.organization_id) });
    },
  });
}
