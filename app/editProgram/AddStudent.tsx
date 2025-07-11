import AddButton from "../../components/AddButton";

export default function AddStudent() {
  return (
    <div className="mt-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-extralight">Student Management</h1>
        <AddButton
          buttonText="Create New Student"
          placeholderText={{
            code: "Student Code",
            nameEn: "Student Name (EN)",
            nameTh: "Student Name (TH)",
            abbrEn: "Student abbreviation (EN)",
            abbrTh: "Student abbreviation (TH)",
            year: "Year",
          }}
          submitButtonText={{
            insert: "Insert Student",
            upload: "Upload Student (Excel)",
          }}
        />
      </div>

      <hr className="my-3" />
      <h1 className="text-2xl font-extralight">Student List</h1>
    </div>
  );
}
