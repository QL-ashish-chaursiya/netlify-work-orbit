import { useParams } from "react-router-dom";
import { POCDetail } from "@/features/pocs/components/POCDetail";

// Expects to be routed at a path with a `:id` param, e.g. `/pocs/:id`.
export function POCDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return null;

  return <POCDetail pocId={id} />;
}
