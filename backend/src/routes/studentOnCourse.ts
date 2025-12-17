import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        sic.id,
        sic.student_id,
        sic.course_id,
        c.course_name,
        c.course_code,
        c.credits
      FROM student_on_course sic
      JOIN course c ON sic.course_id = c.id
      ORDER BY sic.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching student in course records:", err);
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  const { student_id, course_id } = req.body;

  if (!student_id || !course_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO student_on_course  
        (student_id, course_id)
       VALUES ($1, $2)
       RETURNING *`,
      [student_id, course_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("Error creating student on course record:", err);

    // Check for duplicate or constraint errors
    if (err.code === "23505") {
      res.status(400).json({ error: "Record already exists" });
    } else if (err.code === "23503") {
      res
        .status(400)
        .json({ error: "Invalid student ID or course ID provided" });
    } else {
      res.status(500).json({ error: "Failed to create record" });
    }
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM student_on_course WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json({ message: "Record deleted successfully" });
  } catch (err) {
    console.error("Error deleting student on course record:", err);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { student_id, course_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE student_on_course 
       SET student_id = $1, course_id = $2
       WHERE id = $3
       RETURNING *`,
      [student_id, course_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("Error updating student on course record:", err);

    if (err.code === "23503") {
      res
        .status(400)
        .json({ error: "Invalid student ID or course ID provided" });
    } else {
      res.status(500).json({ error: "Failed to update record" });
    }
  }
});

export default router;
