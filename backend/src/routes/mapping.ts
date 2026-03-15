import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

router.post("/clo-plo", authenticateToken, async (req, res) => {
  // 🟢 รับ 'updates' ซึ่งเป็น Array จาก req.body
  const { updates } = req.body;

  if (!Array.isArray(updates)) {
    return res
      .status(400)
      .json({ error: "Invalid updates format. Expected an array." });
  }

  try {
    // ใช้ Transaction เพื่อให้มั่นใจว่าข้อมูลจะถูกบันทึกสำเร็จทั้งหมดหรือล้มเหลวทั้งหมด
    await prisma.$transaction(
      updates.map((item) => {
        const cloId = Number(item.clo_id);
        const ploId = Number(item.plo_id);
        const weight = Number(item.weight);

        if (weight > 0 && weight <= 100) {
          return prisma.cloPloMapping.upsert({
            where: {
              cloId_ploId: { cloId, ploId },
            },
            update: { weight, updatedAt: new Date() },
            create: { cloId, ploId, weight },
          });
        } else {
          // ถ้า weight เป็น 0 หรือติดลบ ให้ทำการลบ Mapping นั้นทิ้ง
          return prisma.cloPloMapping.deleteMany({
            where: { cloId, ploId },
          });
        }
      }),
    );

    res.json({
      success: true,
      message: "All CLO-PLO Mappings saved successfully",
    });
  } catch (err) {
    console.error("Bulk Save Error:", err);
    res.status(500).json({ error: "Failed to save mappings" });
  }
});

// --- 1. CLO to PLO Mapping (ยังคงผูกกับ Course เป็นหลัก) ---

router.get("/clo-plo/:courseId", authenticateToken, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId as string );
    if (isNaN(courseId))
      return res.status(400).json({ error: "Invalid Course ID" });

    const result = await pool.query(
      `SELECT m.clo_id, m.plo_id, m.weight 
       FROM clo_plo_mapping m
       JOIN clo c ON m.clo_id = c.id
       WHERE c.course_id = $1`,
      [courseId],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch CLO-PLO mappings" });
  }
});

// --- 2. Assignment to CLO Mapping (ปรับตามโครงสร้าง Semester) ---

router.post("/assignment-clo", authenticateToken, async (req, res) => {
  const { updates } = req.body; // Array of { assignment_id, clo_id, weight }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of updates) {
        const weight = Number(item.weight ?? 0);
        const assId = Number(item.assignment_id);
        const cloId = Number(item.clo_id);

        // 1. Fetch Assignment & CLO เพื่อเช็คว่ามาจาก Course เดียวกันไหม
        const assignment = await tx.assignment.findUnique({
          where: { id: assId },
          include: {
            semester: { select: { course_id: true } },
          },
        });

        const clo = await tx.clo.findUnique({
          where: { id: cloId },
          select: { course_id: true },
        });

        if (!assignment || !clo) throw new Error("ASSIGNMENT_OR_CLO_NOT_FOUND");

        // 2. Validation: ต้องเป็นวิชาเดียวกัน (แม้จะคนละเทอมแต่ CLO ต้องตรงกับวิชา)
        if (assignment.semester.course_id !== clo.course_id) {
          throw new Error("COURSE_MISMATCH");
        }

        // 3. Save Logic
        if (weight > 0 && weight <= 100) {
          await tx.assignmentCloMapping.upsert({
            where: { assId_cloId: { assId, cloId } },
            update: { weight, updatedAt: new Date() },
            create: { assId, cloId, weight },
          });
        } else {
          await tx.assignmentCloMapping.deleteMany({
            where: { assId, cloId },
          });
        }
      }
    });

    res.json({ success: true, message: "Assignment-CLO Mapping saved" });
  } catch (err: any) {
    console.error(err);
    const status = err.message === "ASSIGNMENT_OR_CLO_NOT_FOUND" ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

// GET /api/mapping/assignment-clo/:sectionId
router.get(
  "/assignment-clo/:semesterId",
  authenticateToken,
  async (req, res) => {
    try {
      const semesterId = parseInt(req.params.semesterId as string); ;

      if (isNaN(semesterId)) {
        return res.status(400).json({ error: "Invalid Semester ID" });
      }

      // 🟢 ใช้ Prisma ดึงข้อมูล Mapping ผ่านความสัมพันธ์ของ Assignment ใน Semester นั้น
      const mappings = await prisma.assignmentCloMapping.findMany({
        where: {
          assignment: {
            semester_id: semesterId, // 👈 กรองเฉพาะงานที่อยู่ในเทอมนี้
          },
        },
        select: {
          assId: true, // 👈 อ้างอิงตามชื่อใน Model (assId)
          cloId: true, // 👈 อ้างอิงตามชื่อใน Model (cloId)
          weight: true,
        },
      });

      // Prisma จะคืนค่า Decimal เป็น Object/String เราสามารถแปลงเป็น Number ได้หากต้องการ
      const formattedMappings = mappings.map((m) => ({
        ...m,
        weight: m.weight ? Number(m.weight) : 0,
      }));

      res.json(formattedMappings);
    } catch (err: any) {
      console.error("Fetch Mapping Error:", err);
      res
        .status(500)
        .json({ error: "Failed to fetch Assignment-CLO mappings" });
    }
  },
);

export default router;
