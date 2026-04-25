import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const { facultyId } = req.query;

    // Build the filter
    const whereClause = facultyId
      ? { faculty_id: parseInt(facultyId as string) }
      : {};

    const instructors = await prisma.instructor.findMany({
      where: whereClause,
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
    const { full_thai_name, full_eng_name, email, phoneNum, faculty_id } =
      req.body;

    if (!full_thai_name || !full_eng_name || !email || !faculty_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newInstructor = await prisma.instructor.create({
      data: {
        full_thai_name,
        full_eng_name,
        email,
        phoneNum,
        faculty_id,
      },
    });

    res.status(201).json(newInstructor);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create instructor" });
  }
});

router.post("/bulk", authenticateToken, async (req, res) => {
  try {
    const { instructors } = req.body;

    if (!Array.isArray(instructors) || instructors.length === 0) {
      return res.status(400).json({ error: "Invalid data format" });
    }

    // 1. Clean ข้อมูลเบื้องต้น (ตัดช่องว่าง + ตัวเล็ก)
    const incomingData = instructors
      .map((inst: any) => ({
        full_thai_name: inst.full_thai_name?.trim(),
        full_eng_name: inst.full_eng_name?.trim(),
        email: inst.email?.trim().toLowerCase(), // บังคับเป็นตัวเล็กเพื่อให้เช็คซ้ำได้แม่นยำ
        phoneNum: inst.phoneNum?.toString() || null,
        faculty_id: Number(inst.faculty_id),
      }))
      .filter((inst) => inst.email); // กรองเอาเฉพาะที่มี Email

    // 2. ดึง List Email ของชุดที่ส่งมา
    const incomingEmails = incomingData.map((i) => i.email);

    // 3. ไปถาม Database ว่า "ในบรรดา Email เหล่านี้ มีอันไหนอยู่ในระบบแล้วบ้าง?"
    const existingInstructors = await prisma.instructor.findMany({
      where: {
        email: { in: incomingEmails },
      },
      select: { email: true },
    });

    const existingEmails = existingInstructors.map((i) => i.email);

    // 4. กรองเอาเฉพาะข้อมูล "ที่ไม่ซ้ำ" กับใน Database
    // และกรองไม่ให้ซ้ำกันเองในไฟล์ Excel เดียวกัน (ใช้ Map ช่วย)
    const uniqueNewDataMap = new Map();

    incomingData.forEach((item) => {
      if (
        !existingEmails.includes(item.email) &&
        !uniqueNewDataMap.has(item.email)
      ) {
        uniqueNewDataMap.set(item.email, item);
      }
    });

    const finalDataToInsert = Array.from(uniqueNewDataMap.values());

    // 5. ถ้ากรองแล้วไม่เหลืออะไรเลย ให้ตอบกลับทันที
    if (finalDataToInsert.length === 0) {
      return res.status(200).json({
        message: "No new unique instructors to add",
        count: 0,
      });
    }

    // 6. บันทึกข้อมูลที่ผ่านการกรองแล้ว
    const result = await prisma.instructor.createMany({
      data: finalDataToInsert,
      // skipDuplicates: true // ไม่ต้องพึ่งตัวนี้แล้วเพราะเรากรองเองแล้ว
    });

    res.status(201).json({ count: result.count });
  } catch (err: any) {
    console.error("Bulk Upload Error:", err);
    res.status(500).json({ error: "Internal server error during upload" });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const instructorId = parseInt(req.params.id as string);
    const { full_thai_name, full_eng_name, email, phoneNum, faculty_id } =
      req.body;

    const updatedInstructor = await prisma.instructor.update({
      where: { id: instructorId },
      data: {
        full_thai_name,
        full_eng_name,
        email,
        phoneNum,
        faculty_id,
      },
    });

    res.json(updatedInstructor);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to update instructor" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const instructorId = parseInt(req.params.id as string);

    await prisma.instructor.delete({
      where: { id: instructorId },
    });

    res.status(204).send();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete instructor" });
  }
});

router.get("/email/:email", authenticateToken, async (req, res) => {
  try {
    // Force email to be a string
    const email = req.params.email as string;

    const instructor = await prisma.instructor.findFirst({
      where: { email }, // Prisma now sees this as a single string
    });

    if (!instructor) {
      return res.status(404).json({ error: "Instructor not found" });
    }

    res.json(instructor);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch instructor by email" });
  }
});

export default router;
