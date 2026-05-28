import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
});

/**
 * Convert HTML string to Markdown using turndown.
 */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

/**
 * Wrap plain text as a basic Markdown document.
 */
export function textToMarkdown(text: string, title?: string): string {
  const parts: string[] = [];
  if (title) {
    parts.push(`# ${title}\n`);
  }
  parts.push(text);
  return parts.join("\n\n");
}
