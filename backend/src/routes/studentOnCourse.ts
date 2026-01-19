import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// --- GET: Fetch students for a specific section ---
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const { sectionId } = _req.query;

    if (!sectionId) {
      return res.status(400).json({ error: "sectionId is required" });
    }

    const result = await pool.query(
      `
      SELECT 
        sos.student_id,
        sos.section_id,
        sos."assignedAt", 
        c.name AS course_name,
        c.code AS course_code,
        cs.section,
        cs.semester,
        cs.year,
        s.student_code,
        s.first_name,
        s.last_name
      FROM student_on_section sos
      JOIN course_section cs ON sos.section_id = cs.id
      JOIN course c ON cs.course_id = c.id
      JOIN student s ON sos.student_id = s.id
      WHERE sos.section_id = $1
      ORDER BY s.id ASC
      `,
      [sectionId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch records", details: err.message });
  }
});

// --- POST: Bulk insert students into a section ---
router.post("/bulk", authenticateToken, async (req, res) => {
  const { sectionId, studentIds } = req.body;

  if (!sectionId)
    return res.status(400).json({ error: "sectionId is required" });
  if (!studentIds || !Array.isArray(studentIds)) {
    return res.status(400).json({ error: "studentIds must be a valid list" });
  }

  try {
    // 1. Get the course_code for the provided sectionId
    const sectionInfo = await pool.query(
      `SELECT c.code FROM course_section cs
       JOIN course c ON cs.course_id = c.id
       WHERE cs.id = $1`,
      [sectionId]
    );

    if (sectionInfo.rowCount === 0) {
      return res.status(404).json({ error: "Section not found" });
    }

    const courseCode = sectionInfo.rows[0].code;

    // 2. Identify students already enrolled in ANY section of this course code
    const existingEnrollments = await pool.query(
      `SELECT sos.student_id 
       FROM student_on_section sos
       JOIN course_section cs ON sos.section_id = cs.id
       JOIN course c ON cs.course_id = c.id
       WHERE c.code = $1 AND sos.student_id = ANY($2)`,
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
        "INSERT INTO student_on_section (student_id, section_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [sId, sectionId]
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

// --- DELETE: Remove a student from a section ---
router.delete("/:sectionId/:studentId", authenticateToken, async (req, res) => {
  const { sectionId, studentId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM student_on_section 
       WHERE section_id = $1 AND student_id = $2 
       RETURNING *`,
      [sectionId, studentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json({ message: "Student removed from section successfully" });
  } catch (err) {
    console.error("Error deleting record:", err);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

export default router;
