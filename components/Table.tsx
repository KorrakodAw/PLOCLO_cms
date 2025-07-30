// // components/GenericTable.tsx
// import React from "react";

// export interface Column<T> {
//   header: string;
//   accessor: Extract<keyof T, string>;
//   className?: string;
//   /**
//    * ถ้ามี render จะถูกเรียกแทนการแสดงค่า row[accessor]
//    * @param value ค่า row[accessor]
//    * @param row ทั้ง object แถวนี้
//    */
//   render?: (value: T[keyof T], row: T) => React.ReactNode;
// }

// export interface TableProps<T> {
//   columns: Column<T>[];
//   data: T[];
// }

// export function Table<T>({ columns, data }: TableProps<T>) {
//   return (
//     <div className="overflow-x-auto mt-5">
//       <table className="border border-gray-300 text-sm w-full">
//         <thead className="bg-gray-100 border-b border-gray-300">
//           <tr>
//             {columns.map((col, i) => (
//               <th
//                 key={i}
//                 className={`text-left px-4 py-2 border-r border-gray-300 ${
//                   col.className ?? ""
//                 }`}
//               >
//                 {col.header}
//               </th>
//             ))}
//           </tr>
//         </thead>

//         <tbody>
//           {data.map((row, rowIndex) => (
//             <tr key={rowIndex} className="hover:bg-gray-50">
//               {columns.map((col, colIndex) => {
//                 const value = row[col.accessor];
//                 return (
//                   <td
//                     key={colIndex}
//                     className={`px-4 py-2 border-b border-r border-gray-300 ${
//                       col.className ?? ""
//                     }`}
//                   >
//                     {col.render ? col.render(value, row) : String(value)}
//                   </td>
//                 );
//               })}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

import React from "react";
import { useTranslation } from "react-i18next";

export interface Column<T> {
  header: string;
  accessor: Extract<keyof T, string>;
  className?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
}

export function Table<T>({ columns, data }: TableProps<T>) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language; // e.g., 'en' or 'th'

  // กรองเฉพาะ columns ที่ลงท้ายด้วย _<lang> หรือไม่ระบุภาษา
  const filteredColumns = columns.filter((col) => {
    // column เช่น 'name_en' จะผ่านเฉพาะตอนภาษา 'en'
    const suffix = `_${currentLang}`;
    return col.accessor.endsWith(suffix) || !col.accessor.includes("_");
  });

  return (
    <div className="overflow-x-auto mt-5">
      <table className="border border-gray-300 text-sm w-full">
        <thead className="bg-gray-100 border-b border-gray-300">
          <tr>
            {filteredColumns.map((col, i) => (
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
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {filteredColumns.map((col, colIndex) => {
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
