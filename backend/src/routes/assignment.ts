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

export default router;
