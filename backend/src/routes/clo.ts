import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
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


// //GET all clo
// router.get("/", authenticateToken, async (req, res) =>{
//   try{
//   const getAllclo = await prisma.clo.findMany()
//   res.json(clo)
//   }catch(err: any) {
//     console.error(err);
//     res.status(500).json({ error: "Unable to retrieve clo information" });
//   }
// })

// // POST clo
// router.post("/", async (request: Request) => {
//   cost {} = await request.json()     // wait data
//   const newClo = await prisma.clo.create({
//   data:{

//   }
//   })
//   return Response.json(newClo) 
// })

//export default prisma;
export default router;
