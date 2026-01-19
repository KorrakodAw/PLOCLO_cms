import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// POST: Batch save/update scores
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { updates } = req.body; // Expects [{ student_id, assignment_id, score }, ...]

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    // Process all upserts in a single transaction
    const results = await prisma.$transaction(
      updates.map((item) => {
        return prisma.studentScore.upsert({
          where: {
            // Unique compound key from your schema
            student_id_assignment_id: {
              student_id: Number(item.student_id),
              assignment_id: Number(item.assignment_id),
            },
          },
          update: {
            score: Number(item.score),
            updatedAt: new Date(),
          },
          create: {
            student_id: Number(item.student_id),
            assignment_id: Number(item.assignment_id),
            score: Number(item.score),
          },
        });
      })
    );

    res.json({ message: "Scores saved successfully", count: results.length });
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

// DELETE: Remove a score
router.delete("/:id", authenticateToken, async (req, res) => {
  const scoreId = Number(req.params.id);

  if (isNaN(scoreId)) return res.status(400).json({ error: "Invalid ID" });

  try {
    await prisma.studentScore.delete({
      where: { id: scoreId },
    });

    res.json({ message: "Score deleted successfully" });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Score not found" });
    }
    console.error("Error deleting score:", err);
    res.status(500).json({ error: "Failed to delete score" });
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
