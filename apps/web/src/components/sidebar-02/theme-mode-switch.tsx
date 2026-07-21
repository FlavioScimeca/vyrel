"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Switch } from "@/components/ui/switch";

function subscribe() {
  return () => {
    /* noop — client snapshot is constant after hydrate */
  };
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeModeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center justify-between gap-3 px-2 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
        <IconSun className="size-4" />
        <span>Light</span>
      </div>
      <Switch
        aria-label="Toggle dark mode"
        checked={mounted ? isDark : false}
        disabled={!mounted}
        onCheckedChange={(checked) => {
          setTheme(checked ? "dark" : "light");
        }}
      />
      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
        <span>Dark</span>
        <IconMoon className="size-4" />
      </div>
    </div>
  );
}
