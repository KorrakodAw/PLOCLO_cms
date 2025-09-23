import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// ✅ GET all programs
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT program_code, program_name_en, program_name_th, program_shortname_en, program_shortname_th, program_year FROM program ORDER BY program_year DESC"
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
