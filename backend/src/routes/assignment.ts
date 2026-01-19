import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// 1. GET: Fetch assignments (Filter by COURSE ID, not Section)
router.get("/", authenticateToken, async (req, res) => {
  try {
    // Assignments are now defined at the Course level, so we filter by courseId
    const courseId = req.query.courseId
      ? Number(req.query.courseId)
      : undefined;

    if (!courseId) {
      return res
        .status(400)
        .json({ error: "courseId query parameter is required" });
    }

    const assignments = await prisma.assignment.findMany({
      where: { course_id: courseId },
      orderBy: { createdAt: "asc" },
    });

    res.json(assignments);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// 2. POST: Create a new assignment
router.post("/", authenticateToken, async (req, res) => {
  try {
    // Note: 'course_id' replaces 'section_id'
    const { course_id, name, description, category, maxScore, weight } =
      req.body;

    // Validation
    if (!course_id || !name) {
      return res.status(400).json({ error: "course_id and name are required" });
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        course_id: Number(course_id),
        name,
        description: description || "",
        category: category || "assignment",
        maxScore: Number(maxScore ?? 100),
        weight: Number(weight ?? 0),
        createdAt: new Date(),
      },
    });

    res.status(201).json(newAssignment);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// 3. DELETE: Remove an assignment
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);

    await prisma.assignment.delete({
      where: { id: assignmentId },
    });

    res.json({ message: "Assignment deleted successfully" });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

// 4. PATCH: Update an assignment
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const { name, description, maxScore, weight, category } = req.body;

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        name,
        description,
        maxScore: maxScore !== undefined ? Number(maxScore) : undefined,
        weight: weight !== undefined ? Number(weight) : undefined,
        category,
      },
    });

    res.json(updatedAssignment);
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

export default router;
