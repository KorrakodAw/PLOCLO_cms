import React from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  t?: (key: string) => string; // optional translation function
}

const PaginationControlButton: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  t,
}) => {
  return (
    <div className="flex justify-center mt-4 gap-2">
      <button
        className={`px-3 py-1 border rounded disabled:opacity-50 
          ${page !== 1 ? "hover:text-white hover:bg-orange-500" : ""}`}
        disabled={page === 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        {t ? t("previous") : "Previous"}
      </button>

      <span className="flex items-center">
        {page} / {totalPages}
      </span>

      <button
        className={`px-3 py-1 border rounded disabled:opacity-50 
          ${page !== totalPages ? "hover:text-white hover:bg-orange-500" : ""}`}
        disabled={page === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        {t ? t("next") : "Next"}
      </button>
    </div>
  );
};

export default PaginationControlButton;
