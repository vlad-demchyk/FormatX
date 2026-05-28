import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { i18n, initI18n } from "../i18n";
import { getSettings } from "../../lib/db";

interface Props {
  children: ReactNode;
}

export function I18nProvider({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getSettings().then((s) => {
      document.documentElement.lang = s.locale;
      return initI18n(s.locale).then(() => setReady(true));
    });
  }, []);

  if (!ready) return null;

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}


