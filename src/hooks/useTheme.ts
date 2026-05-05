import { useEffect } from "react";
import { send } from "@/messaging/client";
import { onBroadcast } from "@/messaging/client";
import type { ThemeMode } from "@/types";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }
}

// Reads the user's themeMode pref on mount and whenever a prefs:changed
// broadcast fires. Cheap to call from every surface (side panel, popup,
// options) — they all need the override.
export function useTheme(): void {
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const prefs = await send({ type: "prefs:get" });
        if (!cancelled) applyTheme(prefs.themeMode);
      } catch {
        // background may be cold-starting; default to system
        if (!cancelled) applyTheme("system");
      }
    };
    refresh();
    const off = onBroadcast((msg) => {
      if (msg.type === "prefs:changed") refresh();
    });
    return () => {
      cancelled = true;
      off();
    };
  }, []);
}
