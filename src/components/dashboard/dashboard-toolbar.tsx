"use client";

import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function DashboardToolbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <div className="flex items-center gap-2 mr-1">
      <button
        onClick={() => {}}
        className="relative flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground shadow-sm"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
      </button>

      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="relative flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground shadow-sm"
        aria-label="Toggle theme"
      >
        {mounted && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isDark ? "dark" : "light"}
              initial={{ opacity: 0, rotate: -45, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 45, scale: 0.5 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </motion.div>
          </AnimatePresence>
        )}
      </button>
    </div>
  );
}
