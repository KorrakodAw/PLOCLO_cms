import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// GET all courses (Simple list of sections for a program)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const programId = req.query.programId
      ? parseInt(req.query.programId as string)
      : undefined;

    const whereClause: any = {};
    if (programId) {
      whereClause.course = {
        program_id: programId,
      };
    }

    // Fetch Sections and include Master Course info
    const sections = await prisma.courseSection.findMany({
      where: whereClause,
      include: {
        course: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    // Flatten for frontend convenience
    const formatted = sections.map((s) => ({
      id: s.id, // Section ID (Unique per offering)
      code: s.course.code,
      name: s.course.name,
      name_th: s.course.name_th,
      program_id: s.course.program_id,
      section: s.section,
      semester: s.semester,
      year: s.year,
    }));

    res.json(formatted);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// GET paginated courses
router.get("/paginate", authenticateToken, async (req, res) => {
  try {
    // ... (Your existing paginate logic is fine, keep it as is) ...
    // Just ensure you select from prisma.courseSection, NOT prisma.course
    const universityId = req.query.universityId
      ? parseInt(req.query.universityId as string)
      : undefined;
    const facultyId = req.query.facultyId
      ? parseInt(req.query.facultyId as string)
      : undefined;
    const programId = req.query.programId
      ? parseInt(req.query.programId as string)
      : undefined;
    const year = req.query.year
      ? parseInt(req.query.year as string)
      : undefined;
    const semester = req.query.semester
      ? parseInt(req.query.semester as string)
      : undefined;
    const section = req.query.section
      ? parseInt(req.query.section as string)
      : undefined;
    const courseCode = req.query.courseCode as string;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (year) where.year = year;
    if (semester) where.semester = semester;
    if (section) where.section = section;

    // Search on the relation (Master Course)
    if (courseCode) {
      where.course = { code: { contains: courseCode, mode: "insensitive" } };
    }

    if (programId || facultyId || universityId) {
      where.course = {
        ...where.course,
        program: {
          id: programId || undefined,
          faculty: {
            id: facultyId || undefined,
            university: { id: universityId || undefined },
          },
        },
      };
    }

    const [total, sections] = await prisma.$transaction([
      prisma.courseSection.count({ where }),
      prisma.courseSection.findMany({
        where,
        include: { course: true },
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const data = sections.map((s) => ({
      id: s.id,
      course_id: s.course_id,
      code: s.course.code,
      name: s.course.name,
      name_th: s.course.name_th,
      program_id: s.course.program_id,
      section: s.section,
      semester: s.semester,
      year: s.year,
    }));

    res.json({
      data,
      pagination: { total, page, limit, totalPages },
    });
  } catch (err) {
    console.error("Pagination Error:", err);
    res
      .status(500)
      .json({ error: "Unable to retrieve paginated course information" });
  }
});

// POST /api/course
// Logic: "Upsert" Master Course -> Create Section
router.post("/", authenticateToken, async (req, res) => {
  const { code, name, name_th, program_id, section, semester, year } = req.body;

  if (!code || !name || !program_id || !section || !semester || !year) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find existing Master Course (to avoid duplicates in the master table)
      // We look for a course with the same CODE in the same PROGRAM.
      let masterCourse = await tx.course.findFirst({
        where: {
          code: code,
          program_id: parseInt(program_id),
        },
      });

      //

      // If it doesn't exist, Create it (Master data)
      if (!masterCourse) {
        masterCourse = await tx.course.create({
          data: {
            code,
            name,
            name_th: name_th || name,
            program_id: parseInt(program_id),
          },
        });
      }

      // 2. Check for Duplicate Section
      // We cannot have two "Section 1"s for the same course in the same semester/year
      const existingSection = await tx.courseSection.findFirst({
        where: {
          course_id: masterCourse.id,
          section: parseInt(section),
          semester: parseInt(semester),
          year: parseInt(year),
        },
      });

      if (existingSection) {
        throw new Error(
          `Section ${section} already exists for ${code} in this semester.`
        );
      }

      // 3. Create the Section (Offering)
      const newSection = await tx.courseSection.create({
        data: {
          course_id: masterCourse.id,
          section: parseInt(section),
          semester: parseInt(semester),
          year: parseInt(year),
        },
        include: { course: true },
      });

      return newSection;
    });

    res.status(201).json({
      id: result.id,
      code: result.course.code,
      section: result.section,
      message: "Course section created successfully",
    });
  } catch (err: any) {
    console.error(err);
    if (err.message.includes("already exists")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Unable to add course section" });
  }
});

// DELETE /api/course/:id (Deletes a SECTION)
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.courseSection.delete({
      where: { id: parseInt(id) },
    });
    res.json({ success: true, id });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Section not found" });
    }
    res.status(500).json({ error: "Unable to delete course section" });
  }
});

// PATCH /api/course/:id (Updates a SECTION)
router.patch("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { code, name, name_th, program_id, section, semester, year } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Get current section
      const currentSection = await tx.courseSection.findUnique({
        where: { id: parseInt(id) },
        include: { course: true },
      });

      if (!currentSection) throw new Error("Section not found");

      // 2. Update Master Course (Optional: Only if user changed code/name)
      // WARNING: This changes the name for ALL past/future sections of this course code
      if (
        code !== currentSection.course.code ||
        name !== currentSection.course.name
      ) {
        await tx.course.update({
          where: { id: currentSection.course_id },
          data: {
            code,
            name,
            name_th,
            program_id: parseInt(program_id),
          },
        });
      }

      // 3. Update Section specific details
      const updated = await tx.courseSection.update({
        where: { id: parseInt(id) },
        data: {
          section: parseInt(section),
          semester: parseInt(semester),
          year: parseInt(year),
        },
        include: { course: true },
      });

      res.json(updated);
    });
  } catch (err: any) {
    if (err.message === "Section not found")
      return res.status(404).json({ error: err.message });
    res.status(500).json({ error: "Unable to update course" });
  }
});

export default router;
