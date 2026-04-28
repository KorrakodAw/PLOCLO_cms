import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";
import { duplicateProgram } from "../controllers/programController";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

router.post("/duplicate", authenticateToken, duplicateProgram);

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

    if (facultyId) {
      query += ` WHERE p.faculty_id = $1`;
      params.push(facultyId);
    }

    query += ` ORDER BY p.id DESC`; // Sorted by code usually better for dropdowns

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch programs" });
  }
});

router.get(
  "/YearsInProgram/:programId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { programId } = req.params;

      if (!programId) {
        return res.status(400).json({ error: "Program ID is required" });
      }

      // ใช้ findMany ร่วมกับ distinct เพื่อดึงปีที่ไม่ซ้ำกัน
      // เราจะ query ผ่าน course_semester และกรองจาก relation program_on_course
      const years = await prisma.courseSemester.findMany({
        where: {
          programOnCourses: {
            some: {
              program_id: Number(programId),
            },
          },
        },
        select: {
          year: true,
        },
        distinct: ["year"], // เอาปีที่ไม่ซ้ำกัน
        orderBy: {
          year: "asc", // เรียงจากปีล่าสุดลงไป
        },
      });

      // แปลงรูปแบบข้อมูลให้เป็น array ของตัวเลขง่ายๆ เช่น [2565, 2566, 2567]
      const result = years.map((y) => y.year);

      res.json(result);
    } catch (err: any) {
      console.error("Error fetching years:", err.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

router.get(
  "/ByInstructor/:instructorId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { instructorId } = req.params;

      const instructorPrograms = await prisma.programOnCourse.findMany({
        where: {
          semester: {
            // เช็คชื่อ relation ให้ตรงกับ schema (semester หรือ courseSemester)
            course: {
              instructors: {
                some: {
                  instructorId: Number(instructorId), // เช็คชื่อฟิลด์ instructorId หรือ instructor_id
                },
              },
            },
          },
          type: "core",
        },
        select: {
          program: true,
        },
      });

      // 1. 🟢 ใช้ Object หรือ Map ในการ Group ข้อมูลตาม program_code
      const grouped = instructorPrograms.reduce((acc: any, item) => {
        const p = item.program;
        const code = p.program_code;

        if (!acc[code]) {
          // ถ้ายังไม่มี code นี้ในตัวแปรสะสม ให้สร้าง Object ใหม่
          acc[code] = {
            program_ids: [p.id], // 🟢 เริ่มต้นเก็บ ID ใน Array
            program_code: p.program_code,
            program_name_en: p.program_name_en,
            program_name_th: p.program_name_th,
            program_shortname_en: p.program_shortname_en,
            program_shortname_th: p.program_shortname_th,
            latest_program_year: p.program_year,
          };
        } else {
          // ถ้ามี code นี้อยู่แล้ว ให้เพิ่มแค่ ID เข้าไปใน Array (ถ้ายังไม่มี)
          if (!acc[code].program_ids.includes(p.id)) {
            acc[code].program_ids.push(p.id);
          }
          // อัปเดตปีให้เป็นปีล่าสุดถ้าจำเป็น
          if (p.program_year > acc[code].latest_program_year) {
            acc[code].latest_program_year = p.program_year;
          }
        }
        return acc;
      }, {});

      // 2. แปลงจาก Object กลับเป็น Array เพื่อส่งผลลัพธ์
      const result = Object.values(grouped).sort(
        (a: any, b: any) => b.latest_program_year - a.latest_program_year,
      );

      res.json(result);
    } catch (err) {
      console.error("Error group programs:", err);
      res.status(500).json({ error: "Failed to fetch unique programs" });
    }
  },
);

router.get(
  "/ByFaculty/:facultyId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const facultyId = parseInt(req.params.facultyId as string);

      if (isNaN(facultyId)) {
        return res.status(400).json({ error: "Invalid Faculty ID" });
      }

      const programs = await prisma.program.findMany({
        where: {
          // สมมติว่าใน Model Program มีฟิลด์ faculty_id หรือเชื่อมผ่าน relation
          faculty_id: facultyId,
        },
        distinct: ["program_code"], // 🟢 หัวใจสำคัญ: เอาเฉพาะค่าที่ไม่ซ้ำกันในคอลัมน์นี้
        select: {
          id: true,
          program_code: true,
          program_name_en: true,
          program_name_th: true,
          program_shortname_en: true,
          program_shortname_th: true,
          program_year: true,
          // เลือกฟิลด์อื่นๆ ที่จำเป็น
        },
        orderBy: {
          program_code: "asc",
        },
      });

      res.json(programs);
    } catch (err) {
      console.error("Fetch Programs By Faculty Error:", err);
      res.status(500).json({ error: "Failed to fetch programs" });
    }
  },
);

