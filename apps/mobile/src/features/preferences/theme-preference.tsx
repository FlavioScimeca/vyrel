import { getItemAsync, setItemAsync } from "expo-secure-store";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { Uniwind } from "uniwind";

export type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const THEME_PREFERENCE_KEY = "vyrel.theme-preference";
const ThemePreferenceContext =
  createContext<ThemePreferenceContextValue | null>(null);

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemTheme = useColorScheme() === "dark" ? "dark" : "light";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    getItemAsync(THEME_PREFERENCE_KEY)
      .then((storedPreference) => {
        if (isThemePreference(storedPreference)) {
          setPreferenceState(storedPreference);
          Uniwind.setTheme(storedPreference);
        }
      })
      .catch(() => undefined);
  }, []);

  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    Uniwind.setTheme(nextPreference);
    setPreferenceState(nextPreference);
    await setItemAsync(THEME_PREFERENCE_KEY, nextPreference);
  }, []);

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      preference,
      resolvedTheme: preference === "system" ? systemTheme : preference,
      setPreference,
    }),
    [preference, setPreference, systemTheme]
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export const useThemePreference = (): ThemePreferenceContextValue => {
  const context = useContext(ThemePreferenceContext);
  if (context === null) {
    throw new Error(
      "useThemePreference must be used within ThemePreferenceProvider."
    );
  }
  return context;
};
