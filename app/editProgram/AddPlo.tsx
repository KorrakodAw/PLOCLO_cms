import AddButton from "../../components/AddButton";

export default function AddPlo() {
  return (
    <div className="mt-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-extralight">PLO Management</h1>
        <AddButton
          buttonText="Create New PLO"
          placeholderText={{
            code: "PLO Code",
            nameEn: "PLO Name (EN)",
            nameTh: "PLO Name (TH)",
            abbrEn: "PLO abbreviation (EN)",
            abbrTh: "PLO abbreviation (TH)",
            year: "Year",
          }}
          submitButtonText={{
            insert: "Insert PLO",
            upload: "Upload PLO (Excel)",
          }}
        />
      </div>

      <hr className="my-3" />
      <h1 className="text-2xl font-extralight">PLO List</h1>
    </div>
  );
}
