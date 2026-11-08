import bcrypt from "bcryptjs";
import { db, get, run, transaction } from "./db.js";
import {
  users,
  posts,
  comments,
  questions,
  products,
  addresses,
} from "./seed-data.js";

const DEMO_PASSWORD = "123456";

function insertUsers() {
  const password = bcrypt.hashSync(DEMO_PASSWORD, 10);
  for (const user of users) {
    run(
      `INSERT INTO users (username, email, password, bio, points, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      user.username,
      user.email,
      password,
      user.bio,
      user.points,
      "2026-09-01 09:00:00",
    );
  }
}

function userId(username) {
  return get("SELECT id FROM users WHERE username = ?", username).id;
}

function insertPosts() {
  for (const post of posts) {
    run(
      `INSERT INTO posts
         (title, excerpt, content, cover, category, tags, author_id, views, likes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      post.title,
      post.excerpt,
      post.content,
      post.cover,
      post.category,
      JSON.stringify(post.tags),
      userId(post.author),
      post.views,
      post.likes,
      post.created_at,
      post.created_at,
    );
  }
}

function insertComments() {
  for (const [postTitle, username, content, createdAt] of comments) {
    const post = get("SELECT id FROM posts WHERE title = ?", postTitle);
    run(
      "INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)",
      post.id,
      userId(username),
      content,
      createdAt,
    );
  }
}

function insertQuestions() {
  for (const question of questions) {
    run(
      `INSERT INTO questions
         (title, content, tags, author_id, views, votes, answers_count, is_solved, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      question.title,
      question.content,
      JSON.stringify(question.tags),
      userId(question.author),
      question.views,
      question.votes,
      question.answers.length,
      question.is_solved,
      question.created_at,
      question.created_at,
    );
    const questionId = get("SELECT id FROM questions WHERE title = ?", question.title).id;
    for (const answer of question.answers) {
      run(
        `INSERT INTO answers (question_id, content, author_id, votes, is_accepted, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        questionId,
        answer.content,
        userId(answer.author),
        answer.votes,
        answer.is_accepted,
        answer.created_at,
      );
    }
  }
}

function insertProducts() {
  for (const product of products) {
    run(
      `INSERT INTO products (name, subtitle, description, price, stock, image, category, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      product.name,
      product.subtitle,
      product.description,
      product.price,
      product.stock,
      product.image,
      product.category,
      "2026-09-01 09:00:00",
    );
  }
}

function insertAddresses() {
  for (const address of addresses) {
    run(
      `INSERT INTO addresses (user_id, name, phone, province, city, district, detail, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      userId("林一"),
      address.name,
      address.phone,
      address.province,
      address.city,
      address.district,
      address.detail,
      address.is_default,
    );
  }
}

function productId(name) {
  return get("SELECT id, price FROM products WHERE name = ?", name);
}

function insertOrders() {
  const owner = userId("林一");
  const defaultAddress = get(
    "SELECT * FROM addresses WHERE user_id = ? AND is_default = 1",
    owner,
  );
  const snapshot = JSON.stringify({
    name: defaultAddress.name,
    phone: defaultAddress.phone,
    region: `${defaultAddress.province} ${defaultAddress.city} ${defaultAddress.district}`,
    detail: defaultAddress.detail,
  });

  const orders = [
    {
      order_no: "BG2026102600138",
      items: [
        ["一次性胶片相机 · 27 张", 1],
        ["「抛帽时刻」明信片 12 张", 2],
      ],
      status: "待支付",
      created_at: "2026-10-26 20:14:00",
    },
    {
      order_no: "BG2026101800064",
      items: [
        ["「毕业之前」纪念 T 恤", 1],
        ["活页纪念册 · A5", 1],
      ],
      status: "已发货",
      created_at: "2026-10-18 11:32:00",
    },
  ];

  for (const order of orders) {
    const rows = order.items.map(([name, quantity]) => {
      const product = productId(name);
      return { name, quantity, price: product.price, productId: product.id };
    });
    const total = rows.reduce((sum, row) => sum + row.price * row.quantity, 0);
    run(
      `INSERT INTO orders (order_no, user_id, address_id, address_snapshot, total_price, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      order.order_no,
      owner,
      defaultAddress.id,
      snapshot,
      total,
      order.status,
      order.created_at,
    );
    const orderId = get("SELECT id FROM orders WHERE order_no = ?", order.order_no).id;
    for (const row of rows) {
      run(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        orderId,
        row.productId,
        row.name,
        row.price,
        row.quantity,
      );
    }
  }
}

function insertCart() {
  const owner = userId("林一");
  for (const [name, quantity] of [
    ["「旧图书馆」影像集", 1],
    ["黄铜钢笔 · 致谢款", 1],
  ]) {
    const product = productId(name);
    run(
      "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
      owner,
      product.id,
      quantity,
    );
  }
}

function insertLikes() {
  const owner = userId("林一");
  for (const title of ["把四年拍成 36 张胶片", "考研失败之后，我在操场走了十圈"]) {
    const post = get("SELECT id FROM posts WHERE title = ?", title);
    run(
      "INSERT INTO likes (user_id, target_type, target_id, created_at) VALUES (?, 'post', ?, ?)",
      owner,
      post.id,
      "2026-10-27 09:00:00",
    );
  }
}

export function seedIfEmpty() {
  const count = get("SELECT COUNT(*) AS count FROM users").count;
  if (count > 0) return false;

  transaction(() => {
    insertUsers();
    insertPosts();
    insertComments();
    insertQuestions();
    insertProducts();
    insertAddresses();
    insertOrders();
    insertCart();
    insertLikes();
  });
  return true;
}

export function resetDatabase() {
  transaction(() => {
    for (const table of [
      "order_items",
      "orders",
      "cart_items",
      "addresses",
      "likes",
      "comments",
      "answers",
      "questions",
      "posts",
      "products",
      "users",
    ]) {
      db.exec(`DELETE FROM ${table};`);
    }
    db.exec(
      "DELETE FROM sqlite_sequence WHERE name IN ('order_items','orders','cart_items','addresses','likes','comments','answers','questions','posts','products','users');",
    );
  });
}
