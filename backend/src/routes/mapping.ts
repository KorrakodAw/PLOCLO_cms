import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";
import { pool } from "../db";

const prisma = new PrismaClient();
const router = Router();

// router.post("/clo-plo", authenticateToken, async (req, res) => {
//   // 🟢 รับ 'updates' ซึ่งเป็น Array จาก req.body
//   const { updates } = req.body;

//   if (!Array.isArray(updates)) {
//     return res
//       .status(400)
//       .json({ error: "Invalid updates format. Expected an array." });
//   }

//   try {
//     // ใช้ Transaction เพื่อให้มั่นใจว่าข้อมูลจะถูกบันทึกสำเร็จทั้งหมดหรือล้มเหลวทั้งหมด
//     await prisma.$transaction(
//       updates.map((item) => {
//         const cloId = Number(item.clo_id);
//         const ploId = Number(item.plo_id);
//         const weight = Number(item.weight);

//         if (weight > 0 && weight <= 100) {
//           return prisma.cloPloMapping.upsert({
//             where: {
//               cloId_ploId: { cloId, ploId },
//             },
//             update: { weight, updatedAt: new Date() },
//             create: { cloId, ploId, weight },
//           });
//         } else {
//           // ถ้า weight เป็น 0 หรือติดลบ ให้ทำการลบ Mapping นั้นทิ้ง
//           return prisma.cloPloMapping.deleteMany({
//             where: { cloId, ploId },
//           });
//         }
//       }),
//     );

//     res.json({
//       success: true,
//       message: "All CLO-PLO Mappings saved successfully",
//     });
//   } catch (err) {
//     console.error("Bulk Save Error:", err);
//     res.status(500).json({ error: "Failed to save mappings" });
//   }
// });

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

        /*
        // 2. Validation: ต้องเป็นวิชาเดียวกัน (แม้จะคนละเทอมแต่ CLO ต้องตรงกับวิชา)
        if (assignment.semester.course_semester_id !== clo.course_semester_id) {
          throw new Error("COURSE_MISMATCH");
        }
        */

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
  "/clo-plo/:courseId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId as string);
      const { semesterId, programId } = req.query; // รับ "8,7"

      if (isNaN(courseId)) {
        return res
          .status(400)
          .json({ error: "Course ID are required" });
      }

      // 🟢 แปลง "8,7" เป็น [8, 7]
      const idArray = String(programId)
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));

      const mappings = await prisma.cloPloMapping.findMany({
        where: {
          semester_id: Number(semesterId),
          program_id: { in: idArray }, // 🟢 ดึง Mapping ของทุกหลักสูตรในคราวเดียว
          clos: { course_id: courseId },
        },
        select: {
          cloId: true,
          ploId: true,
          program_id: true, // เพิ่มเพื่อให้ Frontend แยกได้ว่าอันไหนของใคร
          weight: true,
        },
      });

      res.json(
        mappings.map((m) => ({
          clo_id: m.cloId,
          plo_id: m.ploId,
          program_id: m.program_id,
          weight: Number(m.weight),
        })),
      );
    } catch (err) {
      console.error("Fetch CLO-PLO Error:", err);
      res.status(500).json({ error: "Failed to fetch mappings" });
    }
  },
);

router.post(
  "/clo-plo",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { updates } = req.body;
    try {
      await prisma.$transaction(
        updates.map((item: any) => {
          const { clo_id, plo_id, program_id, semester_id, weight } = item;
          const whereClause = {
            cloId_ploId_program_id_semester_id: {
              // ⚠️ ชื่อนี้ต้องตรงตามที่ Prisma generate
              cloId: Number(clo_id),
              ploId: Number(plo_id),
              program_id: Number(program_id),
              semester_id: Number(semester_id),
            },
          };

          if (weight > 0) {
            return prisma.cloPloMapping.upsert({
              where: whereClause,
              update: { weight, updatedAt: new Date() },
              create: {
                cloId: Number(clo_id),
                ploId: Number(plo_id),
                program_id: Number(program_id),
                semester_id: Number(semester_id),
                weight,
              },
            });
          } else {
            return prisma.cloPloMapping.deleteMany({ where: item });
          }
        }),
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Save failed" });
    }
  },
);

/**
 * 2. Assignment to CLO Mapping
 */
router.post(
  "/assignment-clo",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { updates } = req.body;
    if (!Array.isArray(updates))
      return res.status(400).json({ error: "Invalid data" });

    try {
      await prisma.$transaction(
        updates.map((item) => {
          const weight = Number(item.weight ?? 0);
          const assId = Number(item.assignment_id);
          const cloId = Number(item.clo_id);

          if (weight > 0 && weight <= 100) {
            return prisma.assignmentCloMapping.upsert({
              where: { assId_cloId: { assId, cloId } },
              update: { weight, updatedAt: new Date() },
              create: { assId, cloId, weight },
            });
          } else {
            return prisma.assignmentCloMapping.deleteMany({
              where: { assId, cloId },
            });
          }
        }),
      );

      res.json({ success: true, message: "Assignment-CLO Mapping saved" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save Assignment-CLO" });
    }
  },
);

router.get(
  "/assignment-clo/:semesterId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const semesterId = parseInt(req.params.semesterId as string);
      if (isNaN(semesterId))
        return res.status(400).json({ error: "Invalid Semester ID" });

      const mappings = await prisma.assignmentCloMapping.findMany({
        where: { assignment: { semester_id: semesterId } },
        select: { assId: true, cloId: true, weight: true },
      });

      res.json(mappings.map((m) => ({ ...m, weight: Number(m.weight) })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch Assignment-CLO" });
    }
  },
);

export default router;
