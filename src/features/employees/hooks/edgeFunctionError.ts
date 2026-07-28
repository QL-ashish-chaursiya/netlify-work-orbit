import { FunctionsHttpError } from "@supabase/supabase-js";

// supabase.functions.invoke() resolves `data: null` and a FunctionsHttpError
// in `error` whenever the function returns a non-2xx status — the JSON body
// (our `{ error: "..." }` shape) lives on `error.context`, a Response, not on
// `data`. Some code paths (older invoke behavior / non-error 2xx bodies that
// still carry `{ error }`) surface it as `data.error` instead, so this checks
// both and always throws a plain Error with the human-readable message so
// callers can toast `error.message` verbatim.
export async function resolveEdgeFunctionError(
  error: unknown,
  data: { error?: string } | null | undefined,
): Promise<string | null> {
  if (error) {
    if (error instanceof FunctionsHttpError && error.context) {
      try {
        const body = await error.context.json();
        if (body?.error) return body.error as string;
      } catch {
        // context wasn't JSON — fall through to the generic message below.
      }
    }
    return error instanceof Error ? error.message : "Request failed";
  }
  if (data?.error) return data.error;
  return null;
}
