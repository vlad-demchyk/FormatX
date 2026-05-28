import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSettings, saveSettings, type ThemeMode } from "../../lib/db";

interface ThemeContextValue {
  theme: ThemeMode;
  toggle: () => Promise<void>;
  setTheme: (t: ThemeMode) => Promise<void>;
}

const ThemeCtx = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    void getSettings().then((s) => {
      setThemeState(s.theme);
      document.documentElement.setAttribute("data-theme", s.theme);
    });
  }, []);

  async function applyTheme(t: ThemeMode) {
    document.documentElement.setAttribute("data-theme", t);
    setThemeState(t);
    const settings = await getSettings();
    await saveSettings({ ...settings, theme: t });
  }

  return (
    <ThemeCtx.Provider
      value={{
        theme,
        toggle: () => applyTheme(theme === "light" ? "dark" : "light"),
        setTheme: applyTheme,
      }}
    >
      {children}
    </ThemeCtx.Provider>
  );
}
