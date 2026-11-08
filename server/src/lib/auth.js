import jwt from "jsonwebtoken";
import { jwtSecret } from "../config.js";
import { get } from "../db.js";

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatar: row.avatar,
    bio: row.bio,
    points: row.points,
    created_at: row.created_at,
  };
}

export function signToken(user) {
  return jwt.sign({ id: user.id }, jwtSecret, { expiresIn: "7d" });
}

function userFromRequest(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret);
    return get("SELECT * FROM users WHERE id = ?", payload.id) || null;
  } catch {
    return null;
  }
}

export function optionalAuth(req, _res, next) {
  req.user = userFromRequest(req);
  next();
}

export function requireAuth(req, _res, next) {
  req.user = userFromRequest(req);
  if (!req.user) return next(httpError(401, "请先登录"));
  next();
}
