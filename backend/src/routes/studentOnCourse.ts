import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// --- GET: Fetch students for a specific course ---
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const { courseId } = _req.query;

    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const result = await pool.query(
      `
      SELECT 
        soc.student_id,
        soc.course_id,
        soc."assignedAt", 
        c.name AS course_name,
        c.code AS course_code,
        s.student_id AS student_code,
        s.first_name,
        s.last_name
      FROM student_on_course soc
      JOIN course c ON soc.course_id = c.id
      JOIN student s ON soc.student_id = s.id
      WHERE soc.course_id = $1
      ORDER BY s.student_id ASC
      `,
      [courseId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch records", details: err.message });
  }
});

// --- POST: Bulk insert students into a course ---
router.post("/bulk", authenticateToken, async (req, res) => {
  const { courseId, studentIds } = req.body;

  if (!courseId) return res.status(400).json({ error: "courseId is required" });
  if (!studentIds || !Array.isArray(studentIds)) {
    return res.status(400).json({ error: "studentIds must be a valid list" });
  }

  try {
    // 1. Get the course_code for the provided courseId
    const courseInfo = await pool.query(
      "SELECT code FROM course WHERE id = $1",
      [courseId]
    );

    if (courseInfo.rowCount === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const courseCode = courseInfo.rows[0].code;

    // 2. Identify students already enrolled in ANY course with this same code
    const existingEnrollments = await pool.query(
      `SELECT student_id 
       FROM student_on_course soc
       JOIN course c ON soc.course_id = c.id
       WHERE c.code = $1 AND soc.student_id = ANY($2)`,
      [courseCode, studentIds]
    );

    const alreadyEnrolledIds = existingEnrollments.rows.map(
      (row) => row.student_id
    );

    // 3. Filter the list to only include students NOT already in this course code
    const studentsToAdd = studentIds.filter(
      (id) => !alreadyEnrolledIds.includes(id)
    );

    if (studentsToAdd.length === 0) {
      return res.status(400).json({
        error:
          "All selected students are already enrolled in a section of this course code.",
      });
    }

    // 4. Perform the bulk insert for valid students
    const queries = studentsToAdd.map((sId: number) =>
      pool.query(
        "INSERT INTO student_on_course (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [sId, courseId]
      )
    );

    await Promise.all(queries);

    res.json({
      message: `Successfully assigned ${studentsToAdd.length} students.`,
      skippedCount: alreadyEnrolledIds.length,
    });
  } catch (err: any) {
    console.error("Bulk insert error:", err);
    res
      .status(500)
      .json({ error: "Failed to assign students", details: err.message });
  }
});

// --- DELETE: Remove a student from a course ---
// FIX: Use both studentId and courseId because there is no single "id" column
router.delete("/:courseId/:studentId", authenticateToken, async (req, res) => {
  const { courseId, studentId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM student_on_course 
       WHERE course_id = $1 AND student_id = $2 
       RETURNING *`,
      [courseId, studentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json({ message: "Student removed from course successfully" });
  } catch (err) {
    console.error("Error deleting record:", err);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

export default router;
