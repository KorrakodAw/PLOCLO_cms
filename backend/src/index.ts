// server.ts (หรือ index.ts ของ express)
import express from "express";
import morgan from "morgan";
import cors from "cors";
import usersRouter from "./routes/users";
import programRoutes from "./routes/program";
import facultyRoutes from "./routes/faculty";
import ploRoutes from "./routes/plo";
import courseRoutes from "./routes/course";
import univisityRoutes from "./routes/university";
import cloRoutes from "./routes/clo";
import studentRoutes from "./routes/student";
import { seedAdminUser } from "./routes/seed";
import mappingRoutes from "./routes/mapping";
import assignmentRoutes from "./routes/assignment";
import studentOnCoureseRoutes from "./routes/studentOnCourse";

const app = express();
app.use(morgan("dev"));
app.use(express.json());

// ✅ อนุญาต CORS จาก frontend
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use("/api/users", usersRouter);
app.use("/api/program", programRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/plo", ploRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/university", univisityRoutes);
app.use("/api/clo", cloRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/mapping", mappingRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/studentOnCourse", studentOnCoureseRoutes);

app.listen(3001, async () => {
  await seedAdminUser();
  console.log("API on " + process.env.NEXT_PUBLIC_API_URL);
});
