// server.ts (หรือ index.ts ของ express)
import express from "express";
import morgan from "morgan";
import cors from "cors";
import usersRouter from "./routes/users";
import programRoutes from "./routes/program";
import facultyRoutes from "./routes/faculty";
import ploRoutes from "./routes/plo";
import courseRoutes from "./routes/course";

const app = express();
app.use(morgan("dev"));
app.use(express.json());

// ✅ อนุญาต CORS จาก frontend
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use("/api/users", usersRouter);
app.use("/api/program", programRoutes);
app.use("/api/faculty", facultyRoutes); // เพิ่ม route สำหรับดึงข้อมูลคณะ
app.use("/api/plo", ploRoutes); // เพิ่ม route สำหรับ PLO
app.use("/api/course", courseRoutes); // เพิ่ม route สำหรับ Course
app.listen(5000, () => console.log("API on http://localhost:5000"));
