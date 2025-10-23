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

// DELETE /api/university/:id
router.delete(":id", authenticateToken,async(req,res)=>{
  const {id} = req.params;
  try{
    // 1️⃣ หา faculties ที่อยู่ใน university นี้
    const faculties = await pool.query(`SELECT id FROM faculty WHERE university_id = $1`, [id]);

    for (const f of faculties.rows) {
      const facultyId = f.id;

      // 2️⃣ หา programs ของ faculty นี้
      const programs = await pool.query(`SELECT id FROM program WHERE faculty_id = $1`, [facultyId]);

      for (const p of programs.rows) {
        const programId = p.id;

        // 3️⃣ ลบ students ของ program นี้
        await pool.query(`DELETE FROM student WHERE program_id = $1`, [programId]);

        // 4️⃣ ลบ courses ของ program นี้
        await pool.query(`DELETE FROM course WHERE program_id = $1`, [programId]);

        // 5️⃣ ลบ plos ของ program นี้
        await pool.query(`DELETE FROM plo WHERE program_id = $1`, [programId]);

        // 6️⃣ ลบ program เอง
        await pool.query(`DELETE FROM program WHERE id = $1`, [programId]);
      }

      // 7️⃣ ลบ faculty เอง
      await pool.query(`DELETE FROM faculty WHERE id = $1`, [facultyId]);
    }
     //ลบ university
    const result = await pool.query(
      'DELETE FROM university WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rowCount === 0){
      return res.status(404).json({ error:"university not found"});
    }
    res.json({ message: "university deleted", deletedId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to delete university" });
  }
});

export default router;
