import React from "react";

interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  dark?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, hint, required, children, dark = false }) => {
  const labelColor = dark ? "text-white" : "text-text-primary";
  const hintColor = dark ? "text-white/80" : "text-text-secondary";
  const errorColor = dark ? "text-danger" : "text-danger";

  return (
    <div className="w-full">
      {label && (
        <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && <p className={`text-xs ${hintColor}`}>{hint}</p>}
      {error && <p className={`text-xs ${errorColor} mt-1`}>{error}</p>}
    </div>
  );
};

FormField.displayName = "FormField";
