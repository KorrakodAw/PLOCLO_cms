import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// GET all universities for dropdowns
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, name_th, abbreviation, abbreviation_th FROM university ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Unable to retrieve university information" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  const { name, name_th, abbreviation, abbreviation_th } = req.body;

  // Validate input
  if (!name || !name_th || !abbreviation || !abbreviation_th) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const duplicateCheck = await pool.query(
      `SELECT id FROM university WHERE name = $1 OR abbreviation = $2`,
      [name, abbreviation]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        error: "University with this name or abbreviation already exists",
      });
    }

    // Insert new university
    const result = await pool.query(
      `INSERT INTO university (name, name_th, abbreviation, abbreviation_th)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, name_th, abbreviation, abbreviation_th`,
      [name, name_th, abbreviation, abbreviation_th]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Unable to create university record" });
  }
});

export default router;
