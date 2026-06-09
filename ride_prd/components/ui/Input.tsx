import React from "react";
import { LucideIcon } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  startIcon?: LucideIcon;
  endIcon?: LucideIcon;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, startIcon: StartIcon, endIcon: EndIcon, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium mb-1 text-text-primary">{label}</label>}
        <div className="relative flex items-center">
          {StartIcon && <StartIcon className="absolute left-3 w-4 h-4 text-text-secondary" />}
          <input
            ref={ref}
            className={`w-full px-3 py-2 ${StartIcon ? "pl-10" : ""} ${EndIcon ? "pr-10" : ""} bg-white border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent ${className}`}
            {...props}
          />
          {EndIcon && <EndIcon className="absolute right-3 w-4 h-4 text-text-secondary" />}
        </div>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
