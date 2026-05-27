export type ReplaceWith = "space" | "dash" | "comma";
export type Spacing = "none" | "around";

export interface SanitizeOptions {
  charToReplace: string;
  replaceWith: ReplaceWith;
  spacing: Spacing;
  removeArgs: number;
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

export function sanitize(text: string, options: SanitizeOptions): string {
  const charToReplace = options.charToReplace;
  if (!charToReplace) return text;

  const repl = finalReplacement(options);
  const escaped = charToReplace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "g");
  let result = text.replace(regex, repl);

  const removeCount = options.removeArgs || 0;
  if (removeCount > 0 && repl) {
    const parts = result.split(repl);
    result = parts.slice(removeCount).filter(Boolean).join(repl);
  }

  return result;
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
