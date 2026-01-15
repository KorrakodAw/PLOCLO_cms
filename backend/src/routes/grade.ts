import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// GET /api/grade/settings/:courseId
// ✅ Fix: Add ":courseId" to the route path
router.get("/settings/:courseId", authenticateToken, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    // Safety check: ensure ID is a valid number
    if (isNaN(courseId)) {
      return res.status(400).json({ error: "Invalid Course ID" });
    }

    const settings = await prisma.gradeSetting.findMany({
      where: { course_id: courseId },
      orderBy: { score: "desc" }, // Optional: Sort grades high to low
    });

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch grade settings" });
  }
});

router.post("/settings/add", authenticateToken, async (req, res) => {
  try {
    const { courseId, settings } = req.body;

    // 1. Validation
    if (!courseId || !Array.isArray(settings)) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    // 2. TRANSACTION: Delete old settings, then insert the new list
    // We use $transaction to ensure both happen or neither happens
    await prisma.$transaction([
      // A. Delete existing settings for this course to prevent duplicates
      prisma.gradeSetting.deleteMany({
        where: { course_id: courseId },
      }),

      // B. Insert the fresh list of settings
      prisma.gradeSetting.createMany({
        data: settings.map((item) => ({
          course_id: courseId,
          grade: item.grade,
          score: item.score, // Ensure frontend sends 'score' as Int
        })),
      }),
    ]);

    // 3. Return success
    // Note: createMany returns a count, not the created objects
    res.json({
      message: "Grade settings updated successfully",
    });
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ error: "Failed to update grade settings" });
  }
});

export default router;
