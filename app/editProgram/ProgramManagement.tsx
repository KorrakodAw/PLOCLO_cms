import AddButton from "../../components/AddButton";
import { Table, Column } from "../../components/Table";
import { useTranslation } from "next-i18next";

interface Program {
  programId: number;
  programNameEN: string;
  programNameTH: string;
  programAbbreviationEN: string;
  programAbbreviationTH: string;
  year: number;
}

const programColumns: Column<Program>[] = [
  { header: "Program Id", accessor: "programId" },
  { header: "Name (EN)", accessor: "programNameEN" },
  { header: "Name (TH)", accessor: "programNameTH" },
  { header: "Abbrev. (EN)", accessor: "programAbbreviationEN" },
  { header: "Abbrev. (TH)", accessor: "programAbbreviationTH" },
  { header: "Year", accessor: "year" },
  // {
  //   header: "Manage",
  //   accessor: "programId",
  //   render: (id) => (
  //     <>
  //       <button className="text-blue-600 hover:underline mr-2">Edit</button>
  //       <button className="text-red-600 hover:underline">Delete</button>
  //     </>
  //   ),
  // },
];

const mockPrograms = [
  {
    programId: 305173,
    programNameEN: "Computer Science",
    programNameTH: "วิทยาการคอมพิวเตอร์",
    programAbbreviationEN: "CS",
    programAbbreviationTH: "วคศ",
    year: 2024,
  },
  {
    programId: 305174,
    programNameEN: "Mechanical Engineering",
    programNameTH: "วิศวกรรมเครื่องกล",
    programAbbreviationEN: "ME",
    programAbbreviationTH: "วศก",
    year: 2023,
  },
  {
    programId: 305175,
    programNameEN: "Business Administration",
    programNameTH: "บริหารธุรกิจ",
    programAbbreviationEN: "BA",
    programAbbreviationTH: "บบช",
    year: 2022,
  },
];

export default function ProgramManagement() {
  const { t } = useTranslation("common");
  return (
    <div className=" mt-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-extralight">{t("program management")}</h1>
        <AddButton
          buttonText={t("create new program")}
          placeholderText={{
            code: t("Program Id"),
            nameEn: "Program Name (EN)",
            nameTh: "Program Name (TH)",
            abbrEn: "Program abbreviation (EN)",
            abbrTh: "Program abbreviation (TH)",
            year: "Year",
          }}
          submitButtonText={{
            insert: "Insert Program",
            upload: "Upload Program (Excel)",
          }}
        />
      </div>
      <hr className="my-3" />
      <p className="text-xl font-extralight">{t("program")}</p>
      {/* Table */}
      <Table<Program> columns={programColumns} data={mockPrograms} />
    </div>
  );
}
