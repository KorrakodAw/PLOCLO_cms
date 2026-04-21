import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

const parseIntSafe = (value: any) => {
  if (!value) return undefined;
  const parsed = parseInt(String(value));
  return isNaN(parsed) ? undefined : parsed;
};

router.get(
  "/ByInstructor/:instructorId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { instructorId } = req.params;
      const { programId, page = "1", limit = "10" } = req.query;

      // แปลงค่า Pagination
      const p = Math.max(1, parseInt(String(page)));
      const l = Math.max(1, parseInt(String(limit)));
      const skip = (p - 1) * l;

      // 1. หา IDs ของวิชาที่อาจารย์สอน
      const instructorAssignments = await prisma.courseInstructor.findMany({
        where: { instructorId: Number(instructorId) },
        select: { courseId: true },
      });
      const courseIds = instructorAssignments.map((item) => item.courseId);

      // 2. เงื่อนไขการกรอง
      const whereCondition: any = { id: { in: courseIds } };
      if (programId) {
        whereCondition.semesters = {
          some: {
            programOnCourses: {
              some: {
                type: "core",
                program: { program_code: String(programId) },
              },
            },
          },
        };
      }

      // 3. รัน Query พร้อมกัน (Count + Data)
      const [totalCount, rawCourses] = await Promise.all([
        prisma.course.count({ where: whereCondition }),
        prisma.course.findMany({
          where: whereCondition,
          skip: skip,
          take: l,
          include: {
            semesters: {
              include: {
                programOnCourses: {
                  where: {
                    type: "core",
                    ...(programId && {
                      program: { program_code: String(programId) },
                    }),
                  },
                  include: { program: true },
                },
              },
            },
          },
        }),
      ]);

      // 4. Transform ข้อมูล
      const result = rawCourses
        .map((course) => {
          const programs = course.semesters.flatMap((sem) =>
            sem.programOnCourses.map((poc) => ({
              program_id: poc.program.id,
              program_code: poc.program.program_code,
              program_shortname_en: poc.program.program_shortname_en,
              program_shortname_th: poc.program.program_shortname_th,
              type: poc.type,
            })),
          );

          const uniquePrograms = Array.from(
            new Map(programs.map((p) => [p.program_id, p])).values(),
          );

          if (uniquePrograms.length === 0 && programId) return null;

          return {
            id: course.id,
            name: course.name,
            name_th: course.name_th,
            code: course.code,
            programs: uniquePrograms,
          };
        })
        .filter(Boolean);

      // 5. ส่งผลลัพธ์พร้อม Metadata ของ Pagination
      res.json({
        data: result,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / l),
          currentPage: p,
          limit: l,
        },
      });
    } catch (err) {
      console.error("Error fetching core courses:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

router.get(
  "/ById/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params; // 1. ดึง ID ออกจาก URL Params

      const course = await prisma.course.findUnique({
        where: {
          id: Number(id),
        },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      res.json(course);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch course" });
    }
  },
);

router.get(
  "/byCsemester/:semesterId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { semesterId } = req.params;

      const courseSemester = await prisma.courseSemester.findUnique({
        where: { id: Number(semesterId) },
        include: {
          course: true,
        },
      });

      if (!courseSemester) {
        return res.status(404).json({ error: "Course semester not found" });
      }

      res.json(courseSemester.course);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch course by semester" });
    }
  },
);

