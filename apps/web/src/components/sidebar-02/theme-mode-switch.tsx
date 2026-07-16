"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

export function ThemeModeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      setTheme(checked ? "dark" : "light");
    },
    [setTheme]
  );

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
        onCheckedChange={handleCheckedChange}
      />
      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
        <span>Dark</span>
        <IconMoon className="size-4" />
      </div>
    </div>
  );
}
