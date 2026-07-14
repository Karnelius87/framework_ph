"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <Button variant="outline" size="icon" aria-label="Toggle theme" onClick={() => setTheme(next)}>
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  );
}
