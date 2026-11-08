import { Router } from "express";
import bcrypt from "bcryptjs";
import { get, run } from "../db.js";
import {
  httpError,
  publicUser,
  requireAuth,
  signToken,
} from "../lib/auth.js";

const router = Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", (req, res) => {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "");

  if (username.length < 2 || username.length > 20) {
    throw httpError(400, "用户名需要 2–20 个字符");
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw httpError(400, "邮箱格式不正确");
  }
  if (password.length < 6) {
    throw httpError(400, "密码至少 6 位");
  }
  if (get("SELECT id FROM users WHERE username = ?", username)) {
    throw httpError(409, "用户名已被占用");
  }
  if (get("SELECT id FROM users WHERE email = ?", email)) {
    throw httpError(409, "邮箱已被注册");
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = run(
    "INSERT INTO users (username, email, password, bio) VALUES (?, ?, ?, ?)",
    username,
    email,
    hash,
    "刚刚来到「毕业之前」。",
  );
  const user = get("SELECT * FROM users WHERE id = ?", Number(result.lastInsertRowid));
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const account = String(req.body.account || req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!account || !password) throw httpError(400, "请输入账号和密码");

  const user = get(
    "SELECT * FROM users WHERE username = ? OR email = ?",
    account,
    account,
  );
  if (!user || !bcrypt.compareSync(password, user.password)) {
    throw httpError(401, "账号或密码不正确");
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
