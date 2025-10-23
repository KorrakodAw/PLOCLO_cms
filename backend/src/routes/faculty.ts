import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// ดึงข้อมูลคณะทั้งหมด (faculty) สำหรับ dropdown
// ใช้ในหน้าเพิ่ม/แก้ไขโปรแกรมหรือคอร์ส
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name FROM faculty ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Unable to retrieve faculty information" });
  }
});

<<<<<<< Updated upstream
=======
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

// DELETE /api/faculty/:id
router.delete("/:id", authenticateToken, async(req,res)=>{
  const { id } = req.params;
    try {
     //ลบ progrms
    const programs = await pool.query(`SELECT id FROM program WHERE faculty_id = $1`, [id]);
      for (const p of programs.rows) {
           const programId = p.id;
     // ลบ course ของ program
      await pool.query(`DELETE FROM course WHERE program_id = $1`, [programId]);
     // ลบ PLO ของ program
      await pool.query(`DELETE FROM plo WHERE program_id = $1`, [programId]);

     // ลบ program
      await pool.query(`DELETE FROM program WHERE id = $1`, [programId]);
      }

    //ลบ faculty
    const result = await pool.query(
      `DELETE FROM faculty WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    res.json({ success: true, id });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Unable to delete Faculty" });

}
});

>>>>>>> Stashed changes
export default router;
