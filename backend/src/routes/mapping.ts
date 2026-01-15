import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

interface UpdateItem {
  assignment_id: number;
  clo_id: number;
  weight: number | string; // Accepts string in case JSON sends it as "50"
}

// GET /api/mapping/clo-plo/:courseId
router.get("/clo-plo/:courseId", authenticateToken, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    if (isNaN(courseId)) {
      return res.status(400).json({ error: "Invalid Course ID" });
    }

    // Adjust 'clo_plo_mapping' to match your actual table name
    const result = await pool.query(
      `SELECT m.clo_id, m.plo_id, m.weight 
       FROM clo_plo_mapping m
       JOIN clo c ON m.clo_id = c.id
       WHERE c.course_id = $1`,
      [courseId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mappings" });
  }
});

router.post("/clo-plo", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { updates } = req.body; // Array of { clo_id, plo_id, weight }

    await client.query("BEGIN");

    for (const item of updates) {
      if (item.weight > 0) {
        // CASE 1: Value exists -> UPSERT (Insert or Update)
        await client.query(
          `INSERT INTO clo_plo_mapping (clo_id, plo_id, weight)
           VALUES ($1, $2, $3)
           ON CONFLICT (clo_id, plo_id) 
           DO UPDATE SET weight = EXCLUDED.weight, updated_at = NOW()`,
          [item.clo_id, item.plo_id, item.weight]
        );
      } else {
        // CASE 2: Value is 0 -> DELETE the mapping
        // This keeps the database clean (only stores actual connections)
        await client.query(
          `DELETE FROM clo_plo_mapping 
           WHERE clo_id = $1 AND plo_id = $2`,
          [item.clo_id, item.plo_id]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Mapping saved" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to save mapping" });
  } finally {
    client.release();
  }
});

router.post("/assignment-clo", authenticateToken, async (req, res) => {
  const { updates } = req.body; // Array of { assignment_id, clo_id, weight }

  try {
    // TRANSACTION
    await prisma.$transaction(async (tx) => {
      // รับหลายค่าพร้อมกัน
      for (const item of updates) {
        const data = await tx.assignment.findUnique({
          where: { id: item.assignment_id },
          select: {
            courseId: true,
            course: {
              select: {
                clo: {
                  where: { id: item.clo_id },
                  select: { id: true, course_id: true },
                },
              },
            },
          },
        });

        // เช็กว่า clo มีอยู่และ course_id ตรงกัน
        const clo = data?.course?.clo?.[0];
        if (!data || !clo) {
          throw new Error(
            `Data not found for assignment_id ${item.assignment_id} and CLO_id ${item.clo_id}`
          );
        }
        if (data.courseId !== clo.course_id) {
          throw new Error(
            `Assignment_id ${item.assignment_id} and CLO_id ${item.clo_id} is not in the same course`
          );
        }

        // เช็กผลรวม weight ของ assignment นั้น ๆ ไม่ให้เกิน 100
        const assWeight = await tx.assignmentCloMapping.findMany({
          where: {
            assId: item.assignment_id,
          },
          select: { weight: true },
        });
        const totalWeight = assWeight.reduce(
          (acc, curr) => acc + (curr.weight ?? 0),
          0
        );
        if (totalWeight + Number(item.weight) > 100) {
          return res.status(400).json({
            error: "Total weight for one assignments cannot exceed 100",
          });
        }

        // weight เป็น percentage (0-100)
        if (item.weight > 0 && item.weight <= 100) {
          // CASE 1: UPSERT
          await tx.assignmentCloMapping.upsert({
            where: {
              assId_cloId: {
                assId: item.assignment_id,
                cloId: item.clo_id,
              },
            },
            update: {
              weight: item.weight,
              updatedAt: new Date(),
            },
            create: {
              assId: item.assignment_id,
              cloId: item.clo_id,
              weight: item.weight,
              updatedAt: new Date(),
            },
          });
        } else {
          // CASE 2: DELETE
          await tx.assignmentCloMapping.deleteMany({
            where: {
              assId: item.assignment_id,
              cloId: item.clo_id,
            },
          });
        }
      }
    });

    res.json({ success: true, message: "Mapping saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save mapping" });
  }
});

router.get("/assignment-clo/:courseId", authenticateToken, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    if (isNaN(courseId)) {
      return res.status(400).json({ error: "Invalid Course ID" });
    }

    // Adjust 'clo_plo_mapping' to match your actual table name
    const result = await pool.query(
      `SELECT m.assignment_id, m.clo_id, m.weight 
       FROM assignment_clo_mapping m
       JOIN assignment a ON m.assignment_id = a.id
       JOIN clo c ON m.clo_id = c.id
       WHERE c.course_id = $1`,
      [courseId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mappings" });
  }
});

export default router;
