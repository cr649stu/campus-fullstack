import { Router } from "express";
import { all, get, run } from "../db.js";
import { httpError, requireAuth } from "../lib/auth.js";

const router = Router();

router.delete("/:id", requireAuth, (req, res) => {
  const comment = get("SELECT * FROM comments WHERE id = ?", Number(req.params.id));
  if (!comment) throw httpError(404, "评论不存在");
  const post = get("SELECT * FROM posts WHERE id = ?", comment.post_id);
  if (comment.user_id !== req.user.id && post?.author_id !== req.user.id) {
    throw httpError(403, "只能删除自己的评论");
  }
  run("DELETE FROM comments WHERE id = ?", comment.id);
  res.json({ ok: true });
});

export default router;
