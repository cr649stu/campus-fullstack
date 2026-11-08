# 毕业之前 · BEFORE GRADUATION

课程《Vibe Coding 全栈应用开发》示例项目练习。把文档里的三个项目——个人博客系统、问答社区、Mini 在线商城——合并成一个校园毕业主题站点「毕业之前」，共用一套账号、导航和黑白视觉。

> 课程练习作品，不涉及真实交易；支付、物流、订单状态均为模拟数据。

## 一、项目概览

| 模块 | 对应文档项目 | 已实现功能 |
| --- | --- | --- |
| **记录** `/blog` | 个人博客系统 | 文章 CRUD、分类与标签筛选、关键词搜索、分页、Markdown 渲染、评论、点赞、封面选择、实时预览编辑器 |
| **互助** `/qa` | 问答社区 | 提问、回答、点赞、采纳答案、积分（提问 −5 / 回答 +10 / 采纳 +30 / 被赞 +5、+10）、最新 / 热门 / 未解决排序、标签筛选 |
| **纪念** `/shop` | Mini 在线商城 | 商品列表与详情、分类搜索、购物袋（增删改数量）、收货地址、下单事务扣库存、订单列表与详情、取消订单并恢复库存 |

此外还有：首页、个人主页数据看板、登录 / 注册、404、Toast 提示、空状态与加载状态。

## 二、技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 19 + TypeScript + Vite + React Router 7 + Axios + react-markdown |
| 后端 | Node.js + Express 4 + JWT（jsonwebtoken）+ bcryptjs |
| 数据库 | SQLite（Node 内置 `node:sqlite`，零额外依赖） |
| 样式 | 手写 CSS（无 UI 框架），黑白编辑部风格 |

文档推荐 MySQL。为了做到「克隆下来就能跑」，这里用 Node 24 内置的 SQLite；`server/src/db.js` 中的建表语句与查询基本可以直接迁移到 MySQL（把 `AUTOINCREMENT`、`datetime('now','localtime')` 换成 MySQL 写法即可）。

## 三、快速开始

环境要求：Node.js ≥ 22.5（推荐 24），pnpm 10 或 11。

```bash
pnpm install
pnpm dev          # 前端 5173，接口 8787
```

打开 http://127.0.0.1:5173 。

生产方式（Express 同时托管打包后的前端）：

```bash
pnpm build
pnpm start        # http://127.0.0.1:8787
```

部署到公网（VPS + Docker / Render / Railway）见 [docs/DEPLOY.md](docs/DEPLOY.md)；配套的作品集展示页在 `../personal-site/`。

重置为示例数据（会清空已有文章、订单等）：

```bash
pnpm seed
```

**演示账号**

| 账号 | 密码 |
| --- | --- |
| `linyi@campus.cn`（林一） | `123456` |
| `chenmo@campus.cn`（陈默） | `123456` |
| `zhouxiaoman@campus.cn`（周小满） | `123456` |
| `suwan@campus.cn`（苏晚） | `123456` |

首次启动会自动写入 4 位作者、9 篇文章、7 个问题、8 件纪念品和 2 笔订单。

> 如果 pnpm 提示 `ERR_PNPM_IGNORED_BUILDS: esbuild`，仓库里的 `pnpm-workspace.yaml` 已声明 `allowBuilds: esbuild: false`；esbuild 的平台二进制由可选依赖提供，不影响 Vite 使用。若你的环境仍报错，执行 `pnpm approve-builds` 并允许 esbuild 即可。

## 四、目录结构

```
campus-fullstack/
├─ server/                  # Express API
│  ├─ public/covers/        # 文章封面（黑白摄影）
│  ├─ public/products/      # 商品图
│  └─ src/
│     ├─ index.js           # 入口、静态托管、错误处理
│     ├─ db.js              # 建表与数据库工具
│     ├─ seed.js            # 示例数据写入
│     ├─ seed-data.js       # 全部文案与商品数据
│     ├─ lib/auth.js        # JWT、鉴权中间件
│     └─ routes/            # auth / posts / questions / shop / comments / stats
├─ web/                     # React SPA
│  └─ src/
│     ├─ pages/             # 17 个页面组件
│     ├─ components/        # Layout、通用 UI、Markdown
│     ├─ api.ts             # 接口封装
│     ├─ auth.tsx           # 登录态
│     ├─ cart.tsx           # 购物袋状态
│     └─ styles.css         # 全部样式
├─ screenshots/             # 运行截图（17 张）
├─ scripts/                 # 接口冒烟测试、截图脚本、备用构建脚本
└─ README.md
```

## 五、接口一览

