import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium mb-1 text-text-primary">{label}</label>}
        <select
          ref={ref}
          className={`w-full px-3 py-2 bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
