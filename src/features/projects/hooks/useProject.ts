import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { Tables } from "@/lib/database.types";

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(id ?? ""),
    queryFn: async (): Promise<Tables<"projects">> => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id as string).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
