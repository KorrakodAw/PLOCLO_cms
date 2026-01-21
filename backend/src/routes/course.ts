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
      nameTh: s.course.name_th,
      programId: s.course.program_id,
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
    const parseIntSafe = (value: any) => {
      if (!value) return undefined;
      const parsed = parseInt(value as string);
      return isNaN(parsed) ? undefined : parsed;
    };

    // 1. Capture the raw input string
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

    // --- Build Filters ---
    const where: any = {};

    // Section Filters
    if (year) where.year = year;
    if (semester) where.semester = semester;
    if (section) where.section = section;

    // Course Filters
    const courseWhere: any = {};

    if (courseCode) {
      courseWhere.code = { contains: courseCode, mode: "insensitive" };
    }

    // --- SMART PROGRAM FILTERING (Prevents Error 500) ---
    // We construct a filter object for the 'program' relation
    const programRelationFilter: any = {};

    if (programParam) {
      const asInt = parseInt(programParam);
      // PostgreSQL Integer Max is 2,147,483,647.
      // If the input is larger (like your code 25370201100238), we MUST NOT query the 'id' column with it.
      const isSafeId = !isNaN(asInt) && asInt > 0 && asInt < 2147483647;

      if (isSafeId) {
        // It's small enough to potentially be an ID, so we check both
        programRelationFilter.OR = [
          { id: asInt },
          { program_code: programParam },
        ];
      } else {
        // It's huge or alphanumeric, so it MUST be a code. DO NOT check 'id'.
        programRelationFilter.program_code = programParam;
      }
    }

    // Add Faculty/University hierarchy filters to the same relation object
    if (facultyId) {
      programRelationFilter.faculty = { id: facultyId };
    }

    if (universityId) {
      // Merge into existing faculty filter or create new one
      programRelationFilter.faculty = {
        ...(programRelationFilter.faculty || {}),
        university: { id: universityId },
      };
    }

    // Attach the smart program filter to the course query
    if (Object.keys(programRelationFilter).length > 0) {
      courseWhere.program = programRelationFilter;
    }

    // Attach course filters to main where clause
    if (Object.keys(courseWhere).length > 0) {
      where.course = courseWhere;
    }

    // --- Execute Query ---
    const [total, sections] = await prisma.$transaction([
      prisma.courseSection.count({ where }),
      prisma.courseSection.findMany({
        where,
        include: {
          course: true, // Needed for mapping
        },
        orderBy: [
          { year: "desc" },
          { semester: "desc" },
          { course: { code: "asc" } },
          { section: "asc" },
        ],
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
          `Section ${section} already exists for ${code} in this semester.`,
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
      where: { id: parseInt(id as string) },
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
        where: { id: parseInt(id as string) },
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
        where: { id: parseInt(id as string) },
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
