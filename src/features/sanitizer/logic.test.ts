import { describe, expect, it } from "vitest";
import { sanitize, sanitizeClasses, trimAndSanitize } from "./logic";
import type { SanitizeOptions } from "./logic";

const base: SanitizeOptions = {
  mode: "replace",
  formatMode: "titleCase",
  charToReplace: "/",
  replaceWith: "space",
  spacing: "none",
  removeArgs: 0,
  removeTrailing: 0,
};

describe("sanitize — replace mode", () => {
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

  it("removes trailing segments", () => {
    expect(
      sanitize("one/two/three/four", {
        ...base,
        replaceWith: "dash",
        removeTrailing: 2,
      }),
    ).toBe("one-two");
  });

  it("removes both leading and trailing segments", () => {
    expect(
      sanitize("a/b/c/d/e", {
        ...base,
        replaceWith: "dash",
        removeArgs: 1,
        removeTrailing: 1,
      }),
    ).toBe("b-c-d");
  });

  it("trimAndSanitize strips whitespace first", () => {
    expect(trimAndSanitize("a / b", { ...base, replaceWith: "dash" })).toBe("a-b");
  });
});

describe("sanitize — format mode", () => {
  const fmt: SanitizeOptions = {
    ...base,
    mode: "format",
  };

  it("titleCase capitalizes each word", () => {
    expect(sanitize("ivan petrovych", { ...fmt, formatMode: "titleCase" })).toBe(
      "Ivan Petrovych",
    );
  });

  it("uppercase converts to upper case", () => {
    expect(sanitize("hello world", { ...fmt, formatMode: "uppercase" })).toBe(
      "HELLO WORLD",
    );
  });

  it("lowercase converts to lower case", () => {
    expect(sanitize("HELLO WORLD", { ...fmt, formatMode: "lowercase" })).toBe(
      "hello world",
    );
  });

  it("splitWords splits by whitespace into newlines", () => {
    expect(sanitize("one two  three", { ...fmt, formatMode: "splitWords" })).toBe(
      "one\ntwo\nthree",
    );
  });

  it("removeTrailing removes N words from end", () => {
    expect(
      sanitize("a b c d e", { ...fmt, formatMode: "removeTrailing", removeTrailing: 2 }),
    ).toBe("a b c");
  });

  it("removeTrailing with 0 keeps all words", () => {
    expect(
      sanitize("a b c", { ...fmt, formatMode: "removeTrailing", removeTrailing: 0 }),
    ).toBe("a b c");
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
