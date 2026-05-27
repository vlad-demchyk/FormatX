import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { tabIcons } from "../app/icons";

interface Props {
  active: string;
  onSelect: (route: "photo" | "documents" | "text" | "clipboard") => void;
  showClipboard?: boolean;
}

const ALL_TABS: { route: "photo" | "documents" | "text" | "clipboard"; labelKey: string }[] = [
  { route: "photo", labelKey: "tiles.photo" },
  { route: "documents", labelKey: "tiles.documents" },
  { route: "clipboard", labelKey: "tiles.clipboard" },
  { route: "text", labelKey: "tiles.classes" },
];

export function TabBar({ active, onSelect, showClipboard }: Props) {
  const { t } = useTranslation();
  const tabs = useMemo(
    () => (showClipboard ? ALL_TABS : ALL_TABS.filter((t) => t.route !== "clipboard")),
    [showClipboard],
  );

  return (
    <nav className="shell-tabs" role="tablist" aria-label={t("nav.tools")}>
      {tabs.map((tab) => (
        <button
          key={tab.route}
          type="button"
          role="tab"
          className="shell-tab"
          aria-selected={active === tab.route}
          aria-current={active === tab.route ? "page" : undefined}
          onClick={() => onSelect(tab.route)}
        >
          <span className="shell-tab__icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: tabIcons[tab.route] }} />
          <span className="shell-tab__label">{t(tab.labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}
