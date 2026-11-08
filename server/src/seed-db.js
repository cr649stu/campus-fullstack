import { seedIfEmpty, resetDatabase } from "./seed.js";
import { get } from "./db.js";

if (process.argv.includes("--reset")) {
  resetDatabase();
}

const seeded = seedIfEmpty();
const counts = {
  users: get("SELECT COUNT(*) AS n FROM users").n,
  posts: get("SELECT COUNT(*) AS n FROM posts").n,
  questions: get("SELECT COUNT(*) AS n FROM questions").n,
  products: get("SELECT COUNT(*) AS n FROM products").n,
};
console.log(seeded ? "示例数据已写入：" : "数据库已有数据，跳过写入：", counts);
