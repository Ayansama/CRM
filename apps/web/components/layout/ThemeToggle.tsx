"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white/70">
        <div className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium">Theme</span>
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all select-none"
    >
      <div className="flex items-center space-x-3">
        {isDark ? (
          <Moon className="w-4 h-4 flex-shrink-0" />
        ) : (
          <Sun className="w-4 h-4 flex-shrink-0" />
        )}
        <span className="text-sm font-medium">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      </div>
    </button>
  );
}
