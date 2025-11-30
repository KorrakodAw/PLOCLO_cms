import { useTranslation } from "next-i18next";
import React, { useEffect, useState } from "react";

export interface TableAction<T> {
  label: string;
  color?: "blue" | "red" | "green" | "gray";
  hoverColor?: "blue" | "red" | "green" | "gray";
  onClick: (row: T) => void;
}

export interface Column<T> {
  header: string;
  accessor: Extract<keyof T, string>;
  className?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  actions?: TableAction<T>[];
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
}

export function Table<T>({ columns, data, className = "" }: TableProps<T>) {
  const [fontSize, setFontSize] = useState("text-sm");
  const { t } = useTranslation("common");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setFontSize("text-xs");
      else if (width < 1024) setFontSize("text-sm");
      else setFontSize("text-base");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={`overflow-x-auto mt-5 ${className}`}>
      <table
        className={`border border-gray-300 w-full ${fontSize} border-collapse`}
      >
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
                {t("no data available")}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-orange-50">
                {columns.map((col, colIndex) => {
                  const value = row[col.accessor];

                  // --------------- ACTIONS COLUMN ---------------
                  if (col.actions) {
                    return (
                      <td
                        key={colIndex}
                        // REMOVED 'flex gap-2' from here. Added 'align-middle'
                        className="px-4 py-2 border-b border-r border-gray-300 align-middle"
                      >
                        {/* ADDED DIV WRAPPER HERE */}
                        <div className="flex gap-2 items-center">
                          {col.actions.map((action, i) => {
                            const colorClass =
                              action.color === "red"
                                ? "bg-red-500"
                                : action.color === "blue"
                                ? "bg-blue-500"
                                : action.color === "green"
                                ? "bg-green-500"
                                : "bg-gray-500";

                            const hoverClass =
                              action.hoverColor === "red"
                                ? "hover:bg-red-600"
                                : action.hoverColor === "blue"
                                ? "hover:bg-blue-600"
                                : action.hoverColor === "green"
                                ? "hover:bg-green-600"
                                : "hover:bg-gray-600";

                            return (
                              <button
                                key={i}
                                onClick={() => action.onClick(row)}
                                className={`${colorClass} ${hoverClass} text-white px-2 py-1 rounded text-xs cursor-pointer whitespace-nowrap`}
                              >
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  }

                  // --------------- NORMAL COLUMN ---------------
                  return (
                    <td
                      key={colIndex}
                      className={`px-4 py-2 border-b border-r border-gray-300 align-middle ${
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
