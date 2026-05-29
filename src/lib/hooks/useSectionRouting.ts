import { useCallback, useEffect, useState } from "react";

/**
 * Hash-based section navigation hook.
 *
 * Extracts the shared pattern from PhotoPage / DocumentsPage / TextPage:
 * - Read section from `window.location.hash`
 * - `setSection` updates state and pushes to URL hash
 * - `useEffect` with `hashchange` listener for external sync
 *
 * @param validSections - Allowed section IDs (e.g., ["convert", "history"])
 * @param pageRoute - The page route prefix (e.g., "photo", "documents")
 * @param hashForFn - Function to build the hash for a given page+section
 */
export function useSectionRouting<TSection extends string>(
  validSections: TSection[],
  pageRoute: string,
  hashForFn: (page: string, section?: string) => string,
) {
  const sectionFromHash = useCallback((): TSection | null => {
    const parts = window.location.hash.replace(/^#\/?/, "").split("/");
    return parts.length > 1 && (validSections as string[]).includes(parts[1]!)
      ? (parts[1] as TSection)
      : null;
  }, [validSections]);

  const [section, setSectionState] = useState<TSection | null>(() =>
    sectionFromHash(),
  );

  const setSection = useCallback(
    (s: TSection | null) => {
      setSectionState(s);
      window.location.hash = hashForFn(pageRoute, s ?? undefined);
    },
    [pageRoute, hashForFn],
  );

  // Sync section when hash changes externally (browser back/forward)
  useEffect(() => {
    const onHash = () => setSectionState(sectionFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [sectionFromHash]);

  return { section, setSection };
}
