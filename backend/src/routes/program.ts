import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";
const router = Router();

// GET all programs (with faculty & university names)
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         p.id,
         p.program_code,
         p.program_name_en,
         p.program_name_th,
         p.program_shortname_en,
         p.program_shortname_th,
         p.program_year,
         f.id AS faculty_id,
         f.name AS faculty_name,
         u.id AS university_id,
         u.name AS university_name
       FROM program p
       JOIN faculty f ON p.faculty_id = f.id
       JOIN university u ON f.university_id = u.id
       ORDER BY p.id DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch programs" });
  }
});

// Create single program
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin", "instructor"),
  async (req, res) => {
    const {
      faculty_id,
      program_code,
      program_name_en,
      program_name_th,
      program_shortname_en,
      program_shortname_th,
      program_year,
    } = req.body;

    if (
      !faculty_id ||
      !program_code ||
      !program_name_en ||
      !program_name_th ||
      !program_year
    ) {
      return res.status(400).json({
        error:
          "faculty_id, program_code, program_name_en, program_name_th, and program_year are required",
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO program 
         (faculty_id, program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, faculty_id, program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year`,
        [
          faculty_id,
          program_code,
          program_name_en,
          program_name_th,
          program_shortname_en || null,
          program_shortname_th || null,
          Number(program_year),
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      console.error(err);
      if (err.code === "23505") {
        return res.status(409).json({
          error: "Program with the same code already exists",
        });
      }
      res.status(500).json({ error: "Failed to create program" });
    }
  }
);

// Bulk upload programs
router.post(
  "/bulk",
  authenticateToken,
  authorizeRoles("admin", "instructor"),
  async (req, res) => {
    const programs = req.body; // expect array

    if (!Array.isArray(programs) || programs.length === 0) {
      return res
        .status(400)
        .json({ error: "Request body must be a non-empty array" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const insertedPrograms: any[] = [];

      for (const p of programs) {
        const {
          faculty_id,
          program_code,
          program_name_en,
          program_name_th,
          program_shortname_en,
          program_shortname_th,
          program_year,
        } = p;

        if (
          !faculty_id ||
          !program_code ||
          !program_name_en ||
          !program_name_th ||
          !program_year
        ) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error:
              "Each program must include faculty_id, program_code, program_name_en, program_name_th, and program_year",
          });
        }

        const result = await client.query(
          `INSERT INTO program
           (faculty_id, program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id, faculty_id, program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year`,
          [
            faculty_id,
            program_code,
            program_name_en,
            program_name_th,
            program_shortname_en || null,
            program_shortname_th || null,
            Number(program_year),
          ]
        );

        insertedPrograms.push(result.rows[0]);
      }

      await client.query("COMMIT");
      res.status(201).json({
        message: "Programs uploaded successfully",
        data: insertedPrograms,
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: "Bulk upload failed" });
    } finally {
      client.release();
    }
  }
);

// GET paginated programs
// GET /api/program/paginate?page=1&limit=10
router.get("/paginate", authenticateToken, async (req, res) => {
  let page = parseInt(req.query.page as string) || 1;
  let limit = parseInt(req.query.limit as string) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;
  const offset = (page - 1) * limit;
  try {
    // Get total count
    const countResult = await pool.query("SELECT COUNT(*) FROM program");
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataResult = await pool.query(
      `SELECT 
         p.id,
         p.program_code,
         p.program_name_en,
         p.program_name_th,
         p.program_shortname_en,
         p.program_shortname_th,
         p.program_year,
         f.id AS faculty_id,
         f.name AS faculty_name,
         u.id AS university_id,
         u.name AS university_name
       FROM program p
       JOIN faculty f ON p.faculty_id = f.id
       JOIN university u ON f.university_id = u.id
       ORDER BY p.id DESC
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
    res.status(500).json({ error: "Failed to fetch paginated programs" });
  }
});

// DELETE /api/program/:id
router.delete("/:id", authenticateToken, async(req,res)=>{
  const { id } = req.params;
    try {
        // ลบ courses ที่อยู่ใน program
    await pool.query(`DELETE FROM course WHERE program_id = $1`, [id]);
        // ลบ PLO ที่อยู่ใน program นี้
    await pool.query(`DELETE FROM plo WHERE program_id = $1`, [id]);
        // ลบ student ที่อยู่ใน program นี้
    await pool.query(`DELETE FROM student WHERE program_id = $1`, [id]);
        // ลบ program
    await pool.query(`DELETE FROM program WHERE id = $1`, [id]);
    const result = await pool.query(
      `DELETE FROM program WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "program not found" });
    }

    res.json({ message: "program deleted", deletedId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to delete program" });
  }
});

export default router;
