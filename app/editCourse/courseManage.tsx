import AddButton from "../../components/AddButton";

const mockCourse = [
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
  return (
    <div className=" mt-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-extralight">Course Management</h1>
        <AddButton
          buttonText="Create New course"
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
      <p className="text-xl font-extralight">Course</p>

      {/* Table */}
      <div className="overflow-x-auto mt-5">
        <table className=" border border-gray-300 text-sm">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Course Id
              </th>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Course Name (EN)
              </th>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Course Name (TH)
              </th>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Course abbreviation (EN)
              </th>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Course abbreviation (TH)
              </th>
              <th className="text-left px-4 py-2 border-r border-gray-300">
                Year
              </th>
              <th className="text-left px-4 py-2">Manage</th>
            </tr>
          </thead>

          <tbody>
            {mockCourse.map((course) => (
              <tr key={course.courseId} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {course.courseId}
                </td>
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {course.courseNameEN}
                </td>
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {course.courseNameTH}
                </td>
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {course.courseAbbreviationEN}
                </td>
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {course.courseAbbreviationTH}
                </td>
                <td className="px-4 py-2 border-b border-r border-gray-300">
                  {course.year}
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
