import e, { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// GET all courses (no pagination)
router.get("/all", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, name, name_th,  program_id , section
       FROM course
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Unable to retrieve all courses" });
  }
});

// GET paginated courses
// /api/course/paginate?page=1&limit=10
router.get("/paginate", authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  try {
    const result = await pool.query(
      `SELECT id, code, name, name_th,  program_id , section
       FROM course
       ORDER BY id ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countResult = await pool.query(`SELECT COUNT(*) FROM course`);
    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page,
      limit,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Unable to retrieve paginated courses" });
  }
});

// POST /api/course
router.post("/", authenticateToken, async (req, res) => {
  const { code, name, name_th, program_id, section } = req.body;

  if (!code || !name || !name_th || !program_id || !section) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // ✅ Check for duplicate code *in the same program and section*
    const dup = await pool.query(
      `SELECT id FROM course WHERE code = $1 AND program_id = $2 AND section = $3`,
      [code, program_id, section]
    );

    if (dup.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "Duplicate course code in this program and section" });
    }

    // ✅ Insert course
    const result = await pool.query(
      `INSERT INTO course (code, name, name_th, program_id, section)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, code, name, name_th, program_id, section`,
      [code, name, name_th, program_id, section]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Unable to add course" });
  }
});

// DELETE /api/course/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM course WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json({ success: true, id });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Unable to delete course" });
  }
});

export default router;
