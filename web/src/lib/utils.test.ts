import { describe, expect, it } from "vitest";
import { bodyOf, estimateTokens, parseList, slugify } from "./utils";

describe("slugify", () => {
  it("kebab-cases and trims", () => {
    expect(slugify("Backend API Engineer!")).toBe("backend-api-engineer");
    expect(slugify("  Hello   World  ")).toBe("hello-world");
  });
});

describe("parseList", () => {
  it("splits on newlines and commas, dropping empties", () => {
    expect(parseList("a, b\nc,,\n  d ")).toEqual(["a", "b", "c", "d"]);
  });
});

describe("estimateTokens", () => {
  it("approximates ~4 chars per token", () => {
    expect(estimateTokens("abcdefgh")).toBe(2);
    expect(estimateTokens("")).toBe(0);
  });
});

describe("bodyOf", () => {
  it("strips YAML frontmatter", () => {
    const md = "---\nname: x\ndescription: y\n---\n# Title\nBody";
    expect(bodyOf(md)).toBe("# Title\nBody");
  });
  it("returns input when there is no frontmatter", () => {
    expect(bodyOf("# Just a body")).toBe("# Just a body");
  });
});
