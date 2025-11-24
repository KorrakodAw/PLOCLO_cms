import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// GET all clo for dropdowns
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name FROM clo ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Unable to retrieve clo information" });
  }
});



export default router;
