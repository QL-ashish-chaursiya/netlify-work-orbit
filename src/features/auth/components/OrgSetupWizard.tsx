import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateBusinessFunctions } from "@/features/org/hooks/useBusinessFunctions";

const SUGGESTED = ["Engineering", "Design", "Sales", "Delivery", "Operations"];

export function OrgSetupWizard() {
  const navigate = useNavigate();
  const createFunctions = useCreateBusinessFunctions();
  const [functions, setFunctions] = useState<string[]>(["", "", ""]);

  function updateAt(i: number, value: string) {
    setFunctions((prev) => prev.map((f, idx) => (idx === i ? value : f)));
  }

  function addRow() {
    setFunctions((prev) => [...prev, ""]);
  }

  function removeRow(i: number) {
    setFunctions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function useSuggested() {
    setFunctions(SUGGESTED);
  }

  async function handleSubmit() {
    const cleaned = functions.map((f) => f.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast.error("Add at least one business function/department");
      return;
    }
    try {
      await createFunctions.mutateAsync(cleaned);
      toast.success("Org setup complete.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save business functions");
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Set up your organization</CardTitle>
        <CardDescription>
          Add the business functions or departments you'll allocate resources under. You can edit these later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {functions.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="e.g. Engineering"
                value={f}
                onChange={(e) => updateAt(i, e.target.value)}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" /> Add row
          </Button>
          <Button type="button" variant="link" size="sm" onClick={useSuggested}>
            Use suggested list
          </Button>
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={createFunctions.isPending}>
          {createFunctions.isPending ? "Saving…" : "Finish setup"}
        </Button>
      </CardContent>
    </Card>
  );
}
