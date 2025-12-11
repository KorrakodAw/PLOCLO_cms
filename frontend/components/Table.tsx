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
      // Define breakpoints more clearly
      if (width < 640) setFontSize("text-xs"); // Extra Small screens
      else if (width < 1024) setFontSize("text-sm"); // Medium screens
      else setFontSize("text-base"); // Large screens and up
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Tailwind Color Mapping Utility
  const getColorClasses = (
    color?: string,
    type: "bg" | "hoverBg" | "text" = "bg"
  ) => {
    switch (color) {
      case "red":
        return type === "bg"
          ? "bg-red-500"
          : type === "hoverBg"
          ? "hover:bg-red-600"
          : "text-red-500";
      case "blue":
        return type === "bg"
          ? "bg-blue-500"
          : type === "hoverBg"
          ? "hover:bg-blue-600"
          : "text-blue-500";
      case "green":
        return type === "bg"
          ? "bg-green-500"
          : type === "hoverBg"
          ? "hover:bg-green-600"
          : "text-green-500";
      case "gray":
        return type === "bg"
          ? "bg-gray-400"
          : type === "hoverBg"
          ? "hover:bg-gray-500"
          : "text-gray-700";
      default:
        return type === "bg"
          ? "bg-gray-400"
          : type === "hoverBg"
          ? "hover:bg-gray-500"
          : "text-gray-700";
    }
  };

  return (
    // Outer container: Removed border, added slight shadow and rounded corners
    <div
      className={`overflow-x-auto mt-5 bg-white rounded-lg shadow-md ${className}`}
    >
      <table
        // Table element: Removed individual borders, using collapse for clean look
        className={`w-full ${fontSize} border-separate border-spacing-0`}
      >
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                // Header: Clean alignment, reduced horizontal padding, added border radius to corners
                className={`
                  text-left 
                  px-5 py-3 
                  font-semibold 
                  text-gray-600 
                  uppercase 
                  tracking-wider 
                  sticky top-0 
                  bg-gray-50 
                  border-b-2 border-gray-200 
                  ${col.className ?? ""}
                  ${i === 0 ? "rounded-tl-lg" : ""}
                  ${i === columns.length - 1 ? "rounded-tr-lg" : ""}
                `}
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
                className="text-center py-8 text-gray-500 border-t"
              >
                {t("no data available")}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              // Row: Added subtle border to separate rows, kept hover effect
              <tr
                key={rowIndex}
                className="border-t border-gray-100 transition-colors duration-150 hover:bg-orange-50"
              >
                {columns.map((col, colIndex) => {
                  const value = row[col.accessor];

                  // --------------- ACTIONS COLUMN ---------------
                  if (col.actions) {
                    return (
                      <td
                        key={colIndex}
                        className="px-5 py-3 align-middle whitespace-nowrap"
                      >
                        {/* Wrapper for buttons: Cleaned up spacing */}
                        <div className="flex gap-3 items-center">
                          {col.actions.map((action, i) => {
                            // Use Tailwind's text/hover color utilities for a cleaner link/outline look

                            const colorText = getColorClasses(
                              action.color,
                              "text"
                            );
                            const hoverText = action.hoverColor
                              ? getColorClasses(action.hoverColor, "text")
                              : "hover:text-gray-900";

                            return (
                              <button
                                key={i}
                                onClick={() => action.onClick(row)}
                                className={`
                                  ${colorText} ${hoverText} 
                                  font-medium 
                                  text-[16px] 
                                  cursor-pointer 
                                  transition-colors duration-150
                                  hover:underline 
                                  whitespace-nowrap 
                                  p-1
                                `}
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
                      // Data Cell: Adjusted padding, clean text color
                      className={`px-5 py-3 text-gray-700 align-middle ${
                        col.className ?? ""
                      }`}
                    >
                      {col.render
                        ? col.render(value, row)
                        : String(value) || "-"}
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