router.get(
  "/ByCodeForViewChart",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // รับค่าจาก Query: ?id=... หรือ ?programCode=...
      const { programId, programCode } = req.query;

      let targetCode = programCode;

      // 1. ถ้าส่ง id มา ให้ไปหา program_code ของ id นั้นก่อน
      if (programId) {
        const findCodeResult = await pool.query(
          `SELECT program_code FROM program WHERE id = $1`,
          [programId],
        );

        if (findCodeResult.rows.length === 0) {
          return res.status(404).json({ error: "Program ID not found" });
        }

        targetCode = findCodeResult.rows[0].program_code;
      }

      // 2. ตรวจสอบว่ามี Code ให้ค้นหาหรือไม่
      if (!targetCode) {
        return res
          .status(400)
          .json({ error: "programId or programCode is required" });
      }

      // 3. ดึงทุก id และ program_year ที่มี program_code เดียวกัน
      const result = await pool.query(
        `
      SELECT 
          id,
          program_code,
          program_year,
          program_name_en,
          program_name_th
      FROM program 
      WHERE program_code = $1
      ORDER BY program_year DESC
      `,
        [targetCode],
      );

      // 4. ส่งคืนข้อมูลทั้งหมด
      res.json(result.rows);
    } catch (err: any) {
      console.error("Fetch By Code Error:", err);
      res.status(500).json({ error: "Failed to fetch program details" });
    }
  },
);

router.get("/ByCode", authenticateToken, async (req, res) => {
  try {
    // ดึงค่าจาก Query Parameters (?programCode=...&facultyId=...)
    const { programCode } = req.query;

    if (!programCode) {
      return res.status(400).json({ error: "programCode is required" });
    }

    const result = await pool.query(
      `
      SELECT 
          id,
          program_code,
          program_year
      FROM program 
      WHERE program_code = $1
      ORDER BY program_year DESC
      `,
      [programCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "No programs found for this code in the selected faculty",
      });
    }

    // ส่งคืนข้อมูลทั้งหมดเป็น Array (ไม่ใช่แค่แถวแรก)
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch program details" });
  }
});

// =========================================
// 2. PAGINATION (Refactored)
// =========================================
router.get("/paginate", authenticateToken, async (req, res) => {
  try {
    const universityId = req.query.universityId as string | undefined;
    const facultyId = req.query.facultyId as string | undefined;
    const programId = req.query.programId as string | undefined; // program_code
    const year = req.query.year as string | undefined;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // --- 1. Build Filter Conditions (Write logic ONCE) ---
    const params: any[] = [];
    const conditions: string[] = [];

    // Helper to add condition safely
    const addCondition = (sql: string, value: any) => {
      params.push(value);
      conditions.push(`${sql} = $${params.length}`);
    };

    if (universityId) addCondition("f.university_id", universityId);
    if (facultyId) addCondition("p.faculty_id", facultyId);
    if (programId) addCondition("p.program_code", programId);
    if (year) addCondition("p.program_year", year);

    // Combine conditions
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // --- 2. Construct Queries ---
    const dataQuery = `
      SELECT 
        p.id, p.program_code, p.program_name_en, p.program_name_th, 
        p.program_shortname_en, p.program_shortname_th, p.program_year, 
        p.faculty_id, f.university_id
      FROM program p
      JOIN faculty f ON p.faculty_id = f.id
      ${whereClause}
      ORDER BY p.program_code ASC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM program p
      JOIN faculty f ON p.faculty_id = f.id
      ${whereClause}
    `;

    // --- 3. Execute in Parallel (Faster) ---
    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, [...params, limit, offset]), // Pass limit/offset here
      pool.query(countQuery, params), // Pass only filter params here
    ]);

    const total = parseInt(countResult.rows[0].total || "0", 10);

    res.json({
      data: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("Pagination Error:", err);
    res.status(500).json({
      error: "Unable to retrieve paginated program information",
    });
  }
});

