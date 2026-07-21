"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

/**
 * A dropdown you can type into to filter — a combobox. Drop-in replacement for a plain
 * <Select> where the option list may grow large (customers, vendors, vehicle types…).
 * Keyboard: ↑/↓ to move, Enter to pick, Esc to close. Click-outside closes.
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Search…",
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const select = (opt: Option) => {
    onChange(opt.value);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        type="text"
        value={open ? query : selectedLabel}
        placeholder={selectedLabel || placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlight(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const opt = filtered[highlight];
            if (opt) select(opt);
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        className="w-full px-3 py-2 bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-auto bg-white border border-border rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-secondary">No matches</div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(opt);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-brand-blue/10 ${
                  i === highlight ? "bg-brand-blue/10" : ""
                } ${opt.value === value ? "font-medium text-brand-blue" : "text-text-primary"}`}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

SearchableSelect.displayName = "SearchableSelect";
