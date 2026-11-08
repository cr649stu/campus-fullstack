import { Router } from "express";
import { all, get } from "../db.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/site", (_req, res) => {
  res.json({
    posts: get("SELECT COUNT(*) AS n FROM posts").n,
    questions: get("SELECT COUNT(*) AS n FROM questions").n,
    answers: get("SELECT COUNT(*) AS n FROM answers").n,
    products: get("SELECT COUNT(*) AS n FROM products").n,
    users: get("SELECT COUNT(*) AS n FROM users").n,
    comments: get("SELECT COUNT(*) AS n FROM comments").n,
    categories: all(
      "SELECT category AS name, COUNT(*) AS count FROM posts GROUP BY category ORDER BY count DESC",
    ),
    tags: all(
      `SELECT json_each.value AS name, COUNT(*) AS count FROM posts, json_each(posts.tags)
        GROUP BY json_each.value ORDER BY count DESC LIMIT 12`,
    ),
  });
});

router.get("/me", requireAuth, (req, res) => {
  const posts = get(
    "SELECT COUNT(*) AS n, COALESCE(SUM(views), 0) AS views, COALESCE(SUM(likes), 0) AS likes FROM posts WHERE author_id = ?",
    req.user.id,
  );
  const answers = get(
    "SELECT COUNT(*) AS n, COALESCE(SUM(votes), 0) AS votes FROM answers WHERE author_id = ?",
    req.user.id,
  );
  const comments = get(
    "SELECT COUNT(*) AS n FROM comments WHERE user_id = ?",
    req.user.id,
  );
  res.json({
    points: req.user.points,
    posts: posts.n,
    views: posts.views,
    likes: posts.likes,
    answers: answers.n,
    answerVotes: answers.votes,
    comments: comments.n,
    recentPosts: all(
      "SELECT id, title, category, created_at, views, likes FROM posts WHERE author_id = ? ORDER BY id DESC LIMIT 5",
      req.user.id,
    ),
  });
});

export default router;
