import { useEffect, useState } from "react";
import { api } from "@/lib/queries";
import type { ValidationReport } from "@/lib/api/types";

/** Debounced live validation of SKILL.md content via POST /api/validate. */
export function useValidation(
  content: string,
  opts?: { expectedName?: string; tokenBudget?: number },
) {
  const [report, setReport] = useState<ValidationReport | undefined>();
  const [loading, setLoading] = useState(false);
  const expectedName = opts?.expectedName;
  const tokenBudget = opts?.tokenBudget;

  useEffect(() => {
    if (!content.trim()) {
      setReport(undefined);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      api
        .validate({
          content,
          expected_name: expectedName ?? null,
          token_budget: tokenBudget ?? null,
        })
        .then(setReport)
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(id);
  }, [content, expectedName, tokenBudget]);

  return { report, loading };
}
