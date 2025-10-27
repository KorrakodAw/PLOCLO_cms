// backend/src/routes/program.ts
import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";
import { parse } from "path";
import { queryObjects } from "v8";
const router = Router();

// GET all programs (with faculty & university names)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const facultyId = req.query.facultyId as string | undefined;

    let query = `
      SELECT 
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
    `;

    const params: any[] = [];

    // Add facultyId filter if provided
    if (facultyId) {
      query += ` WHERE p.faculty_id = $1`;
      params.push(facultyId);
    }

    query += ` ORDER BY p.id DESC`;

    const result = await pool.query(query, params);
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

router.get("/paginate", authenticateToken, async (req, res) => {
  try {
    const universityId = req.query.universityId as string | undefined;
    const facultyId = req.query.facultyId as string | undefined;
    const programId = req.query.programId as string | undefined; // This is now program_code
    const year = req.query.year as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // 🧩 Start building query with JOIN to support university filter
    let baseQuery = `
      SELECT 
        p.id, 
        p.program_code, 
        p.program_name_en, 
        p.program_name_th, 
        p.program_shortname_en, 
        p.program_shortname_th, 
        p.program_year, 
        p.faculty_id,
        f.university_id
      FROM program p
      JOIN faculty f ON p.faculty_id = f.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    // 🧠 Build WHERE conditions dynamically
    if (universityId) {
      conditions.push(`f.university_id = $${params.length + 1}`);
      params.push(universityId);
    }
    if (facultyId) {
      conditions.push(`p.faculty_id = $${params.length + 1}`);
      params.push(facultyId);
    }
    if (programId) {
      // Filter by program_code (not id) to get all years of the same program
      conditions.push(`p.program_code = $${params.length + 1}`);
      params.push(programId);
    }
    if (year) {
      conditions.push(`p.program_year = $${params.length + 1}`);
      params.push(year);
    }

    // Add WHERE clause if conditions exist
    if (conditions.length > 0) {
      baseQuery += ` WHERE ${conditions.join(" AND ")}`;
    }

    // 🧮 Pagination
    baseQuery += ` ORDER BY p.id ASC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limit, offset);

    // 📦 Execute main data query
    const result = await pool.query(baseQuery, params);

    // 📊 Count total records for pagination (use same conditions)
    let countQuery = `
      SELECT COUNT(*) 
      FROM program p
      JOIN faculty f ON p.faculty_id = f.id
    `;
    const countParams: any[] = [];
    const countConditions: string[] = [];

    if (universityId) {
      countConditions.push(`f.university_id = $${countParams.length + 1}`);
      countParams.push(universityId);
    }
    if (facultyId) {
      countConditions.push(`p.faculty_id = $${countParams.length + 1}`);
      countParams.push(facultyId);
    }
    if (programId) {
      countConditions.push(`p.program_code = $${countParams.length + 1}`);
      countParams.push(programId);
    }
    if (year) {
      countConditions.push(`p.program_year = $${countParams.length + 1}`);
      countParams.push(year);
    }

    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(" AND ")}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("❌ Pagination error:", err.message);
    res.status(500).json({
      error: "Unable to retrieve paginated program information",
    });
  }
});

export default router;
