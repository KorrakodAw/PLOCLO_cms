import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

const parseIntSafe = (value: any) => {
  if (!value) return undefined;
  const parsed = parseInt(String(value));
  return isNaN(parsed) ? undefined : parsed;
};

/**
 * 1. STATIC ROUTES (กลุ่ม Path เฉพาะเจาะจง - ต้องอยู่ด้านบน)
 */

// POST / - สร้าง Master Course และ Section ใหม่
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  const { code, name, name_th, credits, program_id, section, semester, year } =
    req.body;

  // 1. Validation เบื้องต้น
  if (
    !code ||
    !name ||
    !credits ||
    !program_id ||
    !section ||
    !semester ||
    !year
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // --- STEP 1: Manage Master Course ---
      let masterCourse = await tx.course.findFirst({
        where: {
          code,
          program_id: parseInt(program_id),
        },
      });

      if (!masterCourse) {
        masterCourse = await tx.course.create({
          data: {
            code,
            name,
            name_th: name_th || name,
            credits: parseFloat(credits),
            program_id: parseInt(program_id),
          },
        });
      }

      // --- STEP 2: Manage Course Semester (The Bridge) ---
      // ใช้ upsert เพื่อหาถ้ามีอยู่แล้ว หรือสร้างใหม่ถ้ายังไม่มี
      const courseSemester = await tx.courseSemester.upsert({
        where: {
          course_id_semester_year: {
            course_id: masterCourse.id,
            semester: parseInt(semester),
            year: parseInt(year),
          },
        },
        update: {}, // ไม่ต้องอัปเดตอะไรถ้ามีอยู่แล้ว
        create: {
          course_id: masterCourse.id,
          semester: parseInt(semester),
          year: parseInt(year),
        },
      });

      // --- STEP 3: Manage Course Section ---
      const existingSection = await tx.courseSection.findFirst({
        where: {
          course_semester_id: courseSemester.id,
          section: parseInt(section),
        },
      });

      if (existingSection) {
        throw new Error(`Section ${section} already exists for this semester.`);
      }

      return await tx.courseSection.create({
        data: {
          course_semester_id: courseSemester.id,
          section: parseInt(section),
        },
        include: {
          semester_config: {
            include: { course: true },
          },
        },
      });
    });

    res.status(201).json({
      message: "Hierarchy created successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("Create Course Error:", err);
    res.status(400).json({
      error: err.message || "Unable to add course section",
    });
  }
});

