import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { setCookie } from "@/lib/cookies";

export type ThemeMode = "light" | "dark";

const THEME_COOKIE_KEY = "theme";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: ThemeMode;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    setCookie(THEME_COOKIE_KEY, mode);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
