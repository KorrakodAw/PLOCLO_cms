import { useTranslation } from "next-i18next";
import React from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

const PaginationControlButton: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
}) => {
  const { t } = useTranslation("common");

  return (
    <div className="flex justify-center mt-4 gap-2">
      <button
        className={`px-3 py-1 border rounded disabled:opacity-50 
          ${page !== 1 ? "hover:text-white hover:bg-orange-500" : ""}`}
        disabled={page === 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        {t("previous")}
      </button>

      <span className="flex items-center">
        {t("page")} {page} {t("of")} {totalPages}
      </span>

      <button
        className={`px-3 py-1 border rounded disabled:opacity-50 
          ${page !== totalPages ? "hover:text-white hover:bg-orange-500" : ""}`}
        disabled={page === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        {t("next")}
      </button>
    </div>
  );
};

export default PaginationControlButton;