// GET /paginate - กรองข้อมูลผ่าน Hierarchy ใหม่
router.get("/paginate", authenticateToken, async (req: Request, res: Response) => {
  try {
    const programParam = req.query.programId as string | undefined;
    const universityId = parseIntSafe(req.query.universityId);
    const facultyId = parseIntSafe(req.query.facultyId);
    const year = parseIntSafe(req.query.year);
    const semester = parseIntSafe(req.query.semester);
    const section = parseIntSafe(req.query.section);
    const courseCode = req.query.courseCode as string | undefined;

    const page = parseIntSafe(req.query.page) || 1;
    const limit = parseIntSafe(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 🟢 กรองที่ระดับ CourseSection และเชื่อมโยงไปหา Semester/Course
    const where: any = {
      section: section || undefined,
      semester_config: {
        semester: semester || undefined,
        year: year || undefined,
        course: {
          OR: courseCode ? [
            { code: { contains: courseCode, mode: "insensitive" } },
            { name: { contains: courseCode, mode: "insensitive" } },
            { name_th: { contains: courseCode, mode: "insensitive" } },
          ] : undefined,
          program: programParam ? {
            id: !isNaN(parseInt(programParam)) ? parseInt(programParam) : undefined,
            program_code: isNaN(parseInt(programParam)) ? programParam : undefined,
            faculty: (facultyId || universityId) ? {
              id: facultyId,
              university: universityId ? { id: universityId } : undefined
            } : undefined
          } : undefined
        }
      }
    };

    const [total, sections] = await prisma.$transaction([
      prisma.courseSection.count({ where }),
      prisma.courseSection.findMany({
        where,
        include: {
          semester_config: {
            include: { course: true }
          }
        },
        orderBy: [
          { semester_config: { year: "desc" } },
          { semester_config: { semester: "desc" } },
          { section: "asc" },
        ],
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: sections.map((s) => ({
        id: s.id,
        course_id: s.semester_config.course.id,
        code: s.semester_config.course.code,
        name: s.semester_config.course.name,
        name_th: s.semester_config.course.name_th,
        program_id: s.semester_config.course.program_id,
        semester_id: s.semester_config.id,
        credits: s.semester_config.course.credits,
        section: s.section,
        semester: s.semester_config.semester,
        year: s.semester_config.year,
      })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Pagination failed" });
  }
});

/**
 * 2. GENERAL & DYNAMIC ROUTES
 */

// PATCH /:id - อัปเดตข้อมูลข้ามลำดับชั้น
router.patch("/:id", authenticateToken, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const { code, name, name_th, credits, program_id, section, semester, year } = req.body;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.courseSection.findUnique({
        where: { id },
        include: { semester_config: { include: { course: true } } },
      });

      if (!current) throw new Error("Section not found");

      // 1. อัปเดตข้อมูลที่ระดับ Course (Master)
      const updatedCourse = await tx.course.update({
        where: { id: current.semester_config.course.id },
        data: {
          code,
          name,
          name_th: name_th || name,
          credits: parseFloat(credits),
          program_id: parseInt(program_id),
        },
      });

      // 2. จัดการ Semester (ถ้าเปลี่ยนเทอม/ปี จะย้ายไปผูกกับ Config ตัวอื่น)
      const targetSemester = await tx.courseSemester.upsert({
        where: {
          course_id_semester_year: {
            course_id: updatedCourse.id,
            semester: parseInt(semester),
            year: parseInt(year),
          }
        },
        update: {},
        create: {
          course_id: updatedCourse.id,
          semester: parseInt(semester),
          year: parseInt(year),
        }
      });

      // 3. อัปเดตตัว Section เอง
      return await tx.courseSection.update({
        where: { id },
        data: {
          section: parseInt(section),
          course_semester_id: targetSemester.id
        },
        include: { semester_config: { include: { course: true } } }
      });
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Update failed" });
  }
});

// DELETE /:id - ลบเฉพาะ Section
router.delete("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    await prisma.courseSection.delete({ where: { id } });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "Unable to delete section" });
  }
});

// DELETE / (Bulk) - ลบยกแผง (Course -> Semester -> Section)
router.delete("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.query.id)); // รับ section id มา
    const section = await prisma.courseSection.findUnique({
      where: { id },
      include: { semester_config: true }
    });

    if (!section) return res.status(404).json({ error: "Section not found" });

    const courseId = section.semester_config.course_id;

    // 🟢 ลบทุกอย่างที่ผูกกับวิชานี้ (Prisma จะ Cascade ให้ถ้าตั้งค่าไว้ใน Schema)
    await prisma.course.delete({ where: { id: courseId } });

    res.json({ success: true, message: "Course and all related data deleted" });
  } catch (err) {
    res.status(500).json({ error: "Unable to delete course hierarchy" });
  }
});

router.get(
  "/forSummary",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // 1. ตรวจสอบว่ามีการส่ง programId มาหรือไม่
      const queryProgramId = req.query.programId;

      if (!queryProgramId) {
        return res.status(400).json({
          error: "programId is required to fetch records",
        });
      }

      const programId = parseInt(String(queryProgramId));

      // 2. ตรวจสอบว่า programId เป็นตัวเลขที่ถูกต้องหรือไม่
      if (isNaN(programId)) {
        return res.status(400).json({ error: "Invalid programId format" });
      }

      // 3. ดึงข้อมูลโดยบังคับเงื่อนไข program_id
      const result = await prisma.course.findMany({
        where: { program_id: programId }, // บังคับให้ต้องมีค่าเสมอ
        include: { program: true },
        orderBy: { code: "asc" },
      });

      res.json(
        result.map((course) => ({
          id: course.id,
          code: course.code,
          name: course.name,
          name_th: course.name_th,
          credits: course.credits,
          program_id: course.program.id,
          program_code: course.program.program_code,
          program_year: course.program.program_year,
        })),
      );
    } catch (err: any) {
      res
        .status(500)
        .json({ error: "Failed to fetch records", details: err.message });
    }
  },
);

export default router;
