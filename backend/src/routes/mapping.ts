import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// GET /api/mapping/clo-plo/:courseId
router.get("/clo-plo/:courseId", authenticateToken, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    if (isNaN(courseId)) {
      return res.status(400).json({ error: "Invalid Course ID" });
    }

    // Adjust 'clo_plo_mapping' to match your actual table name
    const result = await pool.query(
      `SELECT m.clo_id, m.plo_id, m.weight 
       FROM clo_plo_mapping m
       JOIN clo c ON m.clo_id = c.id
       WHERE c.course_id = $1`,
      [courseId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mappings" });
  }
});

router.post("/clo-plo", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { updates } = req.body; // Array of { clo_id, plo_id, weight }

    await client.query("BEGIN");

    for (const item of updates) {
      if (item.weight > 0) {
        // CASE 1: Value exists -> UPSERT (Insert or Update)
        await client.query(
          `INSERT INTO clo_plo_mapping (clo_id, plo_id, weight)
           VALUES ($1, $2, $3)
           ON CONFLICT (clo_id, plo_id) 
           DO UPDATE SET weight = EXCLUDED.weight, updated_at = NOW()`,
          [item.clo_id, item.plo_id, item.weight]
        );
      } else {
        // CASE 2: Value is 0 -> DELETE the mapping
        // This keeps the database clean (only stores actual connections)
        await client.query(
          `DELETE FROM clo_plo_mapping 
           WHERE clo_id = $1 AND plo_id = $2`,
          [item.clo_id, item.plo_id]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Mapping saved" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to save mapping" });
  } finally {
    client.release();
  }
});

router.post("/assignment-clo", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { updates } = req.body; // Array of { assignment_id, clo_id, weight }
    await client.query("BEGIN");

    for (const item of updates) {
      // Ensure weight is a number
      const weight = Number(item.weight);

      if (weight > 0) {
        // CASE 1: Value exists -> UPSERT (Insert or Update)
        // 🔴 REMOVED: ", updated_at = NOW()" from the SQL below
        await client.query(
          `INSERT INTO assignment_clo_mapping (assignment_id, clo_id, weight)
           VALUES ($1, $2, $3)
           ON CONFLICT (assignment_id, clo_id) 
           DO UPDATE SET weight = EXCLUDED.weight`,
          [item.assignment_id, item.clo_id, weight]
        );
      } else {
        // CASE 2: Value is 0 -> DELETE the mapping
        await client.query(
          `DELETE FROM assignment_clo_mapping 
           WHERE assignment_id = $1 AND clo_id = $2`,
          [item.assignment_id, item.clo_id]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Mapping saved" });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Save Mapping Error:", err.message); // Check your terminal for specific SQL errors
    res.status(500).json({ error: "Failed to save mapping" });
  } finally {
    client.release();
  }
});

router.get("/assignment-clo/:courseId", authenticateToken, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    if (isNaN(courseId)) {
      return res.status(400).json({ error: "Invalid Course ID" });
    }

    // Adjust 'assignment_clo_mapping' to match your actual table name
    const result = await pool.query(
      `SELECT m.assignment_id, m.clo_id, m.weight 
       FROM assignment_clo_mapping m
       JOIN assignment a ON m.assignment_id = a.id
       WHERE a.course_id = $1`,
      [courseId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mappings" });
  }
});

export default router;
