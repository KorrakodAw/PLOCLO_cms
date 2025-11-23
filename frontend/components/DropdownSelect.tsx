import React from "react";

interface Option {
  label: string | number;
  value: string | number;
}

interface DropdownSelectProps {
  disabled?: boolean;
  label?: string | number;
  value: string | number;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
}

const DropdownSelect: React.FC<DropdownSelectProps> = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <p className="mb-1">{label}</p>
      <select
        value={value}
        onChange={onChange}
        className={`bg-gray-500 p w-full max-w-md font-extralight text-white rounded text-center cursor-pointer ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={disabled}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DropdownSelect;
