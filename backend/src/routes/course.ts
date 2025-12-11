import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// GET all courses (no pagination)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const programId = req.query.programId as string | undefined;

    let query = `
      SELECT 
         c.id,
         c.code,
         c.name,
         c.name_th,
         c.program_id,
         c.section,
         c.semester,
         p.id As program_id
       FROM course c
       JOIN program p ON c.program_id = p.id
    `;
    const params: any[] = [];

    // Add programId filter if provided
    if (programId) {
      query += ` WHERE c.program_id = $1`;
      params.push(programId);
    }

    query += ` ORDER BY c.id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// GET paginated courses
// /api/course/paginate?page=1&limit=10
router.get("/paginate", authenticateToken, async (req, res) => {
  try {
    const universityId = req.query.universityId as string | undefined;
    const facultyId = req.query.facultyId as string | undefined;
    const programId = req.query.programId as string | undefined;
    const year = req.query.year as string | undefined;
    const semester = req.query.semester as string | undefined;
    const section = req.query.section as string | undefined;
    const course = req.query.course as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        course.id, course.code, course.name, course.name_th, course.program_id, course.section, course.semester
      FROM course
      JOIN program ON course.program_id = program.id
      JOIN faculty ON program.faculty_id = faculty.id
      JOIN university ON faculty.university_id = university.id
      WHERE 1=1    
    `;
    const params: any[] = [];

    if (universityId) {
      params.push(universityId);
      query += ` AND university.id = $${params.length}`;
    }
    if (facultyId) {
      params.push(facultyId);
      query += ` AND faculty.id = $${params.length}`;
    }
    if (year) {
      params.push(year);
      query += ` AND program.program_year = $${params.length}`;
    }
    if (programId) {
      params.push(programId);
      query += ` AND program.program_code = $${params.length}`;
    }

    if (semester) {
      params.push(semester);
      query += ` AND course.semester = $${params.length}`;
    }
    if (section) {
      params.push(section);
      query += ` AND course.section = $${params.length}`;
    }
    query += ` ORDER BY course.id ASC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM course
      JOIN program ON course.program_id = program.id
      JOIN faculty ON program.faculty_id = faculty.id
      JOIN university ON faculty.university_id = university.id
      WHERE 1=1
   `;
    const countParams: any[] = [];
    if (universityId) {
      countParams.push(universityId);
      countQuery += ` AND university.id = $${countParams.length}`;
    }
    if (facultyId) {
      countParams.push(facultyId);
      countQuery += ` AND faculty.id = $${countParams.length}`;
    }
    if (year) {
      countParams.push(year);
      countQuery += ` AND program.program_year = $${countParams.length}`;
    }
    if (programId) {
      countParams.push(programId);
      countQuery += ` AND program.program_code = $${countParams.length}`;
    }

    if (semester) {
      countParams.push(semester);
      countQuery += ` AND course.semester = $${countParams.length}`;
    }
    if (section) {
      countParams.push(section);
      countQuery += ` AND course.section = $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    res.json({
      data: result.rows,
      total,
      page,
      limit,
    });
  } catch (err: any) {
    res.status(500).json({
      error: "Unable to retrieve paginated course information",
    });
  }
});

// POST /api/course
router.post("/", authenticateToken, async (req, res) => {
  const { code, name, name_th, program_id, section, semester } = req.body;

  if (!code || !name || !name_th || !program_id || !section || !semester) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // ✅ Check for duplicate code *in the same program and section*
    const dup = await pool.query(
      `SELECT id FROM course 
   WHERE code = $1 
     AND program_id = $2  
     AND semester = $3
     AND section = $4`,
      [code, program_id, semester, section]
    );

    if (dup.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "This section already exists for this course." });
    }

    // ✅ Insert course
    const result = await pool.query(
      `INSERT INTO course (code, name, name_th, program_id, section, semester)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, code, name, name_th, program_id, section, semester`,
      [code, name, name_th, program_id, section, semester]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Unable to add course" });
  }
});

// DELETE /api/course/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM course WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: "Unable to delete course" });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { code, name, name_th, program_id, section, semester } = req.body;

  if (!code || !name || !name_th || !program_id || !section || !semester) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Check for duplicate code in the same program and section, excluding current course
    const dup = await pool.query(
      `SELECT id FROM course 
       WHERE code = $1 AND program_id = $2 AND semester = $3 AND section = $4 AND id != $5`,
      [code, program_id, semester, section, id]
    );
    if (dup.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "This section already exists for this course." });
    }
    const result = await pool.query(
      `UPDATE course 
       SET code = $1, name = $2, name_th = $3, program_id = $4, section = $5, semester = $6
       WHERE id = $7
       RETURNING id, code, name, name_th, program_id, section, semester`,
      [code, name, name_th, program_id, section, semester, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Unable to update course" });
  }
});

export default router;
