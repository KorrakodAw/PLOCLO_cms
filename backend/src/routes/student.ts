import { Router, Request, Response } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

/**
 * ✅ GET students (Supports single or multiple programIds via comma)
 * Example: /student?programId=8 OR /student?programId=8,7
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { programId } = req.query;

    if (!programId) {
      return res.status(400).json({ error: "Program ID is required" });
    }

    // 1. จัดการแปลง Query String ให้เป็น Array ของตัวเลขที่สะอาด
    // รองรับทั้ง "7" และ "7,8" หรือแม้แต่ ["7", "8"]
    const idArray = String(programId)
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (idArray.length === 0) {
      return res.status(400).json({ error: "Invalid Program ID format" });
    }

    // 2. ใช้ ANY($1::int[]) เพื่อให้ SQL หาข้อมูลจากทุก ID ใน Array
    const result = await pool.query(
      `SELECT 
        s.id,
        s.student_code,
        s.first_name,
        s.last_name,
        s.email,
        s.program_id,
        p.program_name_en,
        p.program_name_th,
        p.program_shortname_th,
        p.program_shortname_en,
        p.program_year
      FROM student s
      JOIN program p ON s.program_id = p.id
      WHERE s.program_id = ANY($1::int[])
      ORDER BY p.id ASC, s.student_code ASC`,
      [idArray],
    );

    // 3. จัดกลุ่มข้อมูล (Group by program_id) ให้เป็น Array ของ Object
    const groupedData = result.rows.reduce((acc: any[], student: any) => {
      // 🟢 ลองเช็คทั้ง student.program_id และ student.programId
      // หรือใช้ชื่อให้ตรงกับที่ SELECT มา (s.program_id)
      const pId = student.program_id || student.programid;

      let group = acc.find((g) => g.programId === pId);

      if (!group) {
        group = {
          programId: pId,
          programNameEn: student.program_name_en,
          programNameTh: student.program_name_th,
          programShortNameEn: student.program_shortname_en,
          programShortNameTh: student.program_shortname_th,
          programYear: student.program_year,
          students: [],
        };
        acc.push(group);
      }

      group.students.push({
        id: student.id,
        student_code: student.student_code,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
      });

      return acc;
    }, []);

    // คืนค่าเป็น Array [ { programId: 7, students: [...] }, { programId: 8, ... } ]
    res.json(groupedData);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

/**
 * ✅ POST create new student
 */
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  const { student_code, first_name, last_name, email, program_id } = req.body;

  if (!student_code || !first_name || !last_name || !program_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO student (student_code, first_name, last_name, program_id, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [student_code, first_name, last_name, Number(program_id), email],
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === "23505")
      return res
        .status(400)
        .json({ error: "Student ID or email already exists" });
    res.status(500).json({ error: "Failed to create student" });
  }
});

/**
 * ✅ POST bulk create students (Using Transaction)
 */
router.post("/bulk", authenticateToken, async (req: Request, res: Response) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: "Students array is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insertedStudents = [];
    for (const student of students) {
      const res = await client.query(
        `INSERT INTO student (student_code, first_name, last_name, program_id, email)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          student.student_code,
          student.first_name,
          student.last_name,
          student.program_id,
          student.email,
        ],
      );
      insertedStudents.push(res.rows[0]);
    }
    await client.query("COMMIT");
    res.status(201).json({ insertedStudents });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Bulk insert failed" });
  } finally {
    client.release();
  }
});

/**
 * ✅ DELETE bulk students
 */
router.delete(
  "/bulk-delete",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: "studentIds array is required" });
    }

    try {
      const result = await pool.query(
        `DELETE FROM student WHERE id = ANY($1::int[]) RETURNING *`,
        [studentIds],
      );
      res.json({
        message: `${result.rowCount} students deleted`,
        deletedStudents: result.rows,
      });
    } catch (err) {
      res.status(500).json({ error: "Bulk delete failed" });
    }
  },
);

/**
 * ✅ GET paginated students
 */
router.get(
  "/paginate",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const universityId = req.query.universityId as string;
      const facultyId = req.query.facultyId as string;
      const programId = req.query.programId as string;
      const year = req.query.year as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      let whereClause = "WHERE 1=1";
      const params: any[] = [];

      const addFilter = (val: any, field: string) => {
        if (val) {
          params.push(val);
          whereClause += ` AND ${field} = $${params.length}`;
        }
      };

      addFilter(universityId, "university.id");
      addFilter(facultyId, "faculty.id");
      addFilter(programId, "program.id"); // กรองด้วย ID ของ Program จะแม่นยำกว่า
      addFilter(year, "program.program_year");

      const dataQuery = `
      SELECT student.*, program.program_shortname_th, program.program_shortname_en, program.program_year
      FROM student
      JOIN program ON student.program_id = program.id
      JOIN faculty ON program.faculty_id = faculty.id
      JOIN university ON faculty.university_id = university.id
      ${whereClause}
      ORDER BY student.id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

      const countQuery = `
      SELECT COUNT(*) FROM student
      JOIN program ON student.program_id = program.id
      JOIN faculty ON program.faculty_id = faculty.id
      JOIN university ON faculty.university_id = university.id
      ${whereClause}`;

      const [dataRes, countRes] = await Promise.all([
        pool.query(dataQuery, [...params, limit, offset]),
        pool.query(countQuery, params),
      ]);

      res.json({
        data: dataRes.rows,
        total: parseInt(countRes.rows[0].count),
        page,
        limit,
      });
    } catch (err) {
      res.status(500).json({ error: "Pagination failed" });
    }
  },
);

