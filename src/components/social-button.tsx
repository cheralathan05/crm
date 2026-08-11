"use client";

import { cn } from "@/lib/utils";

interface SocialButtonProps {
  provider: "google";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const providerConfig = {
  google: {
    label: "Continue with Google",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
};

export function SocialButton({
  provider,
  onClick,
  disabled = false,
  loading = false,
  className,
}: SocialButtonProps) {
  const config = providerConfig[provider];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "bos-btn bos-btn--secondary w-full",
        loading && "opacity-60",
        className,
      )}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="31.4 31.4"
              strokeLinecap="round"
              opacity="0.3"
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="var(--bos-accent)"
              strokeWidth="3"
              strokeDasharray="31.4 31.4"
              strokeLinecap="round"
              opacity="0.8"
            />
          </svg>
          <span>Connecting...</span>
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2.5">
          {config.icon}
          <span className="text-[13px]">{config.label}</span>
        </span>
      )}
    </button>
  );
}