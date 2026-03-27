export const NoDataAvailable = ({
  alertMessage,
}: {
  alertMessage?: string;
}) => (
  <div className="mt-8 max-w-[1500px] bg-white p-12 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
    <div className="bg-slate-50 p-4 rounded-full mb-4">
      <svg
        className="w-12 h-12 text-slate-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
    <h3 className="text-xl font-bold text-slate-800">No Data Available</h3>
    <p className="text-slate-500 max-w-xs mt-2">
      {alertMessage || "There is no data to display for this course."}
    </p>
  </div>
);
