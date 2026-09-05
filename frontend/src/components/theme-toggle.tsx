"use client";

import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-sm",
        "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]",
        "hover:bg-[var(--bos-overlay)] transition-colors duration-150",
        className,
      )}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <motion.div
        key={theme}
        initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {theme === "light" ? (
          <Moon className="w-4 h-4" />
        ) : (
          <Sun className="w-4 h-4" />
        )}
      </motion.div>
    </button>
  );
}