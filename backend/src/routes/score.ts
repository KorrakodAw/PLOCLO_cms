import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// POST: Batch save/update scores
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { updates } = req.body;

    // 🟢 แก้ไขเงื่อนไข: ตรวจสอบแค่ว่าส่ง updates มาหรือไม่ (แม้จะเป็น Array ว่างก็ยอมรับได้ถ้าต้องการ)
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: "Invalid updates format" });
    }

    const results = await prisma.$transaction(
      updates.map((item) => {
        // 🟢 จัดการค่า score: ถ้าส่งมาเป็นค่าว่าง หรือ null ให้เซตเป็น 0 (หรือตาม Business Logic ของคุณ)
        const scoreValue =
          item.score === null || item.score === undefined || item.score === ""
            ? 0
            : Number(item.score);

        return prisma.studentScore.upsert({
          where: {
            student_id_assignment_id: {
              student_id: Number(item.student_id),
              assignment_id: Number(item.assignment_id),
            },
          },
          update: {
            score: scoreValue,
            updatedAt: new Date(),
          },
          create: {
            student_id: Number(item.student_id),
            assignment_id: Number(item.assignment_id),
            score: scoreValue,
          },
        });
      }),
    );

    res.json({ message: "Scores updated successfully", count: results.length });
  } catch (err: any) {
    console.error("Error saving scores:", err);
    res.status(500).json({ error: "Failed to save scores: " + err.message });
  }
});

// GET: Fetch scores for a specific SECTION
router.get("/", authenticateToken, async (req, res) => {
  try {
    const sectionId = Number(req.query.sectionId);

    if (isNaN(sectionId)) {
      return res.status(400).json({ error: "Invalid or missing sectionId" });
    }

    // 1. Get the Master Course ID for this section
    const sectionInfo = await prisma.courseSection.findUnique({
      where: { id: sectionId },
      select: { course_id: true },
    });

    if (!sectionInfo) {
      return res.status(404).json({ error: "Section not found" });
    }

    // 2. Fetch Scores based on the Relationship logic
    // We want scores where:
    // A. The Assignment belongs to this Master Course
    // B. The Student is enrolled in this specific Section
    const result = await prisma.studentScore.findMany({
      where: {
        assignment: {
          course_id: sectionInfo.course_id,
        },
        student: {
          sections: {
            some: {
              section_id: sectionId,
            },
          },
        },
      },
      // 🟢 Select specific fields to keep the response clean and matching frontend
      select: {
        id: true,
        student_id: true,
        assignment_id: true,
        score: true,
        // Optional: Include student details for display if needed
        student: {
          select: {
            student_code: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { student_id: "asc" },
    });

    res.status(200).json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});



// PATCH: Update a single score
router.patch("/:id", authenticateToken, async (req, res) => {
  const scoreId = Number(req.params.id);
  const { score } = req.body; // Usually we only patch the score value

  if (isNaN(scoreId)) return res.status(400).json({ error: "Invalid ID" });

  try {
    const updatedScore = await prisma.studentScore.update({
      where: { id: scoreId },
      data: {
        score: Number(score),
        updatedAt: new Date(),
      },
    });

    res.json(updatedScore);
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Score not found" });
    }
    console.error("Error updating score:", err);
    res.status(500).json({ error: "Failed to update score" });
  }
});

export default router;
