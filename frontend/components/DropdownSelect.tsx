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
      <p className="mb-1 text-sm font-medium text-gray-700">{label}</p>
      <select
        value={value}
        onChange={onChange}
        className={`
      /* Layout & Sizing */
      w-full 
      py-2.5 px-3 
      text-base 
      font-normal 
      rounded-md 
      shadow-sm

      /* Color & Appearance */
      bg-white 
      border 
      border-gray-300 
      text-gray-900 
      cursor-pointer 
      
      /* Focus & Hover States */
      focus:ring-2 
      focus:ring-blue-500 
      focus:border-blue-500 
      outline-none 
      transition 
      duration-150 
      ease-in-out
      
      /* Disabled State */
      ${disabled ? "opacity-60 bg-gray-100 cursor-not-allowed" : ""}
    `}
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
