export type ReplaceWith = "space" | "dash" | "comma";
export type Spacing = "none" | "around";
export type SanitizeMode = "replace" | "format";
export type FormatMode =
  | "titleCase"
  | "uppercase"
  | "lowercase"
  | "splitWords"
  | "removeTrailing";

export interface SanitizeOptions {
  mode: SanitizeMode;
  formatMode: FormatMode;
  charToReplace: string;
  replaceWith: ReplaceWith;
  spacing: Spacing;
  removeArgs: number;
  removeTrailing: number;
}

function replacementChar(type: ReplaceWith): string {
  if (type === "space") return "";
  if (type === "dash") return "-";
  if (type === "comma") return ",";
  return "";
}

function finalReplacement(options: SanitizeOptions): string {
  const replacement = replacementChar(options.replaceWith);
  if (options.spacing === "around" && replacement) return ` ${replacement} `;
  if (options.spacing === "around" && !replacement) return " ";
  return replacement;
}

function sanitizeReplace(text: string, options: SanitizeOptions): string {
  const charToReplace = options.charToReplace;
  if (!charToReplace) return text;

  const repl = finalReplacement(options);
  const escaped = charToReplace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "g");
  let result = text.replace(regex, repl);

  const removeLeading = options.removeArgs || 0;
  const removeTrailing = options.removeTrailing || 0;

  if ((removeLeading > 0 || removeTrailing > 0) && repl) {
    const parts = result.split(repl);
    result = parts
      .slice(removeLeading, removeTrailing > 0 ? parts.length - removeTrailing : undefined)
      .filter(Boolean)
      .join(repl);
  }

  return result;
}

// ── Format modes ──────────────────────────────────────────────

function formatTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

function formatUppercase(text: string): string {
  return text.toUpperCase();
}

function formatLowercase(text: string): string {
  return text.toLowerCase();
}

function formatSplitWords(text: string): string {
  return text.split(/\s+/).filter(Boolean).join("\n");
}

function formatRemoveTrailing(text: string, count: number): string {
  if (count <= 0) return text;
  const parts = text.split(/\s+/).filter(Boolean);
  return parts.slice(0, Math.max(0, parts.length - count)).join(" ");
}

function sanitizeFormat(text: string, options: SanitizeOptions): string {
  switch (options.formatMode) {
    case "titleCase":
      return formatTitleCase(text);
    case "uppercase":
      return formatUppercase(text);
    case "lowercase":
      return formatLowercase(text);
    case "splitWords":
      return formatSplitWords(text);
    case "removeTrailing":
      return formatRemoveTrailing(text, options.removeTrailing);
    default:
      return text;
  }
}

export function sanitize(text: string, options: SanitizeOptions): string {
  if (options.mode === "format") {
    return sanitizeFormat(text, options);
  }
  return sanitizeReplace(text, options);
}

export function trimAndSanitize(text: string, options: SanitizeOptions): string {
  return sanitize(text.replace(/\s+/g, ""), options);
}

export function sanitizeClasses(text: string): string {
  const trimmed = text.trim();
  const classAttrMatch = trimmed.match(/class\s*=\s*["']([^"']*)["']/i);
  const source = classAttrMatch ? classAttrMatch[1]! : trimmed;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return `.${parts.join(".")}`;
}
