import React, { useEffect, useState } from "react";

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
  const [fontSize, setFontSize] = useState("text-sm");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setFontSize("text-xs"); // mobile
      else if (width < 1024) setFontSize("text-sm"); // tablet
      else setFontSize("text-base"); // desktop
    };

    handleResize(); // initialize
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={`overflow-x-auto mt-5 ${className}`}>
      <table className={`border border-gray-300 w-full ${fontSize}`}>
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
              <tr key={rowIndex} className="hover:bg-orange-50">
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
