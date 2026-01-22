// "use client";

// import React from "react";
// import {
//   ComposedChart,
//   Bar,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer,
//   LabelList,
// } from "recharts";
// import { FaChartPie } from "react-icons/fa";

// interface PLOData {
//   name: string;
//   total: number;
//   average: number;
// }

// // 2. Define the Interface for the Custom Label Props
// interface CustomLabelProps {
//   x?: number;
//   y?: number;
//   width?: number;
//   value?: number;
//   index?: number; // 1. Added index here
//   payload?: any;
// }
// // Mock Data
// const ploData = [
//   { name: "C1", total: 8.7, average: 6.5, max: 10, min: 2.5 },
//   { name: "C2", total: 15.7, average: 12.5, max: 20, min: 5.5 },
//   { name: "C3", total: 8.0, average: 4.5, max: 12, min: 1.5 },
//   { name: "C4", total: 16.2, average: 8.5, max: 18, min: 3.5 },
//   { name: "C5", total: 31.8, average: 25.5, max: 40, min: 10.5 },
//   { name: "C6", total: 19.6, average: 11.5, max: 25, min: 4.5 },
// ];
// // Custom Label Component (The White Box with Red Border)
// const CustomBarLabel = (props: CustomLabelProps) => {
//   // 2. Extract index from props
//   const { x, y, width, value, index } = props;

//   // 3. Get the correct name using the index to look up the original data
//   // We use (index ?? 0) to handle potential undefined, though Recharts always passes it.
//   const dataName = ploData[index ?? 0].name;

//   // Calculate center position
//   const cx = (x ?? 0) + (width ?? 0) / 2;
//   const cy = (y ?? 0) - 25; // Shift up above the bar

//   return (
//     <g>
//       <rect
//         x={cx - 35}
//         y={cy}
//         width="70"
//         height="22"
//         fill="white"
//         stroke="red"
//         strokeWidth="1"
//       />
//       <text
//         x={cx}
//         y={cy + 15}
//         fill="black"
//         textAnchor="middle"
//         fontSize="12"
//         fontWeight="500"
//       >
//         {/* 4. Use dataName instead of payload.name */}
//         {`${dataName}, ${value?.toFixed(2)}`}
//       </text>
//     </g>
//   );
// };

// export default function PLOChart() {
//   return (
//     <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 w-full">
//       <div className="flex justify-between items-center mb-6">
//         <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
//           <FaChartPie className="text-blue-500" /> PLO Achievement
//         </h2>
//       </div>

//       <div className="h-80 w-full">
//         <ResponsiveContainer width="100%" height="100%">
//           <ComposedChart
//             data={ploData}
//             margin={{ top: 30, right: 30, left: 0, bottom: 0 }}
//           >
//             <CartesianGrid strokeDasharray="3 3" vertical={false} />
//             <XAxis dataKey="name" />
//             <YAxis />
//             <Tooltip />
//             <Legend />

//             {/* The Bar (Total) - Cyan fill, Red Border */}
//             <Bar
//               dataKey="total"
//               name="Total"
//               barSize={60}
//               fill="#E0FFFF" // Light Cyan
//               stroke="#FF0000" // Red Border
//               strokeWidth={1}
//             >
//               <LabelList dataKey="total" content={<CustomBarLabel />} />
//             </Bar>

//             {/* The Line (Average) - Brown thick line */}
//             <Line
//               type="linear"
//               dataKey="average"
//               name="Average"
//               stroke="#8B4513"
//               strokeWidth={4}
//               dot={{
//                 stroke: "#8B4513",
//                 strokeWidth: 2,
//                 fill: "#8B4513",
//                 r: 4,
//               }}
//             />
//           </ComposedChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   );
// }
