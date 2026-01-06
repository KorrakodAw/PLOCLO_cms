import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware"; // Adjusted import path if needed

const router = Router();

// 1. GET: Fetch assignments (Filter by Course ID)
router.get("/", authenticateToken, async (req, res) => {
  try {
    // We should filter by course, otherwise you get assignments for the whole university
    const courseId = req.query.courseId;

    if (!courseId) {
      return res
        .status(400)
        .json({ error: "courseId query parameter is required" });
    }

    const result = await pool.query(
      "SELECT * FROM assignment WHERE course_id = $1 ORDER BY created_at ASC",
      [courseId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// 2. POST: Create a new assignment
router.post("/", authenticateToken, async (req, res) => {
  try {
    // FIX: Destructure the columns that actually exist in your image
    const { course_id, name, description, max_score, weight } = req.body;

    // Validation
    if (!course_id || !name) {
      return res.status(400).json({ error: "course_id and name are required" });
    }

    const result = await pool.query(
      `INSERT INTO assignment 
      (course_id, name, description, max_score, weight) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *`,
      [
        course_id,
        name,
        description || "", // Handle optional description
        max_score || 100, // Default to 100 if missing
        weight || 0, // Default to 0 if missing
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const assignmentId = req.params.id;

    const result = await pool.query(
      "DELETE FROM assignment WHERE id = $1 RETURNING *",
      [assignmentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ message: "Assignment deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const { name, description, max_score, weight } = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(name);
    }
    if (description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(description);
    }
    if (max_score !== undefined) {
      fields.push(`max_score = $${index++}`);
      values.push(max_score);
    }
    if (weight !== undefined) {
      fields.push(`weight = $${index++}`);
      values.push(weight);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(assignmentId); // For WHERE clause

    const query = `UPDATE assignment SET ${fields.join(
      ", "
    )} WHERE id = $${index} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

export default router;
