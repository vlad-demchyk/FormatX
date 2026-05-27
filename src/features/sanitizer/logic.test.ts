import { describe, expect, it } from "vitest";
import { sanitize, sanitizeClasses, trimAndSanitize } from "./logic";

const base = {
  charToReplace: "/",
  replaceWith: "space" as const,
  spacing: "none" as const,
  removeArgs: 0,
};

describe("sanitize", () => {
  it("replaces character globally", () => {
    expect(sanitize("a/b/c", { ...base, replaceWith: "dash" })).toBe("a-b-c");
  });

  it("removes leading segments", () => {
    expect(
      sanitize("one/two/three", {
        ...base,
        replaceWith: "dash",
        removeArgs: 1,
      }),
    ).toBe("two-three");
  });

  it("trimAndSanitize strips whitespace first", () => {
    expect(trimAndSanitize("a / b", { ...base, replaceWith: "dash" })).toBe("a-b");
  });
});

describe("sanitizeClasses", () => {
  it("joins classes with dots", () => {
    expect(sanitizeClasses("foo bar")).toBe(".foo.bar");
  });

  it("parses class attribute", () => {
    expect(sanitizeClasses('class="a b"')).toBe(".a.b");
  });
});
