import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ValidationPanel } from "./ValidationPanel";
import type { ValidationReport } from "@/lib/api/types";

function makeReport(partial: Partial<ValidationReport>): ValidationReport {
  return {
    ok: true,
    summary: "0 error(s), 0 warning(s), 0 suggestion(s)",
    errors: [],
    warnings: [],
    suggestions: [],
    frontmatter: {},
    estimated_tokens: 0,
    line_count: 0,
    ...partial,
  };
}

describe("ValidationPanel", () => {
  it("shows a clean message when there are no issues", () => {
    render(<ValidationPanel report={makeReport({ ok: true })} />);
    expect(screen.getByText(/Looks great/i)).toBeInTheDocument();
  });

  it("renders errors, warnings and suggestions by severity", () => {
    render(
      <ValidationPanel
        report={makeReport({
          ok: false,
          errors: ["missing frontmatter"],
          warnings: ["description too short"],
          suggestions: ["add an example"],
        })}
      />,
    );
    expect(screen.getByText("missing frontmatter")).toBeInTheDocument();
    expect(screen.getByText("description too short")).toBeInTheDocument();
    expect(screen.getByText("add an example")).toBeInTheDocument();
    expect(screen.queryByText(/Looks great/i)).not.toBeInTheDocument();
  });
});
