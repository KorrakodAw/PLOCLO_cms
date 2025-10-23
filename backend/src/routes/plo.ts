import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
const router = Router();

// เพิ่มข้อมูล PLO
// POST /api/plo
router.post("/", authenticateToken, async (req, res) => {
  const { code, program_id, name, engname } = req.body;
  if (!code || !program_id || !name || !engname) {
    return res
      .status(400)
      .json({ error: "code, program_id, name, engname จำเป็นต้องกรอก" });
  }
  try {
    // Check for duplicate (same code and program_id)
    const dupCheck = await pool.query(
      `SELECT id FROM plo WHERE code = $1 AND program_id = $2`,
      [code, program_id]
    );
    if (dupCheck.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "PLO with this code and program already exists" });
    }
    const result = await pool.query(
      `INSERT INTO plo (code, program_id, name, engname) VALUES ($1, $2, $3, $4) RETURNING id, code, program_id, name, engname`,
      [code, program_id, name, engname]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถเพิ่มข้อมูล PLO ได้" });
  }
});

// ดึงข้อมูล PLO ทั้งหมด
// GET /api/plo
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         plo.id, plo.code, plo.program_id, plo.name, plo.engname,
         program.program_shortname_th, program.program_shortname_en, program.program_year
       FROM plo
       JOIN program ON plo.program_id = program.id
       ORDER BY plo.id`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูล PLO ได้" });
  }
});

// ดึงข้อมูล PLO แบบแบ่งหน้า
// GET /api/plo/paginate?page=1&limit=10
router.get("/paginate", authenticateToken, async (req, res) => {
  let page = parseInt(req.query.page as string) || 1;
  let limit = parseInt(req.query.limit as string) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;
  const offset = (page - 1) * limit;
  try {
    // Get total count
    const countResult = await pool.query("SELECT COUNT(*) FROM plo");
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataResult = await pool.query(
      `SELECT 
         plo.id, plo.code, plo.program_id, plo.name, plo.engname,
         program.program_shortname_th, program.program_shortname_en, program.program_year
       FROM plo
       JOIN program ON plo.program_id = program.id
       ORDER BY plo.id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({
      data: dataResult.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูล PLO แบบแบ่งหน้าได้" });
  }
});

// DELETE /api/plo/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM plo WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "PLO not found" });
    }
    res.json({ success: true, id });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Unable to delete PLO" });
  }
});
export default router;
