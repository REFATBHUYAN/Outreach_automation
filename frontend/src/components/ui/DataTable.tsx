import type { ReactNode } from 'react';
import { eyebrowClass } from './typography';
import { EmptyState } from './EmptyState';

export interface Column<T> { header: string; cell: (row: T) => ReactNode; className?: string }

export function DataTable<T>({ columns, rows, rowKey, empty = 'Nothing here yet', selectedKey }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: string; selectedKey?: string }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left">
        <thead className="border-b border-border">
          <tr>{columns.map((c) => <th key={c.header} className={`px-4 py-2.5 ${eyebrowClass} ${c.className ?? ''}`}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className={`border-t border-border align-top transition-colors duration-100 first:border-t-0 ${selectedKey === rowKey(r) ? 'bg-accent' : 'hover:bg-muted'}`}>
              {columns.map((c) => <td key={c.header} className={`px-4 py-3 ${c.className ?? ''}`}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
