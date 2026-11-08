import { Router } from "express";
import { all, get, run, transaction } from "../db.js";
import { httpError, requireAuth } from "../lib/auth.js";

const router = Router();

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle,
    description: row.description,
    price: row.price,
    stock: row.stock,
    image: row.image,
    category: row.category,
  };
}

function orderNo() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `BG${stamp}${Math.floor(Math.random() * 900 + 100)}`;
}

function cartPayload(userId) {
  const rows = all(
    `SELECT ci.id AS cart_id, ci.quantity AS cart_quantity, p.*
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = ? ORDER BY ci.id DESC`,
    userId,
  );
  const items = rows.map((row) => ({
    id: row.cart_id,
    quantity: row.cart_quantity,
    subtotal: Number((row.price * row.cart_quantity).toFixed(2)),
    product: mapProduct(row),
  }));
  const total = Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  return { items, total, count: items.reduce((sum, item) => sum + item.quantity, 0) };
}

// ---------- 商品 ----------
router.get("/products", (req, res) => {
  const category = String(req.query.category || "").trim();
  const keyword = String(req.query.keyword || "").trim();
  const where = [];
  const params = [];
  if (category) {
    where.push("category = ?");
    params.push(category);
  }
  if (keyword) {
    where.push("(name LIKE ? OR subtitle LIKE ? OR description LIKE ?)");
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }
  const rows = all(
    `SELECT * FROM products ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id ASC`,
    ...params,
  );
  res.json(rows.map(mapProduct));
});

router.get("/products/meta/categories", (_req, res) => {
  res.json(
    all(
      `SELECT category AS name, COUNT(*) AS count FROM products
        GROUP BY category ORDER BY count DESC, category ASC`,
    ),
  );
});

router.get("/products/:id", (req, res) => {
  const row = get("SELECT * FROM products WHERE id = ?", Number(req.params.id));
  if (!row) throw httpError(404, "商品不存在");
  res.json(mapProduct(row));
});

// ---------- 购物车 ----------
router.get("/cart", requireAuth, (req, res) => {
  res.json(cartPayload(req.user.id));
});

router.post("/cart", requireAuth, (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Math.max(1, Number(req.body.quantity) || 1);
  const product = get("SELECT * FROM products WHERE id = ?", productId);
  if (!product) throw httpError(404, "商品不存在");

  const existing = get(
    "SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?",
    req.user.id,
    productId,
  );
  const nextQuantity = (existing?.quantity || 0) + quantity;
  if (nextQuantity > product.stock) throw httpError(400, "库存不足");

  if (existing) {
    run("UPDATE cart_items SET quantity = ? WHERE id = ?", nextQuantity, existing.id);
  } else {
    run(
      "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
      req.user.id,
      productId,
      quantity,
    );
  }
  res.status(201).json(cartPayload(req.user.id));
});

router.put("/cart/:id", requireAuth, (req, res) => {
  const quantity = Math.max(1, Number(req.body.quantity) || 1);
  const item = get(
    `SELECT ci.id AS cart_id, ci.user_id, ci.quantity, p.stock FROM cart_items ci JOIN products p ON p.id = ci.product_id
      WHERE ci.id = ? AND ci.user_id = ?`,
    Number(req.params.id),
    req.user.id,
  );
  if (!item) throw httpError(404, "购物车中没有这件商品");
  if (quantity > item.stock) throw httpError(400, "库存不足");
  run("UPDATE cart_items SET quantity = ? WHERE id = ?", quantity, item.cart_id);
  res.json(cartPayload(req.user.id));
});

router.delete("/cart/:id", requireAuth, (req, res) => {
  const item = get(
    "SELECT * FROM cart_items WHERE id = ? AND user_id = ?",
    Number(req.params.id),
    req.user.id,
  );
  if (!item) throw httpError(404, "购物车中没有这件商品");
  run("DELETE FROM cart_items WHERE id = ?", item.id);
  res.json(cartPayload(req.user.id));
});

// ---------- 地址 ----------
function mapAddress(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    province: row.province,
    city: row.city,
    district: row.district,
    detail: row.detail,
    is_default: Boolean(row.is_default),
  };
}

router.get("/addresses", requireAuth, (req, res) => {
  res.json(
    all(
      "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC",
      req.user.id,
    ).map(mapAddress),
  );
});

