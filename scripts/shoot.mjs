// 通过 Chrome DevTools Protocol 截取「毕业之前」各页面（含登录态）
// 用法：先以 --remote-debugging-port=9223 启动 Edge，再运行本脚本
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SITE_URL || "http://127.0.0.1:8787";
const PORT = process.env.CDP_PORT || "9223";
const OUT = process.argv[2] || "screenshots";
const WIDTH = 1440;

const PAGES = [
  { name: "01-home", url: "/", viewport: 1000 },
  { name: "02-home-full", url: "/" },
  { name: "03-blog", url: "/blog" },
  { name: "04-post", url: "/blog/1" },
  { name: "05-write", url: "/write?id=1" },
  { name: "06-qa", url: "/qa" },
  { name: "07-qa-detail", url: "/qa/1" },
  { name: "08-ask", url: "/ask" },
  { name: "09-shop", url: "/shop" },
  { name: "10-product", url: "/shop/2" },
  { name: "11-cart", url: "/cart" },
  { name: "12-checkout", url: "/checkout" },
  { name: "13-orders", url: "/orders" },
  { name: "14-order-detail", url: "/orders/2" },
  { name: "15-profile", url: "/profile" },
  { name: "16-login", url: "/login", viewport: 1000 },
  { name: "17-register", url: "/register", viewport: 1000 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDevtools() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return res.json();
    } catch {
      // 尚未启动
    }
    await sleep(250);
  }
  throw new Error("DevTools 端口未就绪");
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve);
      this.ws.addEventListener("error", reject);
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
        else resolve(message.result);
        return;
      }
      this.events.push(message);
    });
  }

  async send(method, params = {}, sessionId) {
    await this.ready;
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  async waitEvent(method, sessionId, timeout = 20000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const index = this.events.findIndex(
        (event) => event.method === method && (!sessionId || event.sessionId === sessionId),
      );
      if (index >= 0) {
        const [event] = this.events.splice(index, 1);
        return event.params;
      }
      await sleep(50);
    }
    throw new Error(`等待事件超时：${method}`);
  }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: "linyi@campus.cn", password: "123456" }),
  });
  if (!loginRes.ok) throw new Error(`登录失败：${loginRes.status}`);
  const { token } = await loginRes.json();

  const version = await waitForDevtools();
  const cdp = new Cdp(version.webSocketDebuggerUrl);
  await cdp.ready;

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  }, sessionId);

  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `localStorage.setItem("bg_token", ${JSON.stringify(token)});`,
  }, sessionId);

  const errors = [];

  for (const page of PAGES) {
    cdp.events.length = 0;
    const url = `${BASE}${page.url}`;
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: WIDTH,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId);
    await cdp.send("Page.navigate", { url }, sessionId);
    await cdp.waitEvent("Page.loadEventFired", sessionId, 30000);
    await sleep(page.name.includes("post") || page.name.includes("qa-detail") ? 1400 : 1100);

    // 等待字体与图片
    await cdp.send(
      "Runtime.evaluate",
      {
        expression: `Promise.all([
          document.fonts ? document.fonts.ready : Promise.resolve(),
          ...[...document.images].map((img) => (img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; }))),
        ]).then(() => true)`,
        awaitPromise: true,
      },
      sessionId,
    );
    await sleep(300);

    let height = page.viewport || 0;
    if (!height) {
      const { result } = await cdp.send(
        "Runtime.evaluate",
        {
          expression:
            "Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight)",
          returnByValue: true,
        },
        sessionId,
      );
      height = Math.min(Number(result.value) || 1000, 16000);
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: WIDTH,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      }, sessionId);
      await sleep(350);
    }

    const { data } = await cdp.send(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: true, fromSurface: true },
      sessionId,
    );
    const file = path.join(OUT, `${page.name}.png`);
    await fs.writeFile(file, Buffer.from(data, "base64"));
    console.log(`✓ ${page.name}.png  ${WIDTH}x${height}`);

    const pageErrors = cdp.events.filter(
      (event) =>
        event.method === "Runtime.exceptionThrown" ||
        (event.method === "Runtime.consoleAPICalled" && event.params.type === "error"),
    );
    for (const error of pageErrors) {
      const text =
        error.params.exceptionDetails?.exception?.description ||
        error.params.exceptionDetails?.text ||
        error.params.args?.map((arg) => arg.value ?? arg.description).join(" ");
      if (text) errors.push(`${page.name}: ${text.split("\n")[0]}`);
    }
  }

  if (errors.length) {
    console.log("\n页面报错：");
    for (const line of errors) console.log(" -", line);
  } else {
    console.log("\n没有捕获到页面报错。");
  }

  await cdp.send("Target.closeTarget", { targetId });
  cdp.ws.close();
  await sleep(200);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
