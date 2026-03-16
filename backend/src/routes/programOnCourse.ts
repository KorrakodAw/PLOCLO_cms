import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

interface ProgramOnCourseItem {
  program_id: number;
  semester_id: number;
  type: string;
}

// POST: สร้าง ProgramOnCourse ใหม่ หรือ อัพเดตถ้ามีอยู่แล้ว
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  const { updates } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of updates as ProgramOnCourseItem[]) {
        // Validation: ตรวจสอบว่า Program และ Course มีอยู่จริง
        const program = await tx.program.findUnique({
          where: { id: Number(item.program_id) },
        });
        const semester = await tx.courseSemester.findUnique({
          where: { id: Number(item.semester_id) },
        });

        if (!program || !semester) {
          throw new Error("PROGRAM_OR_SEMESTER_NOT_FOUND");
        }

        // Upsert: ถ้ามีอยู่แล้วก็ update, ถ้าไม่มีให้ create
        await tx.programOnCourse.upsert({
          where: {
            program_id_semester_id: {
              program_id: Number(item.program_id),
              semester_id: Number(item.semester_id),
            },
          },
          update: {
            type: item.type,
            assignedAt: new Date(),
          },
          create: {
            program_id: Number(item.program_id),
            semester_id: Number(item.semester_id),
            type: item.type,
            assignedAt: new Date(),
          },
        });
      }
    });

    res.json({ success: true, message: "ProgramOnCourse mappings saved" });
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      if (err.message === "PROGRAM_OR_COURSE_NOT_FOUND") {
        return res.status(404).json({ error: "Program or Course not found" });
      }
    }
    res.status(500).json({ error: "Failed to save ProgramOnCourse mappings" });
  }
});

// GET: ดึง ProgramOnCourse ทั้งหมด
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { program_id, semester_id } = req.query;

    const relations = await prisma.programOnCourse.findMany({
      where: {
        program_id: program_id ? Number(program_id) : undefined,
        semester_id: semester_id ? Number(semester_id) : undefined,
      },
      include: {
        program: true,
        semester: true,
      },
    });

    res.json(relations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ProgramOnCourse mappings" });
  }
});

export default router;