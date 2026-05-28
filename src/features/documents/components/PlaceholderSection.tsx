import { useTranslation } from "react-i18next";

interface Props {
  titleKey: string;
  descKey: string;
  icon?: string;
}

export function PlaceholderSection({ titleKey, descKey, icon }: Props) {
  const { t } = useTranslation();

  return (
    <div style={{ textAlign: "center", padding: "48px 16px" }}>
      {icon && (
        <div style={{ fontSize: "3rem", marginBottom: 16, opacity: 0.3 }}>
          {icon}
        </div>
      )}
      <h3 style={{ marginBottom: 8 }}>{t(titleKey)}</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: 400, margin: "0 auto" }}>
        {t(descKey)}
      </p>
    </div>
  );
}