/**
 * ✅ Standard CRUD (Single)
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT student.*, p.program_shortname_en, p.program_shortname_th 
       FROM student JOIN program p ON student.program_id = p.id WHERE student.id = $1`,
      [req.params.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Student not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  const { first_name, last_name, student_code, email } = req.body;
  try {
    const result = await pool.query(
      `UPDATE student SET first_name = $1, last_name = $2, student_code = $3, email = $4 
       WHERE id = $5 RETURNING *`,
      [first_name, last_name, student_code, email, req.params.id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM student WHERE id = $1 RETURNING *",
      [req.params.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

router.get(
  "/semester-students/:courseSemesterId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { courseSemesterId } = req.params;

      if (!courseSemesterId) {
        return res.status(400).json({ error: "courseSemesterId is required" });
      }

      // Query หาข้อมูลนักศึกษาผ่านความสัมพันธ์แบบ Nested
      const courseWithStudents = await prisma.courseSemester.findUnique({
        where: {
          id: Number(courseSemesterId),
        },
        select: {
          // 1. เข้าไปที่ Sections ของ CourseSemester นี้
          sections: {
            select: {
              id: true,
              section: true,
              // 2. เข้าไปที่ StudentOnSection ของแต่ละ Section
              students: {
                select: {
                  // 3. ดึงข้อมูล Student ออกมา
                  student: {
                    select: {
                      id: true,
                      student_code: true,
                      first_name: true,
                      last_name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!courseWithStudents) {
        return res.status(404).json({ error: "Course Semester not found" });
      }

      // 4. Flatten ข้อมูลเพื่อให้ Frontend ใช้ง่ายขึ้น (รวมนักศึกษาจากทุก Section)
      const allStudents = courseWithStudents.sections.flatMap((section) =>
        section.students.map((s) => ({
          ...s.student,
          sectionNo: section.section, // เลข Section เช่น 1, 2, 3
          sectionId: section.id,
        })),
      );

      // 2. เรียงลำดับ (Multi-level Sort)
      const sortedStudents = allStudents.sort((a, b) => {
        // ชั้นที่ 1: เรียงตาม Section (น้อยไปมาก)
        if (a.sectionNo !== b.sectionNo) {
          return Number(a.sectionNo) - Number(b.sectionNo);
        }

        // ชั้นที่ 2: ถ้า Section เดียวกัน ให้เรียงตาม Student Code (น้อยไปมาก)
        const codeA = a.student_code || "";
        const codeB = b.student_code || "";
        return codeA.localeCompare(codeB, undefined, { numeric: true });
      });

      res.json(sortedStudents);
    } catch (error) {
      console.error("Error fetching students in course semester:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

router.get("/email/:email",authenticateToken, async (req, res) => {
  try {
    const email = req.params.email as string;

    const student = await prisma.student.findFirst({
      where: { email },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    console.error("Error fetching student by email:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
