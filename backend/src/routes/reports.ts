import { Router } from "express";
import {
  getSectionGradeSummary,
  getIndividualStudentSummary,
  getGradeSummary,
} from "../controllers/reportControllers";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// ลบการใช้ Prisma.$transaction ในนี้ออก เพราะ Controller จะจัดการส่ง Response เอง
router.get("/summary", getSectionGradeSummary);
router.get("/individual", getIndividualStudentSummary);
router.get("/gradeSummary", getGradeSummary);

export default router;
