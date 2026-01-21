import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const instructors = await prisma.instructor.findMany({
      orderBy: { id: "desc" },
    });
    res.json(instructors);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch instructors" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, email, faculty_id } = req.body;

    if (!first_name || !last_name || !email || !faculty_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newInstructor = await prisma.instructor.create({
      data: {
        first_name,
        last_name,
        email,
        faculty_id
      },
    });

    res.status(201).json(newInstructor);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create instructor" });
  }
});

export default router;
