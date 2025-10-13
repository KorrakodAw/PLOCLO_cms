import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

/**
 * ✅ GET all students with program info
 */
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        s.id,
        s.student_id,
        s.first_name,
        s.last_name,
        s.email,
        s.year_of_admission,
        p.id AS program_id,
        p.program_name_en,
        p.program_name_th
      FROM student s
      JOIN program p ON s.program_id = p.id
      ORDER BY s.id DESC`
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
  const {
    student_id,
    first_name,
    last_name,
    email,
    year_of_admission,
    program_id,
  } = req.body;

  if (
    !student_id ||
    !first_name ||
    !last_name ||
    !email ||
    !year_of_admission ||
    !program_id
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO student 
        (student_id, first_name, last_name, email, year_of_admission, program_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [student_id, first_name, last_name, email, year_of_admission, program_id]
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
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    // Get total count
    const totalResult = await pool.query(`SELECT COUNT(*) FROM student`);
    const total = parseInt(totalResult.rows[0].count, 10);

    // Get student data joined with program info
    const result = await pool.query(
      `SELECT 
           s.id,
           s.student_id,
           s.first_name,
           s.last_name,
           s.email,
           s.year_of_admission,
           s.program_id,
           p.program_name_en,
           p.program_name_th,
           p.program_shortname_en,
           p.program_shortname_th
         FROM student s
         LEFT JOIN program p ON s.program_id = p.id
         ORDER BY s.id DESC
         LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      data: result.rows,
      total,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

export default router;
