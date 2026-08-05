import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";

const BUCKET = "poc-attachments";

interface UploadPocAttachmentInput {
  pocId: string;
  organizationId: string;
  file: File;
}

// Uploads happen after the POC row already exists (mirrors the milestone
// staging flow in LogPocPage — nothing to attach a file TO until the POC has
// an id). Path is {organization_id}/{poc_id}/{filename}, matching the
// poc_attachments_insert/select storage.objects RLS policies (migration
// 0013) — the first path segment is what scopes the object to this org.
export function useUploadPocAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pocId, organizationId, file }: UploadPocAttachmentInput) => {
      const path = `${organizationId}/${pocId}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("pocs")
        .update({ attachment_path: path, attachment_name: file.name })
        .eq("id", pocId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (poc) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.poc(poc.id) });
    },
  });
}

// Signed URL, generated on demand — the bucket is private, so this is the
// only way to actually reach an attachment (see the download handler in
// POCDetail).
export async function getPocAttachmentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
