// ไฟล์กับ database นี้ เอาไว้ test api/calculation

import { Router } from "express";
//import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.post("/", authenticateToken, async (req, res) => {
  try {
    // 1. Receive the array 'updates' from the frontend
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    // 2. Process all updates in a transaction
    const results = await prisma.$transaction(
      updates.map((item) => {
        return prisma.studentScore.upsert({
          // Check for existing score using the unique compound key
          where: {
            student_id_assignment_id: {
              // Ensure this unique constraint exists in schema.prisma!
              student_id: item.student_id,
              assignment_id: item.assignment_id,
            },
          },
          // If it exists, update the score
          update: {
            score: Number(item.score),
          },
          // If it doesn't exist, create it
          create: {
            student_id: item.student_id,
            course_id: item.course_id, // Ensure frontend sends this or you fetch it
            assignment_id: item.assignment_id,
            score: Number(item.score),
          },
        });
      })
    );

    res.json({ message: "Scores saved successfully", count: results.length });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to save scores: " + err.message });
  }
});

router.get("/", authenticateToken, async (req, res) => {
  try {
    const courseId = req.query.courseId;
    const result = await prisma.studentScore.findMany({
      where: {
        course_id: Number(courseId),
      },
      orderBy: { id: "asc" },
    });

    res.status(200).json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const scoreId = req.params.id;

  try {
    const deletedScore = await prisma.studentScore.delete({
      where: { id: Number(scoreId) }, // แปลงเป็น number ถ้า id เป็น Int
    });

    if (!deletedScore) {
      return res.status(404).json({ error: "Score not found" });
    }

    res.json({ message: "Score deleted successfully" });
  } catch (err: any) {
    // Prisma จะ throw error ถ้าไม่เจอ record
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Score not found" });
    }

    console.error("Error deleting score:", err);
    res.status(500).json({ error: "Failed to delete score" });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  const scoreId = req.params.id;
  const { student_id, course_id, assignment_id, score } = req.body;

  try {
    const updatedScore = await prisma.studentScore.update({
      where: { id: Number(scoreId) }, // ถ้า id เป็น Int
      data: {
        student_id,
        course_id,
        assignment_id,
        score: Number(score),
      },
    });

    res.json(updatedScore);
  } catch (err: any) {
    // Prisma จะ throw error P2025 ถ้าไม่เจอ record
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Score not found" });
    }

    console.error("Error updating score:", err);
    res.status(500).json({ error: "Failed to update score" });
  }
});

export default router;
