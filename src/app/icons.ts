import docsRaw from "../../assets/icons/material-symbols_docs.svg?raw";
import photoRaw from "../../assets/icons/tabler_photo.svg?raw";
import textRaw from "../../assets/icons/solar_text-bold.svg?raw";
import clipboardRaw from "../../assets/icons/clipboard-list.svg?raw";
import closeRaw from "../../assets/icons/iconamoon_close-bold.svg?raw";
import coffeeRaw from "../../assets/icons/line-md_buy-me-a-coffee-filled.svg?raw";

/** Brand hex in source SVGs → theme-aware currentColor */
function themedIcon(raw: string): string {
  return raw
    .replace(/fill="#6366F1"/gi, 'fill="currentColor"')
    .replace(/stroke="#6366F1"/gi, 'stroke="currentColor"');
}

export const tabIcons = {
  text: themedIcon(textRaw),
  photo: themedIcon(photoRaw),
  documents: themedIcon(docsRaw),
  clipboard: themedIcon(clipboardRaw),
  support: themedIcon(coffeeRaw),
} as const;

/** Themed close (×) icon — inherits current color. */
export const closeIcon = themedIcon(closeRaw);
