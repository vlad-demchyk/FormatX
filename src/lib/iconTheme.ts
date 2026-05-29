/**
 * Replace hardcoded fill/stroke colors in raw SVG strings with
 * `currentColor` so they inherit from the parent element's `color`.
 *
 * Used across PhotoPage, DocumentsPage, ClipboardPage, and SupportPage.
 */
export function themedIcon(raw: string): string {
  return raw
    .replace(/fill="#6366F1"/gi, 'fill="currentColor"')
    .replace(/stroke="#6366F1"/gi, 'stroke="currentColor"')
    .replace(/fill="black"/gi, 'fill="currentColor"')
    .replace(/stroke="black"/gi, 'stroke="currentColor"');
}

/**
 * Replace hardcoded fill/stroke colors with a CSS variable reference.
 * Useful when the icon needs to use a specific token (e.g., brand-accent).
 */
export function themedIconVar(raw: string, varName = "var(--brand-accent)"): string {
  return raw
    .replace(/fill="#6366F1"/gi, `fill="${varName}"`)
    .replace(/stroke="#6366F1"/gi, `stroke="${varName}"`)
    .replace(/\s(width|height)="\d+"/g, " ");
}
