import AddButton from "../../components/AddButton";

const mockPrograms = [
  {
    programCode: 305173,
    programNameEN: "Computer Science",
    programNameTH: "วิทยาการคอมพิวเตอร์",
    programAbbreviationEN: "CS",
    programAbbreviationTH: "วคศ",
    year: 2024,
  },
  {
    programCode: 305174,
    programNameEN: "Mechanical Engineering",
    programNameTH: "วิศวกรรมเครื่องกล",
    programAbbreviationEN: "ME",
    programAbbreviationTH: "วศก",
    year: 2023,
  },
  {
    programCode: 305175,
    programNameEN: "Business Administration",
    programNameTH: "บริหารธุรกิจ",
    programAbbreviationEN: "BA",
    programAbbreviationTH: "บบช",
    year: 2022,
  },
];

export default function ProgramManagement() {
  return (
    <div className=" mt-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-extralight">Program Management</h1>
        <AddButton />
      </div>

      <hr className="my-3" />
      <p className="text-xl font-extralight">Program</p>

      {/* Table */}
      <div className="overflow-x-auto mt-5">
        <table className=" border border-gray-300 text-sm">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Program Code
              </th>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Program Name (EN)
              </th>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Program Name (TH)
              </th>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Program abbreviation (EN)
              </th>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Program abbreviation (TH)
              </th>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Year
              </th>
              <th className="text-left px-4 py-2">Manage</th>
            </tr>
          </thead>

          <tbody>
            {mockPrograms.map((program, index) => (
              <tr key={program.programCode} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {program.programCode}
                </td>
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {program.programNameEN}
                </td>
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {program.programNameTH}
                </td>
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {program.programAbbreviationEN}
                </td>
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {program.programAbbreviationTH}
                </td>
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {program.year}
                </td>
                <td className="px-4 py-2 border-b border-gray-300">
                  <button className="text-blue-600 hover:underline mr-2">
                    Edit
                  </button>
                  <button className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
