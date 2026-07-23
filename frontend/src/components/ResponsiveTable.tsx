import type { ReactNode } from 'react';
export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  /** Show this column as the card heading on mobile instead of a labeled row */
  isTitle?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
}

function getValue<T>(row: T, key: string): ReactNode {
  return (row as Record<string, unknown>)[key] as ReactNode;
}

export default function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const titleCol = columns.find((c) => c.isTitle) ?? columns[0];
  const restCols = columns.filter((c) => c !== titleCol);

  return (
    <>
      {/* Desktop / tablet: standard table */}
      <div className="hidden md:block border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left font-medium text-slate-500 text-xs uppercase tracking-wide px-4 py-3 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {col.render ? col.render(row) : getValue(row, col.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div
            key={keyExtractor(row)}
            className="border border-slate-200 bg-white p-4"
          >
            <p className="font-medium text-slate-900 text-sm mb-2">
              {titleCol.render ? titleCol.render(row) : getValue(row, titleCol.key)}
            </p>
            <dl className="space-y-1.5">
              {restCols.map((col) => (
                <div key={col.key} className="flex items-center justify-between text-sm">
                  <dt className="text-slate-500">{col.label}</dt>
                  <dd className="text-slate-800 text-right">
                    {col.render ? col.render(row) : getValue(row, col.key)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}