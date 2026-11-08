import { Router } from "express";
import { all, get, run, transaction } from "../db.js";
import { httpError, optionalAuth, requireAuth, publicUser } from "../lib/auth.js";

const router = Router();

const CATEGORY_COLORS = {};
const DEFAULT_COVER = "/static/covers/campus.jpg";

function mapPost(row, liked = false) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    cover: row.cover,
    category: row.category,
    tags: JSON.parse(row.tags || "[]"),
    author: {
      id: row.author_id,
      username: row.author_name,
      avatar: row.author_avatar,
      bio: row.author_bio,
    },
    views: row.views,
    likes: row.likes,
    comments: row.comment_count ?? 0,
    liked,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function makeExcerpt(content) {
  return String(content)
    .replace(/[#>*`\-\[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

function findPost(id) {
  return get(
    `SELECT p.*, u.username AS author_name, u.avatar AS author_avatar, u.bio AS author_bio,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
       FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.id = ?`,
    id,
  );
}

router.get("/", optionalAuth, (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(24, Math.max(1, Number(req.query.pageSize) || 9));
  const category = String(req.query.category || "").trim();
  const tag = String(req.query.tag || "").trim();
  const keyword = String(req.query.keyword || "").trim();
  const sort = req.query.sort === "hot" ? "hot" : "latest";

  const where = [];
  const params = [];
  if (category) {
    where.push("p.category = ?");
    params.push(category);
  }
  if (tag) {
    where.push("EXISTS (SELECT 1 FROM json_each(p.tags) WHERE json_each.value = ?)");
    params.push(tag);
  }
  if (keyword) {
    where.push("(p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)");
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = get(`SELECT COUNT(*) AS n FROM posts p ${whereSql}`, ...params).n;
  const orderBy =
    sort === "hot"
      ? "p.likes DESC, p.views DESC, p.id DESC"
      : "p.created_at DESC, p.id DESC";

  const rows = all(
    `SELECT p.*, u.username AS author_name, u.avatar AS author_avatar, u.bio AS author_bio,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
       FROM posts p JOIN users u ON u.id = p.author_id
       ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    (page - 1) * pageSize,
  );

  let likedIds = new Set();
  if (req.user) {
    likedIds = new Set(
      all(
        "SELECT target_id FROM likes WHERE user_id = ? AND target_type = 'post'",
        req.user.id,
      ).map((row) => row.target_id),
    );
  }

  res.json({
    items: rows.map((row) => mapPost(row, likedIds.has(row.id))),
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

router.get("/meta/categories", (_req, res) => {
  res.json(
    all(
      `SELECT category AS name, COUNT(*) AS count
         FROM posts GROUP BY category ORDER BY count DESC, category ASC`,
    ),
  );
});

router.get("/meta/tags", (_req, res) => {
  const rows = all(
    `SELECT json_each.value AS name, COUNT(*) AS count
       FROM posts, json_each(posts.tags)
      GROUP BY json_each.value ORDER BY count DESC, name ASC LIMIT 30`,
  );
  res.json(rows);
});

router.get("/:id", optionalAuth, (req, res) => {
  const post = findPost(Number(req.params.id));
  if (!post) throw httpError(404, "文章不存在");

  run("UPDATE posts SET views = views + 1 WHERE id = ?", post.id);
  post.views += 1;

  const liked = req.user
    ? Boolean(
        get(
          "SELECT id FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?",
          req.user.id,
          post.id,
        ),
      )
    : false;

  res.json({ post: mapPost(post, liked), categoryColors: CATEGORY_COLORS });
});

router.post("/", requireAuth, (req, res) => {
  const title = String(req.body.title || "").trim();
  const content = String(req.body.content || "").trim();
  const category = String(req.body.category || "").trim();
  const cover = String(req.body.cover || DEFAULT_COVER);
  const excerpt = String(req.body.excerpt || "").trim() || makeExcerpt(content);
  const tags = Array.isArray(req.body.tags)
    ? req.body.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 5)
    : String(req.body.tags || "")
        .split(/[,，\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 5);

  if (title.length < 4) throw httpError(400, "标题至少 4 个字");
  if (content.length < 20) throw httpError(400, "正文至少 20 个字");
  if (!category) throw httpError(400, "请选择一个分类");

  const result = run(
    `INSERT INTO posts (title, excerpt, content, cover, category, tags, author_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    title,
    excerpt,
    content,
    cover,
    category,
    JSON.stringify(tags),
    req.user.id,
  );
  res.status(201).json({ post: mapPost(findPost(Number(result.lastInsertRowid))) });
});

router.put("/:id", requireAuth, (req, res) => {
  const post = get("SELECT * FROM posts WHERE id = ?", Number(req.params.id));
  if (!post) throw httpError(404, "文章不存在");
  if (post.author_id !== req.user.id) throw httpError(403, "只能编辑自己的文章");

  const title = String(req.body.title ?? post.title).trim();
  const content = String(req.body.content ?? post.content).trim();
  const category = String(req.body.category ?? post.category).trim();
  const cover = String(req.body.cover ?? post.cover);
  const excerpt = String(req.body.excerpt ?? "").trim() || makeExcerpt(content);
  const tags = Array.isArray(req.body.tags)
    ? req.body.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 5)
    : JSON.parse(post.tags);

  if (title.length < 4) throw httpError(400, "标题至少 4 个字");
  if (content.length < 20) throw httpError(400, "正文至少 20 个字");

  run(
    `UPDATE posts SET title = ?, content = ?, excerpt = ?, category = ?, cover = ?, tags = ?,
            updated_at = datetime('now', 'localtime')
      WHERE id = ?`,
    title,
    content,
    excerpt,
    category,
    cover,
    JSON.stringify(tags),
    post.id,
  );
  res.json({ post: mapPost(findPost(post.id)) });
});

router.delete("/:id", requireAuth, (req, res) => {
  const post = get("SELECT * FROM posts WHERE id = ?", Number(req.params.id));
  if (!post) throw httpError(404, "文章不存在");
  if (post.author_id !== req.user.id) throw httpError(403, "只能删除自己的文章");
  run("DELETE FROM posts WHERE id = ?", post.id);
  res.json({ ok: true });
});

router.post("/:id/like", requireAuth, (req, res) => {
  const post = get("SELECT * FROM posts WHERE id = ?", Number(req.params.id));
  if (!post) throw httpError(404, "文章不存在");

  const result = transaction(() => {
    const existing = get(
      "SELECT id FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?",
      req.user.id,
      post.id,
    );
    if (existing) {
      run("DELETE FROM likes WHERE id = ?", existing.id);
      run("UPDATE posts SET likes = MAX(likes - 1, 0) WHERE id = ?", post.id);
      return false;
    }
    run(
      "INSERT INTO likes (user_id, target_type, target_id) VALUES (?, 'post', ?)",
      req.user.id,
      post.id,
    );
    run("UPDATE posts SET likes = likes + 1 WHERE id = ?", post.id);
    return true;
  });

  const updated = get("SELECT likes FROM posts WHERE id = ?", post.id);
  res.json({ liked: result, likes: updated.likes });
});

router.get("/:id/comments", (req, res) => {
  const rows = all(
    `SELECT c.*, u.username, u.avatar
       FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.post_id = ? ORDER BY c.created_at ASC`,
    Number(req.params.id),
  );
  res.json(
    rows.map((row) => ({
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      user: { id: row.user_id, username: row.username, avatar: row.avatar },
    })),
  );
});

router.post("/:id/comments", requireAuth, (req, res) => {
  const post = get("SELECT id FROM posts WHERE id = ?", Number(req.params.id));
  if (!post) throw httpError(404, "文章不存在");
  const content = String(req.body.content || "").trim();
  if (content.length < 2) throw httpError(400, "评论至少 2 个字");
  if (content.length > 500) throw httpError(400, "评论最多 500 个字");

  const result = run(
    "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)",
    post.id,
    req.user.id,
    content,
  );
  const row = get(
    `SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
    Number(result.lastInsertRowid),
  );
  res.status(201).json({
    id: row.id,
    content: row.content,
    created_at: row.created_at,
    user: publicUser(req.user),
  });
});

export default router;
