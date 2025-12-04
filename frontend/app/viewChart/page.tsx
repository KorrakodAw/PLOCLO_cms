"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
} from "recharts";
import { FaChartPie, FaFilter, FaDownload } from "react-icons/fa";

// --- MOCK DATA ---

// 1. PLO Achievement Data (Bar Chart)
const ploData = [
  { name: "PLO1", score: 85, target: 75, fullMark: 100 },
  { name: "PLO2", score: 65, target: 75, fullMark: 100 },
  { name: "PLO3", score: 92, target: 75, fullMark: 100 },
  { name: "PLO4", score: 78, target: 75, fullMark: 100 },
  { name: "PLO5", score: 55, target: 75, fullMark: 100 },
  { name: "PLO6", score: 88, target: 75, fullMark: 100 },
];

// 2. Student Grade Distribution (Area Chart)
const gradeData = [
  { grade: "A", students: 28 },
  { grade: "B+", students: 18 },
  { grade: "B", students: 25 },
  { grade: "C+", students: 15 },
  { grade: "C", students: 10 },
  { grade: "D", students: 5 },
  { grade: "F", students: 2 },
];

// 3. Skills Radar (Radar Chart)
const skillData = [
  { subject: "Coding", A: 120, fullMark: 150 },
  { subject: "Communication", A: 98, fullMark: 150 },
  { subject: "Math", A: 86, fullMark: 150 },
  { subject: "Design", A: 99, fullMark: 150 },
  { subject: "Management", A: 85, fullMark: 150 },
  { subject: "History", A: 65, fullMark: 150 },
];

export default function ViewChart() {
  // Mock State for Filters
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedSemester, setSelectedSemester] = useState("1");

  return (
    <div className="w-full p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-light text-gray-800">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of Program Learning Outcomes (PLOs) & Student Performance
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition">
          <FaDownload /> Export Report
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center mb-8">
        <div className="flex items-center gap-2 text-gray-600 font-medium mr-4">
          <FaFilter /> Filters:
        </div>

        <select
          className="border rounded-md px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="2024">Academic Year 2024</option>
          <option value="2023">Academic Year 2023</option>
        </select>

        <select
          className="border rounded-md px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
        >
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
        </select>

        <select className="border rounded-md px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none">
          <option>Software Engineering</option>
          <option>Computer Science</option>
        </select>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm uppercase font-bold">
            Total Students
          </h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">142</p>
          <p className="text-green-500 text-xs mt-1">↑ 12% from last year</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
          <h3 className="text-gray-500 text-sm uppercase font-bold">
            Avg PLO Score
          </h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">78.4%</p>
          <p className="text-red-500 text-xs mt-1">↓ 2% from target</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm uppercase font-bold">
            Course Pass Rate
          </h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">94%</p>
          <p className="text-green-500 text-xs mt-1">↑ 5% from last year</p>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CHART 1: PLO Performance (Bar) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
              <FaChartPie className="text-blue-500" /> PLO Achievement
            </h2>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ploData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="score"
                  fill="#3b82f6"
                  name="Actual Score"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="target"
                  fill="#d1d5db"
                  name="Target Score"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Skills Radar */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-700">Competency Map</h2>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis />
                <Radar
                  name="Class Average"
                  dataKey="A"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Grade Distribution (Full Width) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-700">
              Grade Distribution Trend
            </h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={gradeData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="students"
                  stroke="#10b981"
                  fill="#d1fae5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
