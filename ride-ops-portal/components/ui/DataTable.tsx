'use client';

import React, { useState, useMemo, forwardRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T;
  pageSize?: number;
  className?: string;
}

export const DataTable = forwardRef<HTMLDivElement, DataTableProps<any>>(
  ({ columns, data, rowKey, pageSize = 10, className = '' }, ref) => {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(0);

    const sorted = useMemo(() => {
      if (!sortKey) return data;
      const col = columns.find((c) => String(c.key) === sortKey);
      if (!col) return data;

      return [...data].sort((a, b) => {
        const aVal = a[sortKey as keyof typeof a];
        const bVal = b[sortKey as keyof typeof b];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }, [data, sortKey, sortDir, columns]);

    const paginated = useMemo(() => {
      const start = page * pageSize;
      return sorted.slice(start, start + pageSize);
    }, [sorted, page, pageSize]);

    const handleSort = (key: string) => {
      if (sortKey === key) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
      setPage(0);
    };

    const totalPages = Math.ceil(sorted.length / pageSize);

    return (
      <div ref={ref} className={`${className}`}>
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-table-header border-b border-border">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={`${String(col.key)}-${idx}`}
                    className={`px-4 py-3 text-left font-medium text-[#3D434A] ${col.width || ''}`}
                  >
                    {col.sortable ? (
                      <button
                        onClick={() => handleSort(String(col.key))}
                        className="flex items-center gap-2 hover:text-[#2563EB]"
                      >
                        {col.label}
                        {sortKey === String(col.key) && (
                          sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row) => (
                <tr key={String(row[rowKey])} className="border-b border-border hover:bg-ops-bg">
                  {columns.map((col, idx) => (
                    <td key={`${row[rowKey]}-${idx}`} className="px-4 py-3 text-[#3D434A]">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <span className="text-xs text-[#8B8FA8]">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 border border-border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="px-3 py-1 border border-border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

DataTable.displayName = 'DataTable';
