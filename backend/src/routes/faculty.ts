import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// ดึงข้อมูลคณะทั้งหมด (faculty) สำหรับ dropdown
// ใช้ในหน้าเพิ่ม/แก้ไขโปรแกรมหรือคอร์ส
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name FROM faculty ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Unable to retrieve faculty information" });
  }
});

export default router;
