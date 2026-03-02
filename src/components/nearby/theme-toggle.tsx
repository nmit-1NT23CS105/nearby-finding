"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const current = theme || "system";
  const icon =
    current === "dark" ? <Moon className="h-4 w-4" /> : current === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border bg-card px-2 py-1">
      <Button size="sm" variant={current === "light" ? "secondary" : "ghost"} onClick={() => setTheme("light")}>
        <Sun className="h-4 w-4" />
      </Button>
      <Button size="sm" variant={current === "dark" ? "secondary" : "ghost"} onClick={() => setTheme("dark")}>
        <Moon className="h-4 w-4" />
      </Button>
      <Button size="sm" variant={current === "system" ? "secondary" : "ghost"} onClick={() => setTheme("system")}>
        <Monitor className="h-4 w-4" />
      </Button>
      <span className="hidden items-center gap-1 text-xs text-muted-foreground md:inline-flex">
        {icon}
        {current}
      </span>
    </div>
  );
}