// =========================================
// 3. BULK UPLOAD
// =========================================
router.post(
  "/bulk",
  authenticateToken,
  authorizeRoles("system_admin", "instructor", "Super_admin"),
  async (req, res) => {
    // IMPORTANT: Frontend sends array directly, OR { programs: [] }.
    // This logic handles direct array. If your frontend sends { programs: [...] }, change this line.
    const programs = req.body;

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
        // Sanitize / Default values
        const faculty_id = p.faculty_id;
        const program_code = String(p.program_code).trim();
        const program_name_en = p.program_name_en;
        const program_name_th = p.program_name_th;
        const program_shortname_en = p.program_shortname_en || null;
        const program_shortname_th = p.program_shortname_th || null;
        const program_year = Number(p.program_year);

        // Validation
        if (
          !faculty_id ||
          !program_code ||
          !program_name_en ||
          !program_name_th ||
          !program_year
        ) {
          throw new Error(
            `Missing required fields for program code: ${
              program_code || "UNKNOWN"
            }`,
          );
        }

        const result = await client.query(
          `INSERT INTO program
            (faculty_id, program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (program_code, program_year) 
          DO UPDATE SET
          program_name_en = EXCLUDED.program_name_en,
          program_name_th = EXCLUDED.program_name_th,
          program_shortname_en = EXCLUDED.program_shortname_en,
          program_shortname_th = EXCLUDED.program_shortname_th,
          faculty_id = EXCLUDED.faculty_id
          
          RETURNING id, program_code`,
          [
            faculty_id,
            program_code,
            program_name_en,
            program_name_th,
            program_shortname_en,
            program_shortname_th,
            program_year,
          ],
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
      console.error("Bulk Upload Error:", err);

      // Handle Unique Constraint Violation (Code 23505)
      if (err.code === "23505") {
        return res.status(409).json({
          error: "Duplicate program code detected. Please check your file.",
        });
      }

      // Handle Custom Validation Error
      if (err.message && err.message.includes("Missing required fields")) {
        return res.status(400).json({ error: err.message });
      }

      res.status(500).json({ error: "Bulk upload failed" });
    } finally {
      client.release();
    }
  },
);

// =========================================
// 4. CREATE SINGLE PROGRAM
// =========================================
router.post(
  "/",
  authenticateToken,
  authorizeRoles("system_admin", "instructor", "Super_admin"),
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

    // Validate
    if (
      !faculty_id ||
      !program_code ||
      !program_name_en ||
      !program_name_th ||
      !program_year
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO program 
          (faculty_id, program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          RETURNING *`,
        [
          faculty_id,
          program_code,
          program_name_en,
          program_name_th,
          program_shortname_en || null,
          program_shortname_th || null,
          Number(program_year),
        ],
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
  },
);

router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("instructor", "system_admin", "Super_admin"),
  async (req, res) => {
    const programId = req.params.id;
    const {
      program_code,
      program_name_en,
      program_name_th,
      program_shortname_en,
      program_shortname_th,
      program_year,
    } = req.body;

    try {
      const result = await pool.query(
        `UPDATE program SET
         
          program_code = $1,
          program_name_en = $2,
          program_name_th = $3,
          program_shortname_en = $4,
          program_shortname_th = $5,
          program_year = $6
        WHERE id = $7
        RETURNING *`,
        [
          program_code,
          program_name_en,
          program_name_th,
          program_shortname_en,
          program_shortname_th,
          Number(program_year),
          programId,
        ],
      );
      res.status(200).json(result.rows[0]);
    } catch (err: any) {
      console.error(err);
      if (err.code === "23505") {
        return res.status(409).json({
          error: "Program with the same code already exists",
        });
      }
      res.status(500).json({ error: "Failed to update program" });
    }
  },
);

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("instructor", "system_admin", "Super_admin"),
  async (req, res) => {
    const programId = req.params.id;

    try {
      const result = await pool.query(
        `DELETE FROM program WHERE id = $1 RETURNING id, program_code`,
        [programId],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Program not found" });
      }
      res.status(200).json({
        message: "Program deleted successfully",
        data: result.rows[0],
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete program" });
    }
  },
);

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const programId = req.params.id;

    const result = await pool.query(
      `
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
       WHERE p.id = $1
    `,
      [programId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Program not found" });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch program details" });
  }
});

router.post(
  "/duplicate",
  authenticateToken,
  authorizeRoles("instructor", "system_admin", "Super_admin"),
  async (req, res) => {
    const { programId } = req.body;

    if (!programId) {
      return res.status(400).json({ error: "programId is required" });
    }

    try {
      // Step 1: Fetch the original program
      const originalResult = await pool.query(
        `SELECT * FROM program WHERE id = $1`,
        [programId],
      );

      if (originalResult.rows.length === 0) {
        return res.status(404).json({ error: "Original program not found" });
      }

      const original = originalResult.rows[0];

      // Step 2: Create a new program with the same details but a new year
      const nextYear = original.program_year + 1;
      const duplicateResult = await pool.query(
        `INSERT INTO program 
          (faculty_id, program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          RETURNING *`,
        [
          original.faculty_id,
          original.program_code,
          original.program_name_en,
          original.program_name_th,
          original.program_shortname_en,
          original.program_shortname_th,
          nextYear,
        ],
      );

      res.status(201).json(duplicateResult.rows[0]);
    } catch (err: any) {
      console.error(err);
      if (err.code === "23505") {
        return res.status(409).json({
          error: "A program with the same code and year already exists",
        });
      }
      res.status(500).json({ error: "Failed to duplicate program" });
    }
  },
);

export default router;
