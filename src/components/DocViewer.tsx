import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { marked } from "marked";

/* ── Documentation manifest ── */

interface DocEntry {
  id: string;
  titleKey: string;
  file: string;
  icon: string;
}

const DOCS: DocEntry[] = [
  { id: "README",         titleKey: "docs.readme",         file: "README.md",         icon: "📖" },
  { id: "ARCHITECTURE",   titleKey: "docs.architecture",   file: "ARCHITECTURE.md",   icon: "🏗️" },
  { id: "FEATURES",       titleKey: "docs.features",       file: "FEATURES.md",       icon: "⚡" },
  { id: "LIBRARIES",      titleKey: "docs.libraries",      file: "LIBRARIES.md",      icon: "📦" },
  { id: "STORAGE",        titleKey: "docs.storage",        file: "STORAGE.md",        icon: "💾" },
  { id: "CONVERTER",      titleKey: "docs.converter",      file: "CONVERTER.md",      icon: "🔄" },
  { id: "IMAGE_CONVERTER",titleKey: "docs.imageConverter", file: "IMAGE_CONVERTER.md",icon: "🖼️" },
  { id: "SANITIZER",      titleKey: "docs.sanitizer",      file: "SANITIZER.md",      icon: "✏️" },
  { id: "I18N",           titleKey: "docs.i18n",           file: "I18N.md",           icon: "🌐" },
  { id: "STYLES",         titleKey: "docs.styles",         file: "STYLES.md",         icon: "🎨" },
  { id: "HOOKS",          titleKey: "docs.hooks",          file: "HOOKS.md",          icon: "🪝" },
  { id: "PWA",            titleKey: "docs.pwa",            file: "PWA.md",            icon: "📱" },
  { id: "SIGN_SECTION",   titleKey: "docs.signSection",    file: "SIGN_SECTION.md",   icon: "✍️" },
  { id: "GLOSSARY",       titleKey: "docs.glossary",       file: "GLOSSARY.md",       icon: "📚" },
  { id: "ANIMATION",      titleKey: "docs.animation",      file: "ANIMATION.md",      icon: "🎬" },
];

const DOCS_BASE = `${import.meta.env.BASE_URL}docs/uk/`;

/*
 * Custom marked renderer for documentation:
 *  - Internal links (no extension / .md files) → client-side navigation
 *  - External links → new tab
 *  - Tables wrapped for overflow
 */
const renderer = new marked.Renderer();

renderer.link = function ({ href, text, tokens }) {
  const content = tokens ? this.parser.parseInline(tokens) : text;

  if (!href) return content;

  // Internal doc reference (no path, no extension)
  if (!href.includes("://") && !href.includes("/") && !href.includes(".")) {
    return `<a href="#" class="doc-link doc-link--internal" data-doc="${href}">${content}</a>`;
  }

  // Relative link to a .md file → resolve to doc ID
  if (!href.includes("://") && href.endsWith(".md")) {
    const match = DOCS.find((d) => d.file === href || d.file.endsWith("/" + href));
    if (match) {
      return `<a href="#" class="doc-link doc-link--internal" data-doc="${match.id}">${content}</a>`;
    }
  }

  // Absolute URL or anchor
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="doc-link">${content}</a>`;
};

renderer.image = function ({ href, title, text }) {
  return `<img src="${href}" alt="${text}" title="${title || ""}" loading="lazy" class="doc-img" />`;
};

renderer.code = function ({ text, lang }) {
  const langClass = lang ? ` class="lang-${lang}"` : "";
  return `<pre${langClass}><code>${text}</code></pre>`;
};

renderer.table = function ({ header, rows }) {
  const thead = header.map((cell) => `<th>${cell.text}</th>`).join("");
  const tbody = rows
    .map((row) => `<tr>${row.map((cell) => (cell.header ? `<th>${cell.text}</th>` : `<td>${cell.text}</td>`)).join("")}</tr>`)
    .join("");
  return `<div class="doc-table-wrap"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
};