router.post("/addresses", requireAuth, (req, res) => {
  const { name, phone, province, city, district, detail } = req.body;
  if (!name || !phone || !province || !city || !district || !detail) {
    throw httpError(400, "请完整填写收货信息");
  }
  const isDefault = req.body.is_default ? 1 : 0;
  const id = transaction(() => {
    if (isDefault) {
      run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", req.user.id);
    }
    const result = run(
      `INSERT INTO addresses (user_id, name, phone, province, city, district, detail, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      req.user.id,
      name,
      phone,
      province,
      city,
      district,
      detail,
      isDefault,
    );
    return Number(result.lastInsertRowid);
  });
  res.status(201).json(mapAddress(get("SELECT * FROM addresses WHERE id = ?", id)));
});

router.put("/addresses/:id", requireAuth, (req, res) => {
  const address = get(
    "SELECT * FROM addresses WHERE id = ? AND user_id = ?",
    Number(req.params.id),
    req.user.id,
  );
  if (!address) throw httpError(404, "地址不存在");
  const { name, phone, province, city, district, detail } = req.body;
  const isDefault = req.body.is_default ? 1 : 0;
  transaction(() => {
    if (isDefault) {
      run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", req.user.id);
    }
    run(
      `UPDATE addresses SET name = ?, phone = ?, province = ?, city = ?, district = ?, detail = ?, is_default = ?
        WHERE id = ?`,
      name ?? address.name,
      phone ?? address.phone,
      province ?? address.province,
      city ?? address.city,
      district ?? address.district,
      detail ?? address.detail,
      isDefault,
      address.id,
    );
  });
  res.json(mapAddress(get("SELECT * FROM addresses WHERE id = ?", address.id)));
});

router.delete("/addresses/:id", requireAuth, (req, res) => {
  const address = get(
    "SELECT * FROM addresses WHERE id = ? AND user_id = ?",
    Number(req.params.id),
    req.user.id,
  );
  if (!address) throw httpError(404, "地址不存在");
  run("DELETE FROM addresses WHERE id = ?", address.id);
  res.json({ ok: true });
});

// ---------- 订单 ----------
function orderPayload(order) {
  const items = all("SELECT * FROM order_items WHERE order_id = ?", order.id);
  return {
    id: order.id,
    order_no: order.order_no,
    status: order.status,
    total_price: order.total_price,
    address: JSON.parse(order.address_snapshot),
    created_at: order.created_at,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      product_id: item.product_id,
    })),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

router.get("/orders", requireAuth, (req, res) => {
  const rows = all(
    "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC",
    req.user.id,
  );
  res.json(rows.map(orderPayload));
});

router.post("/orders", requireAuth, (req, res) => {
  const address = get(
    "SELECT * FROM addresses WHERE id = ? AND user_id = ?",
    Number(req.body.addressId),
    req.user.id,
  );
  if (!address) throw httpError(400, "请选择收货地址");

  const cart = cartPayload(req.user.id);
  const selectedIds = Array.isArray(req.body.cartItemIds)
    ? new Set(req.body.cartItemIds.map(Number))
    : null;
  const items = selectedIds ? cart.items.filter((item) => selectedIds.has(item.id)) : cart.items;
  if (items.length === 0) throw httpError(400, "购物车是空的");

  for (const item of items) {
    if (item.quantity > item.product.stock) {
      throw httpError(400, `「${item.product.name}」库存不足`);
    }
  }

  const snapshot = JSON.stringify({
    name: address.name,
    phone: address.phone,
    region: `${address.province} ${address.city} ${address.district}`,
    detail: address.detail,
  });
  const total = Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));

  const id = transaction(() => {
    const result = run(
      `INSERT INTO orders (order_no, user_id, address_id, address_snapshot, total_price, status)
       VALUES (?, ?, ?, ?, ?, '待支付')`,
      orderNo(),
      req.user.id,
      address.id,
      snapshot,
      total,
    );
    const orderId = Number(result.lastInsertRowid);
    for (const item of items) {
      run(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        orderId,
        item.product.id,
        item.product.name,
        item.product.price,
        item.quantity,
      );
      run(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        item.quantity,
        item.product.id,
      );
      run("DELETE FROM cart_items WHERE id = ?", item.id);
    }
    return orderId;
  });

  const order = get("SELECT * FROM orders WHERE id = ?", id);
  res.status(201).json(orderPayload(order));
});

router.get("/orders/:id", requireAuth, (req, res) => {
  const order = get(
    "SELECT * FROM orders WHERE id = ? AND user_id = ?",
    Number(req.params.id),
    req.user.id,
  );
  if (!order) throw httpError(404, "订单不存在");
  res.json(orderPayload(order));
});

router.put("/orders/:id/cancel", requireAuth, (req, res) => {
  const order = get(
    "SELECT * FROM orders WHERE id = ? AND user_id = ?",
    Number(req.params.id),
    req.user.id,
  );
  if (!order) throw httpError(404, "订单不存在");
  if (order.status !== "待支付") throw httpError(400, "只能取消待支付的订单");

  transaction(() => {
    const items = all("SELECT * FROM order_items WHERE order_id = ?", order.id);
    for (const item of items) {
      run("UPDATE products SET stock = stock + ? WHERE id = ?", item.quantity, item.product_id);
    }
    run("UPDATE orders SET status = '已取消' WHERE id = ?", order.id);
  });
  res.json(orderPayload(get("SELECT * FROM orders WHERE id = ?", order.id)));
});

export default router;
