import { Router } from "express";
import { all, get, run, transaction } from "../db.js";
import { httpError, optionalAuth, requireAuth } from "../lib/auth.js";

const router = Router();

function mapQuestion(row, liked = false) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags || "[]"),
    author: {
      id: row.author_id,
      username: row.author_name,
      avatar: row.author_avatar,
    },
    views: row.views,
    votes: row.votes,
    answers_count: row.answers_count,
    liked,
    is_solved: Boolean(row.is_solved),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function findQuestion(id) {
  return get(
    `SELECT q.*, u.username AS author_name, u.avatar AS author_avatar
       FROM questions q JOIN users u ON u.id = q.author_id
      WHERE q.id = ?`,
    id,
  );
}

function likedSet(userId, type, ids) {
  if (!userId || ids.length === 0) return new Set();
  const placeholders = ids.map(() => "?").join(",");
  return new Set(
    all(
      `SELECT target_id FROM likes WHERE user_id = ? AND target_type = ? AND target_id IN (${placeholders})`,
      userId,
      type,
      ...ids,
    ).map((row) => row.target_id),
  );
}

router.get("/", optionalAuth, (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(30, Math.max(1, Number(req.query.pageSize) || 8));
  const tag = String(req.query.tag || "").trim();
  const sort = ["hot", "unsolved", "latest"].includes(req.query.sort)
    ? req.query.sort
    : "latest";

  const where = [];
  const params = [];
  if (tag) {
    where.push("EXISTS (SELECT 1 FROM json_each(q.tags) WHERE json_each.value = ?)");
    params.push(tag);
  }
  if (sort === "unsolved") where.push("q.is_solved = 0");
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderBy =
    sort === "hot"
      ? "q.votes DESC, q.answers_count DESC, q.id DESC"
      : "q.created_at DESC, q.id DESC";

  const total = get(`SELECT COUNT(*) AS n FROM questions q ${whereSql}`, ...params).n;
  const rows = all(
    `SELECT q.*, u.username AS author_name, u.avatar AS author_avatar
       FROM questions q JOIN users u ON u.id = q.author_id
       ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    (page - 1) * pageSize,
  );

  const liked = likedSet(
    req.user?.id,
    "question",
    rows.map((row) => row.id),
  );

  res.json({
    items: rows.map((row) => mapQuestion(row, liked.has(row.id))),
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

router.get("/meta/tags", (_req, res) => {
  res.json(
    all(
      `SELECT json_each.value AS name, COUNT(*) AS count
         FROM questions, json_each(questions.tags)
        GROUP BY json_each.value ORDER BY count DESC, name ASC LIMIT 20`,
    ),
  );
});

router.get("/:id", optionalAuth, (req, res) => {
  const question = findQuestion(Number(req.params.id));
  if (!question) throw httpError(404, "问题不存在");
  run("UPDATE questions SET views = views + 1 WHERE id = ?", question.id);
  question.views += 1;

  const answerRows = all(
    `SELECT a.*, u.username AS author_name, u.avatar AS author_avatar
       FROM answers a JOIN users u ON u.id = a.author_id
      WHERE a.question_id = ?
      ORDER BY a.is_accepted DESC, a.votes DESC, a.id ASC`,
    question.id,
  );

  const answerLiked = likedSet(
    req.user?.id,
    "answer",
    answerRows.map((row) => row.id),
  );

  res.json({
    question: mapQuestion(
      question,
      req.user
        ? Boolean(
            get(
              "SELECT id FROM likes WHERE user_id = ? AND target_type = 'question' AND target_id = ?",
              req.user.id,
              question.id,
            ),
          )
        : false,
    ),
    answers: answerRows.map((row) => ({
      id: row.id,
      content: row.content,
      votes: row.votes,
      is_accepted: Boolean(row.is_accepted),
      liked: answerLiked.has(row.id),
      created_at: row.created_at,
      author: {
        id: row.author_id,
        username: row.author_name,
        avatar: row.author_avatar,
      },
    })),
  });
});

router.post("/", requireAuth, (req, res) => {
  const title = String(req.body.title || "").trim();
  const content = String(req.body.content || "").trim();
  const tags = Array.isArray(req.body.tags)
    ? req.body.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 4)
    : String(req.body.tags || "")
        .split(/[,，\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 4);

  if (title.length < 6) throw httpError(400, "问题标题至少 6 个字");
  if (content.length < 10) throw httpError(400, "问题描述至少 10 个字");
  if (tags.length === 0) throw httpError(400, "请至少添加一个标签");

  const id = transaction(() => {
    if (req.user.points < 5) throw httpError(400, "积分不足，提问需要 5 积分");
    run("UPDATE users SET points = points - 5 WHERE id = ?", req.user.id);
    const result = run(
      "INSERT INTO questions (title, content, tags, author_id) VALUES (?, ?, ?, ?)",
      title,
      content,
      JSON.stringify(tags),
      req.user.id,
    );
    return Number(result.lastInsertRowid);
  });

  res.status(201).json({ question: mapQuestion(findQuestion(id)) });
});

router.post("/:id/answers", requireAuth, (req, res) => {
  const question = get("SELECT * FROM questions WHERE id = ?", Number(req.params.id));
  if (!question) throw httpError(404, "问题不存在");
  const content = String(req.body.content || "").trim();
  if (content.length < 10) throw httpError(400, "回答至少 10 个字");

  const answerId = transaction(() => {
    const result = run(
      "INSERT INTO answers (question_id, content, author_id) VALUES (?, ?, ?)",
      question.id,
      content,
      req.user.id,
    );
    run("UPDATE questions SET answers_count = answers_count + 1, updated_at = datetime('now', 'localtime') WHERE id = ?", question.id);
    run("UPDATE users SET points = points + 10 WHERE id = ?", req.user.id);
    return Number(result.lastInsertRowid);
  });

  const row = get("SELECT * FROM answers WHERE id = ?", answerId);
  res.status(201).json({
    answer: {
      id: row.id,
      content: row.content,
      votes: row.votes,
      is_accepted: false,
      liked: false,
      created_at: row.created_at,
      author: { id: req.user.id, username: req.user.username, avatar: req.user.avatar },
    },
  });
});

router.post("/answers/:id/accept", requireAuth, (req, res) => {
  const answer = get("SELECT * FROM answers WHERE id = ?", Number(req.params.id));
  if (!answer) throw httpError(404, "回答不存在");
  const question = get("SELECT * FROM questions WHERE id = ?", answer.question_id);
  if (question.author_id !== req.user.id) throw httpError(403, "只有提问者可以采纳答案");
  if (question.is_solved) throw httpError(400, "这个问题已经采纳过答案了");

  transaction(() => {
    run("UPDATE answers SET is_accepted = 1 WHERE id = ?", answer.id);
    run("UPDATE questions SET is_solved = 1, updated_at = datetime('now', 'localtime') WHERE id = ?", question.id);
    run("UPDATE users SET points = points + 30 WHERE id = ?", answer.author_id);
  });

  res.json({ ok: true, answerId: answer.id });
});

router.post("/:id/vote", requireAuth, (req, res) => {
  const question = get("SELECT * FROM questions WHERE id = ?", Number(req.params.id));
  if (!question) throw httpError(404, "问题不存在");

  const result = transaction(() => {
    const existing = get(
      "SELECT id FROM likes WHERE user_id = ? AND target_type = 'question' AND target_id = ?",
      req.user.id,
      question.id,
    );
    if (existing) {
      run("DELETE FROM likes WHERE id = ?", existing.id);
      run("UPDATE questions SET votes = MAX(votes - 1, 0) WHERE id = ?", question.id);
      return false;
    }
    run(
      "INSERT INTO likes (user_id, target_type, target_id) VALUES (?, 'question', ?)",
      req.user.id,
      question.id,
    );
    run("UPDATE questions SET votes = votes + 1 WHERE id = ?", question.id);
    if (question.author_id !== req.user.id) {
      run("UPDATE users SET points = points + 5 WHERE id = ?", question.author_id);
    }
    return true;
  });

  res.json({ liked: result, votes: get("SELECT votes FROM questions WHERE id = ?", question.id).votes });
});

router.post("/answers/:id/vote", requireAuth, (req, res) => {
  const answer = get("SELECT * FROM answers WHERE id = ?", Number(req.params.id));
  if (!answer) throw httpError(404, "回答不存在");

  const result = transaction(() => {
    const existing = get(
      "SELECT id FROM likes WHERE user_id = ? AND target_type = 'answer' AND target_id = ?",
      req.user.id,
      answer.id,
    );
    if (existing) {
      run("DELETE FROM likes WHERE id = ?", existing.id);
      run("UPDATE answers SET votes = MAX(votes - 1, 0) WHERE id = ?", answer.id);
      return false;
    }
    run(
      "INSERT INTO likes (user_id, target_type, target_id) VALUES (?, 'answer', ?)",
      req.user.id,
      answer.id,
    );
    run("UPDATE answers SET votes = votes + 1 WHERE id = ?", answer.id);
    if (answer.author_id !== req.user.id) {
      run("UPDATE users SET points = points + 10 WHERE id = ?", answer.author_id);
    }
    return true;
  });

  res.json({ liked: result, votes: get("SELECT votes FROM answers WHERE id = ?", answer.id).votes });
});

export default router;
