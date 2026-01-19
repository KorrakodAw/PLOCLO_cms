import ProtectedRoute from "@/components/ProtectedRoute";
import EditCourseClient from "./EditCourseClient";

export default function courseManageClient({
  params,
}: {
  params: { code: string };
}) {
  const courseCode = params.code;
  return (
    <ProtectedRoute roles={["system_admin", "instructor"]}>
      <div className="max-w-[1400px] h-full flex flex-col mx-auto">
        <EditCourseClient courseCode={courseCode} />
      </div>
    </ProtectedRoute>
  );
}
