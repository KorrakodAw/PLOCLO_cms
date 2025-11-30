import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// =========================================
// 1. GET /paginate (For the Table)
// =========================================
router.get("/paginate", authenticateToken, async (req, res) => {
  try {
    // 1. Destructure and Normalize Query Params
    const {
      universityId,
      facultyId,
      programId,
      year,
      semester,
      section,
      courseId,
    } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // 2. Build the WHERE clause dynamically (ONCE)
    // We use an array for values to prevent SQL injection ($1, $2, etc.)
    const params: any[] = [];
    const conditions: string[] = ["1=1"]; // Start with 1=1 so we can always append "AND ..."

    if (universityId) {
      params.push(universityId);
      conditions.push(`university.id = $${params.length}`);
    }
    if (facultyId) {
      params.push(facultyId);
      conditions.push(`faculty.id = $${params.length}`);
    }
    if (programId) {
      params.push(programId);
      conditions.push(`program.id = $${params.length}`);
    }
    if (year) {
      params.push(year);
      // ⚠️ CHECK THIS: usually frontend sends '2025' (Academic Year).
      // If 'program.program_year' is '1' (Curriculum Year 1), this will fail.
      // You likely want: `course.academic_year`
      conditions.push(`program.program_year = $${params.length}`);
    }
    if (semester) {
      params.push(semester);
      conditions.push(`course.semester = $${params.length}`);
    }
    if (section) {
      params.push(section);
      conditions.push(`course.section = $${params.length}`);
    }
    if (courseId) {
      params.push(courseId);
      conditions.push(`course.id = $${params.length}`);
    }

    const whereClause = "WHERE " + conditions.join(" AND ");

    // 3. Construct the Main Query (Data)
    // Note: We use the same 'whereClause' and 'params'
    const dataQuery = `
      SELECT 
        clo.id, clo.code, clo.name, clo.name_th, clo.course_id,
        course.id AS course_real_id, 
        program.id AS program_id
      FROM clo
      JOIN course ON clo.course_id = course.id
      JOIN program ON course.program_id = program.id
      JOIN faculty ON program.faculty_id = faculty.id
      JOIN university ON faculty.university_id = university.id
      ${whereClause}
      ORDER BY clo.id ASC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    // 4. Construct the Count Query (Total)
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM clo
      JOIN course ON clo.course_id = course.id
      JOIN program ON course.program_id = program.id
      JOIN faculty ON program.faculty_id = faculty.id
      JOIN university ON faculty.university_id = university.id
      ${whereClause}
    `;

    // 5. Execute Queries
    // We run them in parallel for better performance
    const [result, countResult] = await Promise.all([
      pool.query(dataQuery, [...params, limit, offset]), // Add limit/offset to params
      pool.query(countQuery, params), // Use base params
    ]);

    // 6. Return Response
    const total = parseInt(countResult.rows[0].total, 10);

    res.json({
      data: result.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit), // Handy for frontend
    });
  } catch (err: any) {
    console.error("Pagination Error:", err.message);
    res.status(500).json({ error: "Failed to fetch paginated CLOs" });
  }
});

// =========================================
// 2. GET / (Simple List / Dropdown)
// =========================================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const courseId = req.query.courseId as string | undefined;

    const result = await pool.query(
      `SELECT id, code, name, name_th, course_id FROM clo
       ${courseId ? "WHERE course_id = $1" : ""}
       ORDER BY id ASC`,
      courseId ? [courseId] : []
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to retrieve clo information" });
  }
});

// =========================================
// 3. POST / (Add CLO)
// =========================================
router.post("/", authenticateToken, async (req, res) => {
  const { code, name, name_th, course_id } = req.body;

  try {
    // 1. Insert the CLO
    // We let the database handle the unique check now (via the new constraint)
    const result = await pool.query(
      `INSERT INTO clo (code, name, name_th, course_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, code, name, name_th, course_id`,
      [code, name, name_th, course_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    // 2. Handle the specific error if the database complains
    if (err.code === "23505") {
      // Postgres code for Unique Violation
      return res
        .status(409)
        .json({ error: "This CLO code already exists in this course" });
    }

    console.error("Database Error:", err.message);
    res.status(500).json({ error: "Unable to add CLO" });
  }
});

export default router;