// POST / - สร้าง Master Course และจัดการ Semester/Section/Program
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  const {
    code,
    name,
    name_th,
    credits,
    faculty_id,
    program_id,
    section,
    semester,
    year,
  } = req.body;

  if (!code || !name || !faculty_id) {
    return res.status(400).json({
      error: "Missing master course identity (code, name, faculty_id)",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Manage Master Course (ยึดตาม Code และ Faculty เจ้าของวิชา)
      let masterCourse = await tx.course.findFirst({
        where: { code, faculty_id: Number(faculty_id) },
      });

      if (!masterCourse) {
        masterCourse = await tx.course.create({
          data: {
            code,
            name,
            name_th: name_th || name,
            credits: parseFloat(credits) || 3,
            faculty_id: Number(faculty_id),
          },
        });
      }

      // 2. ถ้ามีการส่งข้อมูลการเปิดสอนมาด้วย (Year, Semester, Section)
      if (year && semester && section) {
        // --- STEP A: Manage Course Semester ---
        const courseSemester = await tx.courseSemester.upsert({
          where: {
            course_id_semester_year: {
              course_id: masterCourse.id,
              semester: Number(semester),
              year: Number(year),
            },
          },
          update: {},
          create: {
            course_id: masterCourse.id,
            semester: Number(semester),
            year: Number(year),
          },
        });

        // --- STEP B: Link Program to Semester (แทนการ Link กับ Course) ---
        if (program_id) {
          await tx.programOnCourse.upsert({
            where: {
              program_id_semester_id: {
                // 🟢 เปลี่ยนมาใช้ Composite Key ชุดใหม่
                program_id: Number(program_id),
                semester_id: courseSemester.id,
              },
            },
            update: {},
            create: {
              program_id: Number(program_id),
              semester_id: courseSemester.id,
              type: "core",
            },
          });
        }

        // --- STEP C: Manage Section ---
        const existingSection = await tx.courseSection.findFirst({
          where: {
            course_semester_id: courseSemester.id,
            section: Number(section),
          },
        });

        if (!existingSection) {
          await tx.courseSection.create({
            data: {
              course_semester_id: courseSemester.id,
              section: Number(section),
            },
          });
        }
      }

      return masterCourse;
    });

    res
      .status(201)
      .json({ message: "Hierarchy created successfully", data: result });
  } catch (err: any) {
    console.error("Post Course Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// GET /paginate/SectionId
router.get(
  "/paginate",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const programCode = req.query.programCode as string | undefined;
      const universityId = parseIntSafe(req.query.universityId) || undefined;
      const facultyId = parseIntSafe(req.query.facultyId) || undefined;
      const year = parseIntSafe(req.query.year) || undefined;
      const semester = parseIntSafe(req.query.semester) || undefined;
      const section = parseIntSafe(req.query.section) || undefined;
      const courseSearch = req.query.courseCode as string | undefined;

      const page = parseIntSafe(req.query.page) || 1;
      const limit = parseIntSafe(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const where: any = {
        section: section || undefined,
        semester_config: {
          semester: semester || undefined,
          year: year || undefined,
          // 🟢 กรองผ่าน Program ที่ผูกกับ Semester_config
          programs:
            programCode || universityId
              ? {
                  some: {
                    program: {
                      program_code: programCode || undefined,
                      faculty: universityId
                        ? { university_id: universityId }
                        : undefined,
                    },
                  },
                }
              : undefined,
          course: {
            faculty_id: facultyId || undefined,
            OR: courseSearch
              ? [
                  { code: { contains: courseSearch, mode: "insensitive" } },
                  { name: { contains: courseSearch, mode: "insensitive" } },
                ]
              : undefined,
          },
        },
      };

      const [total, sections] = await prisma.$transaction([
        prisma.courseSection.count({ where }),
        prisma.courseSection.findMany({
          where,
          include: {
            semester_config: {
              include: {
                course: true,
                programOnCourses: { include: { program: true } }, // ดึงรายการหลักสูตรที่ผูกกับเทอมนี้
              },
            },
          },
          orderBy: [{ semester_config: { year: "desc" } }, { section: "asc" }],
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
          credits: s.semester_config.course.credits,
          section: s.section,
          semester: s.semester_config.semester,
          year: s.semester_config.year,
          faculty_id: s.semester_config.course.faculty_id,
          semester_id: s.semester_config.id,

          // ดึง program_code จากความสัมพันธ์ที่ผูกกับ semester
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("Pagination Error:", err);
      res.status(500).json({ error: "Pagination failed" });
    }
  },
);

router.get(
  "/paginate/ByProgram",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const universityId = parseIntSafe(req.query.universityId);
      const facultyId = parseIntSafe(req.query.facultyId);
      const programId = parseIntSafe(req.query.programId);
      const programCode = req.query.programCode as string;

      const page = parseIntSafe(req.query.page) || 1;
      const limit = parseIntSafe(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      let targetProgramCode = programCode;

      // 1. ถ้าส่ง programId มา ให้ไปหา program_code ในตาราง Program
      if (programId && !targetProgramCode) {
        const prog = await prisma.program.findUnique({
          where: { id: programId },
          select: { program_code: true },
        });
        if (prog) targetProgramCode = prog.program_code;
      }

      // --- กรณีที่ 1: กรองตามหลักสูตร (ใช้ Program Code เพื่อหาทุก Program ID ที่เกี่ยวข้อง) ---
      if (targetProgramCode) {
        const where: Prisma.ProgramOnCourseWhereInput = {
          program: {
            program_code: targetProgramCode,
          },
          // คุณสามารถเพิ่ม type: "core" ตรงนี้ได้ถ้าต้องการกรองเฉพาะวิชาบังคับในหลักสูตร
          type: "core",
        };

        const [total, items] = await prisma.$transaction([
          prisma.programOnCourse.count({ where }),
          prisma.programOnCourse.findMany({
            where,
            include: {
              program: true,
              semester: { include: { course: true } },
            },
            skip,
            take: limit,
            orderBy: [{ program: { program_year: "desc" } }],
          }),
        ]);

        return res.json({
          data: items.map((item) => ({
            semester_id: item.semester_id,
            program_id: item.program_id,
            program_name: item.program.program_name_en,
            program_year: item.program.program_year,
            course_id: item.semester.course.id,
            code: item.semester.course.code,
            name: item.semester.course.name,
            name_th: item.semester.course.name_th,
            credits: item.semester.course.credits,
          })),
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        });
      }

      // --- กรณีที่ 2: ไม่ระบุหลักสูตร (ดึงจาก Master Course และ Default Type เป็น core) ---
      const courseWhere: Prisma.CourseWhereInput = {
        faculty:
          facultyId || universityId
            ? {
                id: facultyId || undefined,
                university_id: universityId || undefined,
              }
            : undefined,
      };

      const [total, courses] = await prisma.$transaction([
        prisma.course.count({ where: courseWhere }),
        prisma.course.findMany({
          where: courseWhere,
          skip,
          take: limit,
          orderBy: { code: "asc" },
        }),
      ]);

      return res.json({
        data: courses.map((c) => ({
          course_id: c.id,
          code: c.code,
          name: c.name,
          name_th: c.name_th,
          credits: c.credits,
          // 🟢 กำหนดเป็น "core" ตามที่คุณต้องการเมื่อเป็นการดึงจากตารางหลัก
          type: "core",
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("Fetch Error:", err);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  },
);

router.delete(
  "/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid course section ID" });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // 1. ค้นหาข้อมูล Section นี้ก่อนเพื่อเอา semester_id มาตรวจสอบต่อ
        const section = await tx.courseSection.findUnique({
          where: { id },
          include: { semester_config: true }, // ดึงข้อมูล Semester มาด้วย
        });

        if (!section) throw new Error("Section not found");

        const semesterId = section.course_semester_id;
        const courseId = section.semester_config.course_id;

        // 2. ลบ Section ปัจจุบัน
        await tx.courseSection.delete({ where: { id } });

        // 3. ตรวจสอบว่าใน Semester นี้ยังมี Section อื่นเหลืออยู่ไหม
        const remainingSections = await tx.courseSection.count({
          where: { course_semester_id: semesterId },
        });

        if (remainingSections === 0) {
          // ถ้าไม่เหลือ Section แล้ว ให้ลบ Semester ออก
          await tx.courseSemester.delete({ where: { id: semesterId } });

          // 4. ตรวจสอบต่อว่าใน Course นี้ยังมี Semester อื่น (ปี/เทอมอื่น) เหลืออยู่ไหม
          const remainingSemesters = await tx.courseSemester.count({
            where: { course_id: courseId },
          });

          if (remainingSemesters === 0) {
            // ถ้าไม่เหลือ Semester ไหนเปิดสอนวิชานี้เลย ให้ลบวิชา (Master Course) ออก
            await tx.course.delete({ where: { id: courseId } });
          }
        }
      });

      res.json({
        message: "Course section and empty hierarchies deleted successfully",
      });
    } catch (err: any) {
      console.error("Delete Error:", err);
      res.status(500).json({ error: err.message || "Failed to delete" });
    }
  },
);

router.get(
  "/unique/:year",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { year } = req.params;
      const { programId } = req.query; // รับจาก Query string เช่น ?programId=1

      if (!year) {
        return res.status(400).json({ error: "Year is required" });
      }

      // สร้าง Filter object
      const whereClause: any = {
        year: Number(year),
      };

      // 🟢 ถ้ามีการส่ง programId มา ให้เพิ่มเข้าไปในเงื่อนไขด้วย
      if (programId) {
        whereClause.program_id = Number(programId);
      }

      const semesters = await prisma.courseSemester.findMany({
        where: whereClause,
        distinct: ["semester"], // 👈 พระเอก: ยุบ 1, 1, 1 ให้เหลือ 1
        select: {
          semester: true,
        },
        orderBy: {
          semester: "asc",
        },
      });

      // แปลงจาก [{semester: 1}, {semester: 2}] เป็น [1, 2]
      const result = semesters.map((s) => s.semester);

      res.json(result);
    } catch (error) {
      console.error("Error fetching unique semesters:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

router.get("/list", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { year, semester, programId } = req.query;

    if (!year || !semester || !programId) {
      return res.status(400).json({
        error:
          "Missing required query parameters: year, semester, or programId",
      });
    }

    // 🟢 ดึงข้อมูลผ่าน ProgramOnCourse เพราะมีทั้ง program_id และ semester_id อยู่แล้ว
    const results = await prisma.programOnCourse.findMany({
      where: {
        program_id: Number(programId),
        semester: {
          // กรองเงื่อนไข ปี และ เทอม ผ่าน Relation 'semester' (CourseSemester)
          year: Number(year),
          semester: Number(semester),
        },
      },
      select: {
        semester_id: true, // นี่คือค่าที่คุณต้องการ (CourseSemester ID)
        type: true, // ประเภทวิชา (ถ้าต้องการใช้)
        semester: {
          select: {
            course_id: true,
            course: {
              select: {
                name: true,
                name_th: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: {
        semester: {
          course: {
            code: "asc",
          },
        },
      },
    });

    // ปรับโครงสร้างข้อมูลให้ใช้ง่ายขึ้นก่อนส่งกลับ (Flatten data)
    const formattedCourses = results.map((item) => ({
      semesterId: item.semester_id,
      courseId: item.semester.course_id,
      courseName: item.semester.course.name,
      courseNameTh: item.semester.course.name_th,
      courseCode: item.semester.course.code,
      type: item.type,
    }));

    res.json(formattedCourses);
  } catch (error) {
    console.error("Error fetching courses via ProgramOnCourse:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:id", authenticateToken, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { name, name_th, credits, code } = req.body;

  if (isNaN(id)) return res.status(400).json({ error: "Invalid course ID" });

  try {
    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        name: name || undefined,
        name_th: name_th || undefined,
        code: code || undefined,
        // 🟢 ใช้ new Prisma.Decimal เพื่อให้ตรงกับ Type ใน Schema
        credits:
          credits !== undefined ? new Prisma.Decimal(credits) : undefined,
      },
    });
    res.json(updatedCourse);
  } catch (err: any) {
    console.error("Update Error Details:", err); // ดู Log ใน Terminal ว่ามันฟ้องอะไร

    // 🚩 เช็คว่า Error เพราะรหัสวิชาซ้ำ (Unique Constraint) หรือไม่
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Course code already exists" });
    }

    res
      .status(500)
      .json({ error: "Failed to update course", details: err.message });
  }
});

export default router;
