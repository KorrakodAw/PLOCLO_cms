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

const mockPrograms: Program[] = [
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
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  const programColumns: Column<Program>[] = [
    { header:t("program id"), accessor: "programId" },
    lang === "en"
      ? { header: "Name", accessor: "programNameEN" }
      : { header: "ชื่อแผนการเรียน", accessor: "programNameTH" },
    lang === "en"
      ? { header: "Abbrev.", accessor: "programAbbreviationEN" }
      : { header: "ชื่อย่อ", accessor: "programAbbreviationTH" },
    { header: t("year"), accessor: "year" },
  ];

  return (
    <div className="mt-5">
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
      <Table<Program> columns={programColumns} data={mockPrograms} />
    </div>
  );
}
