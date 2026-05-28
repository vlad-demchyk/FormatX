import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { showToast } from "../../../app/toast";
import { SignCanvas } from "./SignCanvas";
import { SignatureDrawer } from "./SignatureDrawer";
import { loadSignDocument, isCrossOriginIsolated } from "./loadDocument";
import { revokeSignPages } from "./pdfRender";
import {
  deleteSavedSignature,
  loadSavedSignature,
  saveSignature,
} from "./signatureStorage";
import type { SignDocumentSource } from "./types";
import { SIGN_ACCEPT } from "./types";

export function SignSection() {
  const { t } = useTranslation();
  const [savedSig, setSavedSig] = useState<string | null>(loadSavedSignature);
  const [mode, setMode] = useState<"create" | "sign" | null>(null);
  const [docSource, setDocSource] = useState<SignDocumentSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadMessage, setLoadMessage] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleSigSaved = useCallback((dataUrl: string) => {
    saveSignature(dataUrl);
    setSavedSig(dataUrl);
    setMode(null);
    showToast("toast.saved");
  }, []);

  const handleSigDelete = useCallback(() => {
    deleteSavedSignature();
    setSavedSig(null);
    showToast("toast.cleared");
  }, []);

  const handleDocFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      setLoading(true);
      setLoadError(null);
      setLoadMessage(t("documents.signLoadingDoc"));
      setDocSource(null);

      try {
        const source = await loadSignDocument(file, (msg) => setLoadMessage(msg));
        setDocSource(source);
        setMode("sign");
      } catch (err) {
        if (err instanceof Error && err.message === "COEP_REQUIRED") {
          setLoadError(t("documents.signUnsupportedEnv"));
        } else {
          setLoadError(err instanceof Error ? err.message : t("documents.signLoadError"));
        }
      } finally {
        setLoading(false);
        setLoadMessage("");
      }
    },
    [t],
  );

  const handleCloseCanvas = useCallback(() => {
    if (docSource) revokeSignPages(docSource.pages);
    setDocSource(null);
    setMode(null);
    setLoadError(null);
  }, [docSource]);

  useEffect(() => {
    return () => {
      if (docSource) revokeSignPages(docSource.pages);
    };
  }, [docSource]);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>{t("documents.signCreate")}</h3>

        {savedSig && mode !== "create" && (
          <div>
            <img
              src={savedSig}
              alt="Saved signature"
              style={{
                maxWidth: 240,
                maxHeight: 80,
                width: "auto",
                height: "auto",
                objectFit: "contain",
                border: "1px solid var(--border)",
                borderRadius: 6,
                display: "block",
                marginBottom: 12,
                background: "repeating-conic-gradient(#f5f5f5 0% 25%, #fff 0% 50%) 50% / 12px 12px",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setMode("create")}>
                {t("documents.signRedo")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleSigDelete}
                style={{ color: "var(--danger, #e74c3c)" }}
              >
                {t("documents.signDelete")}
              </button>
            </div>
          </div>
        )}

        {!savedSig && mode !== "create" && (
          <button type="button" className="btn btn-secondary" onClick={() => setMode("create")}>
            {t("documents.signCreate")}
          </button>
        )}

        {mode === "create" && (
          <SignatureDrawer onSave={handleSigSaved} onCancel={() => setMode(null)} />
        )}
      </div>

      {savedSig && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>{t("documents.signAddDoc")}</h3>

          {!docSource && !loading && (
            <label
              className="drop-zone"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px 16px",
                border: "2px dashed var(--border)",
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "2rem", marginBottom: 8 }}>📄</span>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                {t("documents.signDrop")}
              </span>
              {!isCrossOriginIsolated() && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 8 }}>
                  {t("documents.signDocNote")}
                </span>
              )}
              <input
                type="file"
                accept={SIGN_ACCEPT}
                onChange={handleDocFile}
                style={{ display: "none" }}
              />
            </label>
          )}

          {loading && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{loadMessage || t("documents.signLoadingDoc")}</p>
          )}

          {loadError && (
            <p style={{ color: "var(--danger, #e74c3c)", fontSize: "0.9rem", marginTop: 8 }}>{loadError}</p>
          )}

          {mode === "sign" && docSource && savedSig && (
            <SignCanvas source={docSource} sigDataUrl={savedSig} onClose={handleCloseCanvas} />
          )}
        </div>
      )}
    </div>
  );
}
