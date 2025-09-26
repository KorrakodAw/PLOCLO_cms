import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";

const router = Router();

// GET all programs
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, program_code, program_name_en, program_name_th, 
              program_shortname_en, program_shortname_th, program_year 
       FROM program 
       ORDER BY program_year DESC`
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
      program_code,
      program_name_en,
      program_name_th,
      program_shortname_en,
      program_shortname_th,
      program_year,
    } = req.body;

    if (
      !program_code ||
      !program_name_en ||
      !program_name_th ||
      !program_year
    ) {
      return res.status(400).json({
        error:
          "program_code, program_name_en, program_name_th, and program_year are required",
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO program 
         (program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year`,
        [
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
          error: "Program with the same code and year already exists",
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
          program_code,
          program_name_en,
          program_name_th,
          program_shortname_en,
          program_shortname_th,
          program_year,
        } = p;

        if (
          !program_code ||
          !program_name_en ||
          !program_name_th ||
          !program_year
        ) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error:
              "Each program must include program_code, program_name_en, program_name_th, and program_year",
          });
        }

        const result = await client.query(
          `INSERT INTO program
           (program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING id, program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year`,
          [
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

export default router;
