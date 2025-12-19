import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

/**
 * ✅ GET all students with program info
 */
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const programId = parseInt(_req.query.programId as string);

    if (!programId) {
      return res.status(400).json({ error: "Program ID is required" });
    }

    const result = await pool.query(
      `SELECT 
        student.id,
        student.student_id,
        student.first_name,
        student.last_name,
        student.program_id,
        p.program_shortname_en,
        p.program_shortname_th,
        p.program_name_en,
        p.program_name_th
      FROM student 
      JOIN program p ON student.program_id = p.id
      WHERE student.program_id = $1
      ORDER BY student.id DESC`,
      [programId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

/**
 * ✅ POST create new student
 */
router.post("/", authenticateToken, async (req, res) => {
  const { student_id, first_name, last_name, program_id } = req.body;

  if (!student_id || !first_name || !last_name || !program_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO student 
        (student_id, first_name, last_name, program_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [student_id, first_name, last_name, program_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("Error creating student:", err);

    // Check for duplicate or constraint errors
    if (err.code === "23505") {
      res.status(400).json({ error: "Student ID or email already exists" });
    } else if (err.code === "23503") {
      res
        .status(400)
        .json({ error: "Invalid program_id — referenced program not found" });
    } else {
      res.status(500).json({ error: "Failed to create student" });
    }
  }
});

/**
 * ✅ GET paginated students
 */
router.get("/paginate", authenticateToken, async (req, res) => {
  try {
    const universityId = req.query.universityId as string | undefined;
    const facultyId = req.query.facultyId as string | undefined;
    const programId = req.query.programId as string | undefined;
    const year = req.query.year as string | undefined;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT  
        student.id,
        student.student_id,
        student.first_name,
        student.last_name,
        student.program_id,
        program.program_shortname_th,
        program.program_shortname_en,
        program.program_year
      FROM student
      JOIN program ON student.program_id = program.id
      JOIN faculty ON program.faculty_id = faculty.id
      JOIN university ON faculty.university_id = university.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (universityId) {
      params.push(universityId);
      query += ` AND university.id = $${params.length}`;
    }
    if (facultyId) {
      params.push(facultyId);
      query += ` AND faculty.id = $${params.length}`;
    }
    if (programId) {
      params.push(programId);
      query += ` AND program.program_code = $${params.length}`;
    }
    if (year) {
      params.push(year);
      query += ` AND program.program_year = $${params.length}`;
    }

    query += ` ORDER BY student.id ASC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    // count query
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM student
      JOIN program ON student.program_id = program.id
      JOIN faculty ON program.faculty_id = faculty.id
      JOIN university ON faculty.university_id = university.id
      WHERE 1=1
    `;

    const countParams: any[] = [];

    if (universityId) {
      countParams.push(universityId);
      countQuery += ` AND university.id = $${countParams.length}`;
    }
    if (facultyId) {
      countParams.push(facultyId);
      countQuery += ` AND faculty.id = $${countParams.length}`;
    }
    if (programId) {
      countParams.push(programId);
      countQuery += ` AND program.program_code = $${countParams.length}`;
    }
    if (year) {
      countParams.push(year);
      countQuery += ` AND program.program_year = $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    res.json({ data: result.rows, total, page, limit });
  } catch (err: any) {
    console.error("Pagination error:", err);
    res.status(500).json({
      error: "Unable to retrieve paginated student information",
    });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  const studentId = req.params.id;
  const { first_name, last_name, student_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE student
       SET first_name = $1,
           last_name = $2,
           student_id = $3
       WHERE id = $4
       RETURNING *`,
      [first_name, last_name, student_id, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("Error updating student:", err);
    res.status(500).json({ error: "Failed to update student" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const studentId = req.params.id;

  try {
    const result = await pool.query(
      `DELETE FROM student WHERE id = $1 RETURNING *`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting student:", err);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

export default router;
