// 接口冒烟测试：覆盖写作、点赞、评论、提问、回答、采纳、购物车、下单、取消
const BASE = "http://127.0.0.1:8787/api";

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data.message || ""}`);
  return data;
}

const results = [];
const check = (label, ok) => {
  results.push(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) process.exitCode = 1;
};

const { token } = await call("POST", "/auth/login", {
  body: { account: "linyi@campus.cn", password: "123456" },
});
check("登录", Boolean(token));

const created = await call("POST", "/posts", {
  token,
  body: {
    title: "接口测试：写一篇临时文章",
    content: "这是一次接口冒烟测试写的正文，长度需要超过二十个字，用来验证创建文章能够成功。",
    category: "校园观察",
    tags: ["测试", "临时"],
    cover: "/static/covers/campus.jpg",
  },
});
check("创建文章", created.post?.id > 0);

const updated = await call("PUT", `/posts/${created.post.id}`, {
  token,
  body: { title: "接口测试：修改后的标题", tags: ["测试"] },
});
check("编辑文章", updated.post.title === "接口测试：修改后的标题");

const liked = await call("POST", `/posts/${created.post.id}/like`, { token });
const unliked = await call("POST", `/posts/${created.post.id}/like`, { token });
check("点赞 / 取消点赞", liked.liked === true && unliked.liked === false);

const comment = await call("POST", `/posts/${created.post.id}/comments`, {
  token,
  body: { content: "接口测试评论" },
});
check("发表评论", Boolean(comment.id));
await call("DELETE", `/comments/${comment.id}`, { token });
check("删除评论", true);

const question = await call("POST", "/questions", {
  token,
  body: {
    title: "接口测试：这是一个临时问题吗？",
    content: "用来验证提问接口是否能正常扣积分并写入数据库。",
    tags: ["测试"],
  },
});
check("发布问题", question.question?.id > 0);

const answer = await call("POST", `/questions/${question.question.id}/answers`, {
  token,
  body: { content: "这是一条接口测试回答，长度超过十个字。" },
});
check("回答問題", answer.answer?.id > 0);

const accepted = await call("POST", `/questions/answers/${answer.answer.id}/accept`, { token });
check("采纳答案", accepted.ok === true);

const questionVote = await call("POST", `/questions/${question.question.id}/vote`, { token });
check("问题点赞", questionVote.liked === true);

const cart = await call("POST", "/cart", { token, body: { productId: 1, quantity: 2 } });
check("加入购物车", cart.count >= 2);

const cartItem = cart.items.find((item) => item.product.id === 1);
const updatedCart = await call("PUT", `/cart/${cartItem.id}`, { token, body: { quantity: 1 } });
check("修改购物车数量", updatedCart.items.some((item) => item.id === cartItem.id && item.quantity === 1));

const order = await call("POST", "/orders", {
  token,
  body: { addressId: 1, cartItemIds: updatedCart.items.map((item) => item.id) },
});
check("创建订单", order.order_no?.startsWith("BG") && order.status === "待支付");

const cancelled = await call("PUT", `/orders/${order.id}/cancel`, { token });
check("取消订单", cancelled.status === "已取消");

await call("DELETE", `/posts/${created.post.id}`, { token });
check("删除文章", true);

console.log(results.join("\n"));
console.log(process.exitCode ? "存在失败项" : "全部通过");
