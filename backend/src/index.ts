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
app.use("/api/faculty", facultyRoutes);
app.use("/api/plo", ploRoutes); 
app.use("/api/course", courseRoutes);
app.use("/api/university", univisityRoutes);
app.use("/api/clo", cloRoutes);

app.listen(3001, () => console.log("API on http://localhost:3001"));
