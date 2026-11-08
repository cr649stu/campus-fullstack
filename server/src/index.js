import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import { port, publicDir, webDist } from "./config.js";
import { seedIfEmpty } from "./seed.js";
import authRouter from "./routes/auth.js";
import postsRouter from "./routes/posts.js";
import questionsRouter from "./routes/questions.js";
import shopRouter from "./routes/shop.js";
import commentsRouter from "./routes/comments.js";
import statsRouter from "./routes/stats.js";

const seeded = seedIfEmpty();
if (seeded) console.log("[seed] 已写入示例数据（演示账号：linyi@campus.cn / 123456）");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/posts", postsRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/stats", statsRouter);
app.use("/api", shopRouter);

app.use(
  "/static",
  express.static(publicDir, {
    maxAge: "7d",
    setHeaders(res, filePath) {
      if (filePath.endsWith(".jpg")) res.setHeader("Cache-Control", "public, max-age=604800");
    },
  }),
);

if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: "接口不存在" });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: error.message || "服务器开小差了" });
});

const host = process.env.HOST || "127.0.0.1";

app.listen(port, host, () => {
  console.log(`[api] http://${host}:${port}`);
});