marked.setOptions({ renderer, gfm: true, breaks: false });

async function renderMarkdown(md: string): Promise<string> {
  return (await marked.parse(md, { async: true })) as string;
}

/* ── Component ── */

export function DocViewer() {
  const { t } = useTranslation();
  const [docId, setDocId] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListOpen, setIsListOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const currentDoc = useMemo(() => DOCS.find((d) => d.id === docId), [docId]);

  const loadDoc = useCallback(async (id: string) => {
    const entry = DOCS.find((d) => d.id === id);
    if (!entry) return;
    setDocId(id);
    setLoading(true);
    setError(null);
    setIsListOpen(false);
    try {
      const res = await fetch(`${DOCS_BASE}${entry.file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const md = await res.text();
      const html = await renderMarkdown(md);
      setContent(html);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("docs.loadError"));
      setContent("");
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load first doc on mount
  useEffect(() => {
    if (!docId && DOCS.length > 0) {
      void loadDoc(DOCS[0]!.id);
    }
  }, [docId, loadDoc]);

  // Scroll to top on doc change
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [docId]);

  const currentIndex = DOCS.findIndex((d) => d.id === docId);
  const prevDoc = currentIndex > 0 ? DOCS[currentIndex - 1] : null;
  const nextDoc = currentIndex < DOCS.length - 1 ? DOCS[currentIndex + 1] : null;

  // Handle internal doc links like [text](DOC_ID)
  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http")) return;
      e.preventDefault();
      // Check if it's a link to another doc (no extension = doc reference)
      if (!href.includes(".")) {
        void loadDoc(href);
      } else {
        // Relative link within docs — try to fetch the file
        const match = DOCS.find((d) => d.file === href || d.file.endsWith(href));
        if (match) void loadDoc(match.id);
      }
    },
    [loadDoc],
  );

  return (
    <div className="doc-viewer">
      {/* Document selector */}
      <div className="doc-viewer__selector">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setIsListOpen((o) => !o)}
          style={{ width: "100%", justifyContent: "space-between", display: "flex", alignItems: "center" }}
        >
          <span>
            {currentDoc ? `${currentDoc.icon} ${t(currentDoc.titleKey)}` : t("docs.select")}
          </span>
          <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>{isListOpen ? "▲" : "▼"}</span>
        </button>
        {isListOpen && (
          <div className="doc-viewer__list">
            {DOCS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`doc-viewer__item${d.id === docId ? " is-active" : ""}`}
                onClick={() => { setDocId(d.id); void loadDoc(d.id); }}
              >
                <span className="doc-viewer__item-icon">{d.icon}</span>
                <span className="doc-viewer__item-label">{t(d.titleKey)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content area */}
      <div
        ref={contentRef}
        className="doc-viewer__content"
        onClick={handleContentClick}
      >
        {loading && (
          <div className="doc-viewer__loading">
            <div className="doc-wasm-loading__spinner" />
            <p>{t("docs.loading")}</p>
          </div>
        )}
        {error && (
          <div className="doc-viewer__error">
            <p>⚠️ {error}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => docId && void loadDoc(docId)}>
              {t("docs.retry")}
            </button>
          </div>
        )}
        {!loading && !error && content && (
          <div className="doc-content" dangerouslySetInnerHTML={{ __html: content }} />
        )}
        {!loading && !error && !content && !docId && (
          <p className="doc-viewer__empty">{t("docs.selectHint")}</p>
        )}
      </div>

      {/* Pagination */}
      <div className="doc-viewer__pagination">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={!prevDoc}
          onClick={() => prevDoc && void loadDoc(prevDoc.id)}
        >
          ← {prevDoc ? t(prevDoc.titleKey) : "—"}
        </button>
        <span className="doc-viewer__page-num">
          {currentIndex + 1} / {DOCS.length}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={!nextDoc}
          onClick={() => nextDoc && void loadDoc(nextDoc.id)}
        >
          {nextDoc ? t(nextDoc.titleKey) : "—"} →
        </button>
      </div>
    </div>
  );
}