所有接口以 `/api` 开头，除标注外均返回 JSON；需要登录的接口使用 `Authorization: Bearer <token>`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/auth/register` | 注册（用户名 2–20 字、邮箱、密码 ≥ 6 位） |
| POST | `/auth/login` | 登录，返回 7 天有效期的 JWT |
| GET | `/auth/me` | 当前用户 |
| GET | `/posts` | 文章列表，支持 `page/pageSize/category/tag/keyword/sort` |
| GET | `/posts/:id` | 文章详情（浏览数 +1） |
| POST / PUT / DELETE | `/posts`、`/posts/:id` | 发布、编辑、删除（仅作者） |
| POST | `/posts/:id/like` | 点赞 / 取消点赞 |
| GET / POST | `/posts/:id/comments` | 评论列表、发表评论 |
| DELETE | `/comments/:id` | 删除自己的评论（文章作者可管理） |
| GET | `/posts/meta/categories`、`/posts/meta/tags` | 分类 / 标签及数量 |
| GET | `/questions` | 问题列表，支持 `sort=latest|hot|unsolved`、`tag`、分页 |
| GET | `/questions/:id` | 问题详情与回答列表 |
| POST | `/questions` | 提问（扣 5 积分） |
| POST | `/questions/:id/answers` | 回答（+10 积分） |
| POST | `/questions/answers/:id/accept` | 采纳（仅提问者，+30 积分） |
| POST | `/questions/:id/vote`、`/questions/answers/:id/vote` | 问题 / 回答点赞 |
| GET | `/products`、`/products/:id` | 商品列表、详情 |
| GET / POST / PUT / DELETE | `/cart`、`/cart/:id` | 购物袋 |
| GET / POST / PUT / DELETE | `/addresses`、`/addresses/:id` | 收货地址 |
| GET / POST | `/orders` | 订单列表、创建订单（事务扣库存） |
| GET / PUT | `/orders/:id`、`/orders/:id/cancel` | 订单详情、取消待支付订单（恢复库存） |
| GET | `/stats/site`、`/stats/me` | 站点统计、个人统计 |

## 六、数据库设计

| 表 | 关键字段 |
| --- | --- |
| `users` | id、username（唯一）、email（唯一）、password（bcrypt）、bio、points |
| `posts` | id、title、excerpt、content（Markdown）、cover、category、tags（JSON）、author_id、views、likes |
| `comments` | id、post_id、user_id、content |
| `likes` | user_id + target_type（post / question / answer）+ target_id，唯一约束防重复点赞 |
| `questions` | id、title、content、tags、author_id、views、votes、answers_count、is_solved |
| `answers` | id、question_id、content、author_id、votes、is_accepted |
| `products` | id、name、subtitle、description、price、stock、image、category |
| `cart_items` | user_id + product_id 唯一，quantity |
| `addresses` | 收货人、电话、省市区、详细地址、is_default |
| `orders` | order_no、user_id、address_snapshot（下单时快照）、total_price、status |
| `order_items` | 商品名与价格快照，避免商品改价影响历史订单 |

订单创建、取消、采纳答案、点赞等跨表操作都放在事务里（`BEGIN IMMEDIATE … COMMIT`），保证扣库存与写记录要么都成功、要么都失败。

## 七、与文档的对应关系 & 自主设计

文档建议「三个项目任选其一或依次练习」。这份作业把三者合并成一个站点，共用一个账号体系，重点体现：

1. **主题自主设计**：不叫「个人博客」，而是「毕业之前」——记录、互助、纪念三个栏目对应毕业前的三种状态。9 篇文章、7 个问题、8 件纪念品全部围绕校园生活重写，没有直接照搬文档示例内容。
2. **视觉自主设计**：极简黑白编辑部风格，细线分隔、超大标题、衬线数字、全站灰度摄影；没有使用 UI 组件库。
3. **功能增项**：评论 + 点赞、分类 / 标签筛选 + 搜索结果，落在三个模块的交互里。
4. **工程细节**：事务扣库存、订单商品快照、积分规则、统一错误处理、JWT 7 天有效期、分页与空状态。

## 八、运行截图

`screenshots/` 目录下共 17 张 1440px 宽的整页截图。另外，`毕业之前-运行截图.docx` 已把这 17 个页面排版成 A4 提交文档（含封面、项目说明、截图目录、23 页截图，以及 AI 智能体协作记录、Git 版本管理两个附录，共 30 页）：

| 文件 | 页面 |
| --- | --- |
| `01-home.png` | 首页首屏（Hero） |
| `02-home-full.png` | 首页整页 |
| `03-blog.png` | 记录列表（分类 / 标签 / 搜索 / 分页） |
| `04-post.png` | 文章详情（Markdown、点赞、评论、相关阅读） |
| `05-write.png` | 文章编辑器（Markdown + 实时预览） |
| `06-qa.png` | 互助列表（排序、标签、投票） |
| `07-qa-detail.png` | 问题详情（回答、采纳、点赞） |
| `08-ask.png` | 提问页 |
| `09-shop.png` | 纪念商城 |
| `10-product.png` | 商品详情 |
| `11-cart.png` | 购物袋 |
| `12-checkout.png` | 确认订单（地址、清单、金额） |
| `13-orders.png` | 订单列表 |
| `14-order-detail.png` | 订单详情（状态步骤） |
| `15-profile.png` | 个人主页数据看板 |
| `16-login.png` | 登录 |
| `17-register.png` | 注册 |

## 九、开发备注

- 接口冒烟测试：`node scripts/test-api.mjs`（需先启动 API），覆盖发文、点赞、评论、提问、回答、采纳、购物袋、下单、取消、删除。
- 截图脚本：`node scripts/shoot.mjs`，需要以 `--remote-debugging-port=9223` 启动 Edge / Chrome；脚本会自动登录并截取全部页面。
- 备用构建脚本：`scripts/build-static.cmd`（直接用 esbuild 打包，供无法运行 Vite 的环境使用）。
- 文章中所有人物、地点、订单均为虚构，仅用于课程练习。
