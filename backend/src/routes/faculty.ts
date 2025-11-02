import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// ดึงข้อมูลคณะทั้งหมด (faculty) สำหรับ dropdown
// ใช้ในหน้าเพิ่ม/แก้ไขโปรแกรมหรือคอร์ส
router.get("/", authenticateToken, async (req, res) => {
  try {
    const universityId = req.query.university_id as string | undefined;

    let query = `SELECT id, name, university_id FROM faculty`;
    const params: any[] = [];

    if (universityId) {
      query += ` WHERE university_id = $1`;
      params.push(universityId);
    }

    query += ` ORDER BY id ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Unable to retrieve faculty information" });
  }
});


router.get("/paginate", authenticateToken, async (req, res) => {
  try {
    const universityId = req.query.university_id as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    let query = `SELECT id, name, university_id FROM faculty`;
    const params: any[] = [];

    if (universityId) {
      query += ` WHERE university_id = $1`;
      params.push(universityId);
    }

    query += ` ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Optionally get total count
    const countResult = await pool.query(
      universityId
        ? `SELECT COUNT(*) FROM faculty WHERE university_id = $1`
        : `SELECT COUNT(*) FROM faculty`,
      universityId ? [universityId] : []
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({ data: result.rows, total });
  } catch (err: any) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Unable to retrieve paginated faculty information" });
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
router.post("/", async (req, res) => {
  const { university_id, name, name_th, abbreviation, abbreviation_th } = req.body;

  try {
    const faculty = await pool.query.create({
      data: {
        university_id: parseInt(university_id),
        name,
        name_th,
        abbreviation,
        abbreviation_th,
      },
    });

    res.status(201).json({ message: "เพิ่มคณะสำเร็จ", faculty });
  } catch (error) {
    console.error("Error creating faculty:", error);
    res.status(500).json({ error: "ไม่สามารถเพิ่มข้อมูลได้" });
  }
});
export default router;
