import AddButton from "../../components/AddButton";
import { Table, Column } from "../../components/Table";
import { useTranslation } from "next-i18next";

interface Course {
  courseId: number;
  courseNameEN: string;
  courseNameTH: string;
  courseAbbreviationEN: string;
  courseAbbreviationTH: string;
  year: number;
}

const mockCourse: Course[] = [
  {
    courseId: 401201,
    courseNameEN: "Artificial Intelligence",
    courseNameTH: "ปัญญาประดิษฐ์",
    courseAbbreviationEN: "AI",
    courseAbbreviationTH: "ปปด",
    year: 2025,
  },
  {
    courseId: 401202,
    courseNameEN: "Data Science",
    courseNameTH: "วิทยาการข้อมูล",
    courseAbbreviationEN: "DS",
    courseAbbreviationTH: "วดข",
    year: 2025,
  },
  {
    courseId: 401203,
    courseNameEN: "Cybersecurity",
    courseNameTH: "ความมั่นคงทางไซเบอร์",
    courseAbbreviationEN: "CY",
    courseAbbreviationTH: "คมซ",
    year: 2024,
  },
  {
    courseId: 401204,
    courseNameEN: "Digital Marketing",
    courseNameTH: "การตลาดดิจิทัล",
    courseAbbreviationEN: "DM",
    courseAbbreviationTH: "กตด",
    year: 2023,
  },
  {
    courseId: 401205,
    courseNameEN: "Robotics Engineering",
    courseNameTH: "วิศวกรรมหุ่นยนต์",
    courseAbbreviationEN: "RE",
    courseAbbreviationTH: "วศห",
    year: 2023,
  },
];

export default function CourseManagement() {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  const courseColumns: Column<Course>[] = [
    { header: t("course id"), accessor: "courseId" },
    lang === "en"
      ? { header: "Name", accessor: "courseNameEN" }
      : { header: "ชื่อหลักสูตร", accessor: "courseNameTH" },
    lang === "en"
      ? { header: "Abbrev.", accessor: "courseAbbreviationEN" }
      : { header: "ชื่อย่อ", accessor: "courseAbbreviationTH" },
    { header: t("year"), accessor: "year" },
  ];

  return (
    <div className="mt-5">
      <div className=" flex justify-between">
        <h1 className="text-2xl font-extralight">{t("course management")}</h1>
        <AddButton
          buttonText={t("create new course")}
          placeholderText={{
            code: "Course Id",
            nameEn: "Course Name (EN)",
            nameTh: "Course Name (TH)",
            abbrEn: "Course abbreviation (EN)",
            abbrTh: "Course abbreviation (TH)",
            year: "Year",
          }}
          submitButtonText={{
            insert: "Insert Course",
            upload: "Upload Course (Excel)",
          }}
        />
      </div>
      <hr className="my-3" />
      <p className="text-xl font-extralight">{t("course")}</p>
      {/* Table */}
      <Table<Course> columns={courseColumns} data={mockCourse} />
    </div>
  );
}
