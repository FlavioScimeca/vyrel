import {
  authenticateAsync,
  hasHardwareAsync,
  isEnrolledAsync,
} from "expo-local-authentication";
import { getItemAsync, setItemAsync } from "expo-secure-store";
import { Button, Typography } from "heroui-native";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, type AppStateStatus, View } from "react-native";

import { authClient } from "@/lib/auth-client";

export type AppLockSettings = {
  backgroundTimeoutSeconds: 30;
  enabled: boolean;
};

type AppLockContextValue = {
  isAvailable: boolean;
  settings: AppLockSettings;
  updateEnabled: (enabled: boolean) => Promise<boolean>;
};

const APP_LOCK_KEY = "vyrel.app-lock.settings";
const DEFAULT_SETTINGS: AppLockSettings = {
  backgroundTimeoutSeconds: 30,
  enabled: false,
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

const readSettings = async (): Promise<AppLockSettings> => {
  const stored = await getItemAsync(APP_LOCK_KEY);
  if (stored === null) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<AppLockSettings>;
    return {
      backgroundTimeoutSeconds: 30,
      enabled: parsed.enabled === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const authenticate = async (): Promise<boolean> => {
  const result = await authenticateAsync({
    biometricsSecurityLevel: "strong",
    fallbackLabel: "Use Passcode",
    promptMessage: "Unlock Vyrel",
  });
  return result.success;
};

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const [settings, setSettings] = useState<AppLockSettings>(DEFAULT_SETTINGS);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    const didAuthenticate = await authenticate().catch(() => false);
    if (didAuthenticate) {
      setIsLocked(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([hasHardwareAsync(), isEnrolledAsync(), readSettings()])
      .then(([hasHardware, isEnrolled, storedSettings]) => {
        setIsAvailable(hasHardware && isEnrolled);
        setSettings(storedSettings);
        if (
          storedSettings.enabled &&
          session !== null &&
          session !== undefined
        ) {
          setIsLocked(true);
        }
      })
      .catch(() => undefined);
  }, [session]);

  useEffect(() => {
    if (isLocked) {
      unlock().catch(() => undefined);
    }
  }, [isLocked, unlock]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        backgroundedAt.current = Date.now();
        return;
      }

      if (
        nextState === "active" &&
        settings.enabled &&
        session !== null &&
        session !== undefined &&
        backgroundedAt.current !== null
      ) {
        const elapsedSeconds = (Date.now() - backgroundedAt.current) / 1000;
        if (elapsedSeconds >= settings.backgroundTimeoutSeconds) {
          setIsLocked(true);
        }
        backgroundedAt.current = null;
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [session, settings]);

  const updateEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (enabled && !isAvailable) {
        return false;
      }
      if (enabled && !(await authenticate().catch(() => false))) {
        return false;
      }

      const nextSettings: AppLockSettings = {
        backgroundTimeoutSeconds: 30,
        enabled,
      };
      await setItemAsync(APP_LOCK_KEY, JSON.stringify(nextSettings));
      setSettings(nextSettings);
      return true;
    },
    [isAvailable]
  );

  const value = useMemo<AppLockContextValue>(
    () => ({ isAvailable, settings, updateEnabled }),
    [isAvailable, settings, updateEnabled]
  );

  return (
    <AppLockContext.Provider value={value}>
      {isLocked ? (
        <View className="flex-1 items-center justify-center gap-5 bg-background px-8">
          <View className="items-center gap-2">
            <Typography.Heading className="text-3xl">
              Vyrel is locked
            </Typography.Heading>
            <Typography.Paragraph className="text-center">
              Authenticate with your device to continue.
            </Typography.Paragraph>
          </View>
          <Button onPress={unlock}>
            <Button.Label>Unlock Vyrel</Button.Label>
          </Button>
        </View>
      ) : (
        children
      )}
    </AppLockContext.Provider>
  );
}

export const useAppLock = (): AppLockContextValue => {
  const context = useContext(AppLockContext);
  if (context === null) {
    throw new Error("useAppLock must be used within AppLockProvider.");
  }
  return context;
};
