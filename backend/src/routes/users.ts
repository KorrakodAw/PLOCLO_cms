import { Router } from "express";
import { pool } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateToken, AuthRequest } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) throw new Error("JWT_SECRET not set");

// ===== REGISTER =====
router.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id, username, email, role, created_at",
      [username, email, hashedPassword, role || "student"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ===== LOGIN =====
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid Username" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid Password" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "1hr" }
    );

    // ✅ ส่งทั้ง token และ user ข้อมูลหลัก
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== CURRENT USER (/me) =====
// 🟢 ต้องมาก่อน /:id ไม่งั้นจะ conflict
router.get("/me", authenticateToken, async (req: AuthRequest, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const result = await pool.query(
    "SELECT id, username, email, role, created_at FROM users WHERE id=$1",
    [userId]
  );
  if (result.rows.length === 0)
    return res.status(404).json({ error: "User not found" });

  res.json(result.rows[0]);
});

// ===== USERS CRUD (PROTECTED) =====

// Get all users
router.get("/", authenticateToken, async (_req, res) => {
  const result = await pool.query(
    "SELECT id, username, email, role, created_at FROM users ORDER BY id"
  );
  res.json(result.rows);
});

// PATCH /api/users/:id/role
router.patch("/:id/role", authenticateToken, async (req: AuthRequest, res) => {
  const requester = req.user; // จาก middleware
  const { id } = req.params;
  const { role } = req.body;

  // ตรวจสอบว่า requester เป็น admin
  if (requester?.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: only admin can change roles" });
  }

  try {
    const result = await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role",
      [role, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "Role updated successfully", user: result.rows[0] });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get user by ID
router.get("/:id", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.params.id;
  const result = await pool.query(
    "SELECT id, username, email, role, created_at FROM users WHERE id=$1",
    [userId]
  );
  if (result.rows.length === 0)
    return res.status(404).json({ error: "User not found" });
  res.json(result.rows[0]);
});

// Update user by ID
router.patch("/:id", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.params.id;
  const { username, email, password, role } = req.body;

  const user = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
  if (user.rows.length === 0)
    return res.status(404).json({ error: "User not found" });

  const hashedPassword = password
    ? await bcrypt.hash(password, 10)
    : user.rows[0].password_hash;

  const result = await pool.query(
    "UPDATE users SET username=$1,email=$2,password_hash=$3,role=$4 WHERE id=$5 RETURNING id, username, email, role, created_at",
    [
      username || user.rows[0].username,
      email || user.rows[0].email,
      hashedPassword,
      role || user.rows[0].role,
      userId,
    ]
  );
  res.json(result.rows[0]);
});

// instructor และ admin ใช้ได้
router.get(
  "/users",
  authenticateToken,
  authorizeRoles("admin", "instructor"),
  (req, res) => {
    res.json({ message: "Welcome instructor/admin" });
  }
);

// Delete user
router.delete("/:id", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.params.id;
  const result = await pool.query(
    "DELETE FROM users WHERE id=$1 RETURNING id, username",
    [userId]
  );
  if (result.rows.length === 0)
    return res.status(404).json({ error: "User not found" });
  res.json({ message: `User deleted: ${result.rows[0].username}` });
});

// ===== EDIT USER INFO (email, username, role) =====
router.patch("/:id", authenticateToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { username, email, role } = req.body;
  const requester = req.user;

  try {
    // 🔒 Only admins can change roles
    if (role && requester?.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Forbidden: only admin can change roles" });
    }

    // ✅ Check if user exists
    const existingUser = await pool.query("SELECT * FROM users WHERE id=$1", [
      id,
    ]);
    if (existingUser.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const current = existingUser.rows[0];

    // ✅ Update the provided fields only
    const result = await pool.query(
      `
      UPDATE users
      SET
        username = $1,
        email = $2,
        role = $3
      WHERE id = $4
      RETURNING id, username, email, role, created_at
      `,
      [
        username || current.username,
        email || current.email,
        role || current.role,
        id,
      ]
    );

    res.json({
      message: "User updated successfully",
      user: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
