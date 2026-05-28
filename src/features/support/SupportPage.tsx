import { useTranslation } from "react-i18next";
import coffeeRaw from "/assets/icons/line-md_buy-me-a-coffee-filled.svg?raw";

const coffeeIcon = coffeeRaw
  .replace(/fill="#6366F1"/gi, 'fill="var(--brand-accent)"')
  .replace(/stroke="#6366F1"/gi, 'stroke="var(--brand-accent)"')
  .replace(/\s(width|height)="\d+"/g, " ");

const githubIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`;

const linkedinIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`;

const telegramIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M21.5 2L1 10l7.5 3.5L12 21l4-10 5.5-9z"/><path d="M8.5 13.5l9-7"/></svg>`;

export function SupportPage() {
  const { t } = useTranslation();

  return (
    <>
      <h2>{t("support.title")}</h2>

      {/* Project description */}
      <div className="card" style={{ padding: "28px 24px", marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>{t("support.projectTitle")}</h3>
        <p style={{ fontSize: "0.92rem", lineHeight: 1.6, marginBottom: 12 }}>
          {t("support.projectDesc")}
        </p>
        <p style={{ fontSize: "0.85rem", lineHeight: 1.5, color: "var(--text-muted)", margin: 0 }}>
          {t("support.projectFeatures")}
        </p>
      </div>

      {/* Buy me a coffee card */}
      <div className="card" style={{ textAlign: "center", padding: "40px 24px", marginTop: 16 }}>
        <div
          style={{ width: 80, height: 80, margin: "0 auto 20px", color: "var(--brand-accent)" }}
          dangerouslySetInnerHTML={{ __html: coffeeIcon }}
        />
        <p style={{ fontSize: "1.05rem", marginBottom: 12, lineHeight: 1.5 }}>
          {t("support.desc")}
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.5 }}>
          {t("support.detail")}
        </p>
        <a
          href="https://www.buymeacoffee.com/widget/page/vl.demchyk?color=5F7FFF"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ fontSize: "1rem", padding: "12px 32px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <span dangerouslySetInnerHTML={{ __html: coffeeIcon }} style={{ width: 24, height: 24 }} />
          {t("support.cta")}
        </a>
      </div>

      {/* About the developer */}
      <div className="card" style={{ padding: "32px 24px", marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "var(--brand-gradient, linear-gradient(135deg, var(--brand), var(--brand-accent)))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: "1.3rem", flexShrink: 0,
            }}
          >
            VD
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>{t("support.author")}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{t("support.role")}</div>
          </div>
        </div>
        <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text)", margin: 0 }}>
          {t("support.about")}
        </p>
      </div>

      {/* Social links */}
      <div className="card" style={{ padding: "24px", marginTop: 16 }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 16px" }}>{t("support.social")}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <a
            href="https://github.com/vlad-demchyk"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, justifyContent: "flex-start", textDecoration: "none", padding: "10px 14px" }}
          >
            <span dangerouslySetInnerHTML={{ __html: githubIcon }} style={{ width: 22, height: 22, flexShrink: 0 }} />
            GitHub — vlad-demchyk
          </a>
          <a
            href="https://www.linkedin.com/in/vlad-demchyk-1a75b3327/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, justifyContent: "flex-start", textDecoration: "none", padding: "10px 14px" }}
          >
            <span dangerouslySetInnerHTML={{ __html: linkedinIcon }} style={{ width: 22, height: 22, flexShrink: 0 }} />
            LinkedIn
          </a>
          <a
            href="https://t.me/whmachine"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, justifyContent: "flex-start", textDecoration: "none", padding: "10px 14px" }}
          >
            <span dangerouslySetInnerHTML={{ __html: telegramIcon }} style={{ width: 22, height: 22, flexShrink: 0 }} />
            Telegram — @whmachine
          </a>
        </div>
      </div>

      {/* Docs pagination (placeholder) */}
      <div className="card" style={{ padding: "24px", marginTop: 16 }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 8 }}>{t("support.docs")}</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>
          {t("support.docsHint")}
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="btn btn-ghost" disabled>←</button>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>1 / 1</span>
          <button type="button" className="btn btn-ghost" disabled>→</button>
        </div>
      </div>
    </>
  );
}
