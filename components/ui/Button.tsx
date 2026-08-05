import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, className = "", disabled, ...props }, ref) => {
    const baseClasses = "font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

    const variantClasses = {
      primary: "bg-brand-blue text-white hover:bg-[#4A5ABF] shadow-sm hover:shadow",
      secondary: "border border-border text-text-primary hover:bg-ops-bg",
      ghost: "text-text-primary hover:bg-ops-bg",
      danger: "bg-danger text-white hover:bg-[#d03030]",
    };

    const sizeClasses = {
      sm: "px-2 py-1 text-xs",
      md: "px-3 py-2 text-sm",
      lg: "px-4 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {props.children}
      </button>
    );
  }
);

Button.displayName = "Button";
