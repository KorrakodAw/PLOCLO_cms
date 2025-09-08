// server.ts (หรือ index.ts ของ express)
import express from "express";
import morgan from "morgan";
import cors from "cors";
import usersRouter from "./routes/users";

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

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(5000, () => console.log("API on http://localhost:5000"));
