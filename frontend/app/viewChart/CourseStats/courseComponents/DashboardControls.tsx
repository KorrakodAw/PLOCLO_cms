import { ToggleButton } from "../../viewChartComponent/ToggleButton";

export const DashboardControls = ({
  displayMode,
  setDisplayMode,
  visibleLines,
  setVisibleLines,
  dataMode, // Prop ตัวเลือกโหมดข้อมูล
  setDataMode, // Prop ฟังก์ชันสลับโหมด
}: any) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    {/* 1. ส่วนเลือกรูปแบบกราฟ - แสดงผลเสมอ */}
    <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 w-fit">
      {["chart", "radar"].map((mode) => (
        <button
          key={mode}
          onClick={() => setDisplayMode(mode)}
          className={`px-6 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
            displayMode === mode
              ? "bg-white text-blue-600 shadow-md"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {mode === "chart" ? "Bar Chart" : "Radar Chart"}
        </button>
      ))}
    </div>

    {/* 2. ส่วนเลือกประเภทข้อมูล - 🟢 เช็คก่อนว่ามี Prop ส่งมาไหม */}
    {dataMode && setDataMode && (
      <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-sm">
        <button
          onClick={() => setDataMode("score")}
          className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${
            dataMode === "score"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          RAW SCORE
        </button>
        <button
          onClick={() => setDataMode("percent")}
          className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${
            dataMode === "percent"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          PERCENTAGE (%)
        </button>
      </div>
    )}

    {/* 3. ส่วนเปิด-ปิดเส้นกราฟ - แสดงผลเสมอ */}
    <div className="flex items-center gap-1.5 p-1">
      {[
        { key: "maxScore", label: "MAX", color: "#22c55e" },
        { key: "minScore", label: "MIN", color: "#ef4444" },
        { key: "allAvg", label: "AVG", color: "#6366f1" },
        { key: "midScore", label: "MED", color: "#f59e0b" },
      ].map((line) => (
        <ToggleButton
          key={line.key}
          label={line.label}
          active={visibleLines[line.key]}
          color={line.color}
          onClick={() =>
            setVisibleLines((p: any) => ({ ...p, [line.key]: !p[line.key] }))
          }
        />
      ))}
    </div>
  </div>
);
