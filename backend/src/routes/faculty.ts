import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// ดึงข้อมูลคณะทั้งหมด (faculty) สำหรับ dropdown
// ใช้ในหน้าเพิ่ม/แก้ไขโปรแกรมหรือคอร์ส
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, university_id FROM faculty ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Unable to retrieve faculty information" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  const { university_id, name, name_th, abbreviation, abbreviation_th } =
    req.body;

  if (!name || !name_th || !abbreviation || !abbreviation_th) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // 1️⃣ Check if the faculty already exists for this university
    const duplicateCheck = await pool.query(
      `SELECT id FROM faculty 
       WHERE university_id = $1 AND name = $2`,
      [university_id, name]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        error: "Faculty with this name already exists for the university",
      });
    }

    // 2️⃣ Insert if not duplicate
    const result = await pool.query(
      `INSERT INTO faculty (university_id, name, name_th, abbreviation, abbreviation_th)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, university_id, name, name_th, abbreviation, abbreviation_th`,
      [university_id, name, name_th, abbreviation, abbreviation_th]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("Database error details:", err.message);
    res.status(500).json({ error: err.message });
  }
});

//path DELETE /faculty/:id

export default router;
