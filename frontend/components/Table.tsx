import React from "react";

export interface Column<T> {
  header: string;
  accessor: Extract<keyof T, string>;
  className?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  emptyText?: string;
}

export function Table<T>({
  columns,
  data,
  className = "",
  emptyText = "No data found",
}: TableProps<T>) {
  return (
    <div className={`overflow-x-auto mt-5 ${className}`}>
      <table className="border border-gray-300 text-sm w-full">
        <thead className="bg-gray-100 border-b border-gray-300">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`text-left px-4 py-2 border-r border-gray-300 ${
                  col.className ?? ""
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-4 text-gray-400"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((col, colIndex) => {
                  const value = row[col.accessor];
                  return (
                    <td
                      key={colIndex}
                      className={`px-4 py-2 border-b border-r border-gray-300 ${
                        col.className ?? ""
                      }`}
                    >
                      {col.render ? col.render(value, row) : String(value)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
