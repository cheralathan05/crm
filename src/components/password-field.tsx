"use client";

import { useState, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  id?: string;
  disabled?: boolean;
}

export function PasswordField({
  value,
  onChange,
  placeholder = "Enter your password",
  error,
  autoComplete = "current-password",
  id = "password",
  disabled = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const toggle = useCallback(
    () => setVisible((v) => !v),
    [],
  );

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={cn(
            "bos-input pr-10",
            error && "error",
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2",
            "flex items-center justify-center",
            "w-10 h-10",
            "text-[var(--bos-text-tertiary)]",
            "hover:text-[var(--bos-text-secondary)]",
            "transition-colors duration-150",
          )}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          <motion.div
            key={visible ? "visible" : "hidden"}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.12 }}
          >
            {visible ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </motion.div>
        </button>
      </div>
    </div>
  );
}